import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import AttendanceLog from './models/AttendanceLog.js';
import SupportTicket from './models/SupportTicket.js';
import StudentDevice from './models/StudentDevice.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/geoattend";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// === SESSION STATE ===
let activeSession = {
  isActive: false,
  className: null,
  otp: null,
  venueLat: null,
  venueLon: null,
  radius: 100, // <--- UPDATED: Default to 100m to fix "Too Far" errors
  lockDuration: 60,
  students: []
};

// === HELPER: Haversine Formula ===
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // === LECTURER: START SESSION ===
  socket.on('start_session', (data) => {
    activeSession = {
      isActive: true,
      className: data.className,
      otp: data.otp,
      venueLat: data.lat,
      venueLon: data.lon,
      radius: data.radius || 100, // Default 100m
      lockDuration: data.lockDuration || 60,
      students: []
    };
    
    console.log(`\n📢 CLASS STARTED: ${data.className} (Radius: ${activeSession.radius}m)`);
    io.emit('update_stats', { count: 0 });
  });

  // === LECTURER: RESTORE SESSION ===
  socket.on('request_current_state', () => {
    if (activeSession.isActive) {
      socket.emit('session_restored', {
        isActive: true,
        className: activeSession.className,
        otp: activeSession.otp,
        count: activeSession.students.length,
        radius: activeSession.radius,
        lockDuration: activeSession.lockDuration
      });
    }
  });

  // === LECTURER: UPDATE OTP ===
  socket.on('update_otp', (newOtp) => {
    if (activeSession.isActive) {
      activeSession.otp = newOtp;
      console.log(`🔄 OTP Rotated: ${newOtp}`);
    }
  });

  // === STUDENT: MARK ATTENDANCE ===
  socket.on('mark_attendance', async (data) => {
    const { studentOtp, fullName, studentId, lat, lon, deviceId, timestamp, isOffline } = data;
    const actualCheckInTime = isOffline && timestamp ? new Date(timestamp) : new Date();

    // 1. VALIDATION
    if (!activeSession.isActive) {
       socket.emit('attendance_result', { status: 'error', message: 'No active class session.', studentId });
       return;
    }

    if (String(studentOtp) !== String(activeSession.otp)) {
      socket.emit('attendance_result', { status: 'error', message: 'Incorrect or Expired OTP Code.', studentId });
      return;
    }

    // 2. DUPLICATE CHECK (Session Level)
    if (activeSession.students.includes(studentId)) {
      socket.emit('attendance_result', { status: 'error', message: 'You have already signed in for this class!', studentId });
      return;
    }

    // 3. DEVICE BINDING CHECK (Strict Security)
    try {
      // Check if ID is bound to another device
      const idBinding = await StudentDevice.findOne({ studentId });
      if (idBinding && idBinding.deviceId !== deviceId) {
        socket.emit('attendance_result', { status: 'error', message: 'Security Alert: This Student ID is linked to another browser/device.', studentId });
        return;
      }

      // Check if Device is bound to another ID
      const deviceBinding = await StudentDevice.findOne({ deviceId });
      if (deviceBinding && deviceBinding.studentId !== studentId) {
        socket.emit('attendance_result', { status: 'error', message: 'Security Alert: This browser is linked to another Student ID.', studentId });
        return;
      }

      // If new, bind them
      if (!idBinding && !deviceBinding) {
        await new StudentDevice({ studentId, deviceId }).save();
        console.log(`🔒 Bound ID ${studentId} to Device ${deviceId}`);
      }
    } catch (err) {
      console.error("Binding Error:", err);
    }

    // 4. GPS CHECK
    const distance = getDistanceFromLatLonInM(activeSession.venueLat, activeSession.venueLon, lat, lon);
    console.log(`🏃 Student ${fullName} is ${Math.round(distance)}m away.`);

    if (distance <= activeSession.radius) {
      // SUCCESS
      activeSession.students.push(studentId);

      try {
        const newLog = new AttendanceLog({
          studentName: fullName,
          studentId,
          className: activeSession.className,
          checkInTime: actualCheckInTime,
          location: { lat, lon }
        });
        await newLog.save();

        // Notify Lecturer
        io.emit('update_stats', { 
          count: activeSession.students.length,
          newStudent: { 
            studentName: fullName, 
            studentId: studentId, 
            checkInTime: actualCheckInTime,
            status: isOffline ? 'Synced (Offline)' : 'Present'
          }
        });

      } catch (err) {
        console.error("DB Save Error:", err);
      }

      // Send Success to Student
      socket.emit('attendance_result', { 
        status: 'success', 
        message: isOffline ? 'Offline Data Synced!' : 'Marked Present!',
        lockDuration: activeSession.lockDuration,
        studentId // Tag message
      });
      
    } else {
      // FAIL
      socket.emit('attendance_result', { 
        status: 'error', 
        message: `Too far! (${Math.round(distance)}m away). Move closer to the lecturer.`,
        studentId
      });
    }
  });
});

// === API ROUTES ===
app.get('/api/history', async (req, res) => {
  try {
    const logs = await AttendanceLog.find().sort({ checkInTime: -1 });
    res.json(logs);
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.delete('/api/history/all', async (req, res) => {
  try {
    await AttendanceLog.deleteMany({});
    res.json({ status: 'success' });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    await AttendanceLog.findByIdAndDelete(req.params.id);
    res.json({ status: 'success' });
  } catch (err) { res.status(500).json({ message: "Error" }); }
});

app.post('/submit-issue', async (req, res) => {
  try {
    await new SupportTicket(req.body).save();
    res.json({ status: 'success' });
  } catch (err) { res.status(500).json({ status: 'error' }); }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});