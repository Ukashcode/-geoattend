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
  radius: 100,
  lockDuration: 120,
  students: []
};

let sessionTimer = null;

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
    if (sessionTimer) clearTimeout(sessionTimer);

    activeSession = {
      isActive: true,
      className: data.className,
      otp: data.otp,
      venueLat: data.lat,
      venueLon: data.lon,
      radius: data.radius || 100,
      lockDuration: data.lockDuration || 120,
      students: []
    };
    
    console.log(`\n📢 CLASS STARTED: ${data.className}`);
    io.emit('update_stats', { count: 0 });

    // Auto-Expire Timer
    const expiryTimeMs = activeSession.lockDuration * 60 * 1000;
    sessionTimer = setTimeout(() => {
      console.log(`🛑 Session Expired: ${activeSession.className}`);
      activeSession.isActive = false;
      activeSession.otp = null;
      io.emit('session_expired', { message: "Class time is over. Attendance closed." });
    }, expiryTimeMs);
  });

  // === LECTURER: END SESSION (KILL SWITCH) ===
  socket.on('end_session', () => {
    console.log(`🛑 Session Ended Manually`);
    if (sessionTimer) clearTimeout(sessionTimer);
    
    activeSession = {
      isActive: false,
      className: null,
      otp: null,
      venueLat: null,
      venueLon: null,
      radius: 100,
      lockDuration: 120,
      students: []
    };
    
    io.emit('session_expired', { message: "The lecturer has ended the session." });
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
      socket.emit('attendance_result', { status: 'error', message: 'Incorrect OTP Code.', studentId });
      return;
    }

    if (activeSession.students.includes(studentId)) {
      socket.emit('attendance_result', { status: 'error', message: 'You have already signed in!', studentId });
      return;
    }

    // 2. DEVICE BINDING
    try {
      const idBinding = await StudentDevice.findOne({ studentId });
      if (idBinding && idBinding.deviceId !== deviceId) {
        socket.emit('attendance_result', { status: 'error', message: 'Security: ID linked to another device.', studentId });
        return;
      }
      const deviceBinding = await StudentDevice.findOne({ deviceId });
      if (deviceBinding && deviceBinding.studentId !== studentId) {
        socket.emit('attendance_result', { status: 'error', message: 'Security: Device linked to another ID.', studentId });
        return;
      }
      if (!idBinding && !deviceBinding) {
        await new StudentDevice({ studentId, deviceId }).save();
      }
    } catch (err) { console.error(err); }

    // 3. GPS CHECK
    const distance = getDistanceFromLatLonInM(activeSession.venueLat, activeSession.venueLon, lat, lon);

    if (distance <= activeSession.radius) {
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

        io.emit('update_stats', { 
          count: activeSession.students.length,
          newStudent: { 
            studentName: fullName, 
            studentId: studentId, 
            checkInTime: actualCheckInTime,
            status: isOffline ? 'Synced (Offline)' : 'Present'
          }
        });

      } catch (err) { console.error(err); }

      socket.emit('attendance_result', { 
        status: 'success', 
        message: isOffline ? 'Offline Data Synced!' : 'Marked Present!',
        lockDuration: activeSession.lockDuration,
        studentId 
      });
      
    } else {
      socket.emit('attendance_result', { 
        status: 'error', 
        message: `Too far! (${Math.round(distance)}m away).`,
        studentId
      });
    }
  });
});

// API Routes
app.get('/api/history', async (req, res) => {
  try { const logs = await AttendanceLog.find().sort({ checkInTime: -1 }); res.json(logs); } catch (err) { res.status(500).json({ message: "Error" }); }
});
app.delete('/api/history/all', async (req, res) => {
  try { await AttendanceLog.deleteMany({}); res.json({ status: 'success' }); } catch (err) { res.status(500).json({ message: "Error" }); }
});
app.delete('/api/history/:id', async (req, res) => {
  try { await AttendanceLog.findByIdAndDelete(req.params.id); res.json({ status: 'success' }); } catch (err) { res.status(500).json({ message: "Error" }); }
});
app.post('/submit-issue', async (req, res) => {
  try { await new SupportTicket(req.body).save(); res.json({ status: 'success' }); } catch (err) { res.status(500).json({ status: 'error' }); }
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
});