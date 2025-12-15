import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import our Model (Must include .js extension)
import AttendanceLog from './models/AttendanceLog.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// === MIDDLEWARE (UPDATED FOR DEPLOYMENT) ===
app.use(cors({
  origin: "*" // Allow all connections (from Vercel, Localhost, Mobile, etc.)
}));
app.use(express.json());

// === 1. CONNECT TO MONGODB ===
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/geoattend";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// === 2. SOCKET.IO SETUP (UPDATED FOR DEPLOYMENT) ===
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for WebSocket connections
    methods: ["GET", "POST"]
  }
});

// === 3. IN-MEMORY SESSION STATE ===
let activeSession = {
  isActive: false,
  className: null,
  otp: null,
  venueLat: null,
  venueLon: null,
  radius: 75, // <--- UPDATED: Default to 75m for 500 students
  students: [] // List of student IDs
};

// === 4. HELPER: Haversine Formula ===
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth Radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d * 1000; // Return Meters
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// === 5. SOCKET LOGIC ===
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- LECTURER STARTS SESSION ---
  socket.on('start_session', (data) => {
    activeSession = {
      isActive: true,
      className: data.className,
      otp: data.otp,
      venueLat: data.lat,
      venueLon: data.lon,
      radius: data.radius || 75, // Fallback to 75m if not sent
      students: []
    };
    
    console.log(`\n📢 CLASS STARTED: ${data.className}`);
    console.log(`🔑 OTP: ${data.otp}`);
    console.log(`📡 Geofence Radius: ${activeSession.radius}m`);
    
    io.emit('update_stats', { count: 0 });
  });

  // --- LECTURER ROTATES OTP ---
  socket.on('update_otp', (newOtp) => {
    if (activeSession.isActive) {
      activeSession.otp = newOtp;
      console.log(`🔄 OTP Rotated: ${newOtp}`);
    }
  });

  // --- STUDENT MARKS ATTENDANCE ---
  socket.on('mark_attendance', async (data) => {
    const { studentOtp, fullName, studentId, lat, lon } = data;

    // A. Validation
    if (!activeSession.isActive) {
      socket.emit('attendance_result', { status: 'error', message: 'No active class session.' });
      return;
    }
    if (String(studentOtp) !== String(activeSession.otp)) {
      socket.emit('attendance_result', { status: 'error', message: 'Incorrect OTP Code.' });
      return;
    }
    if (activeSession.students.includes(studentId)) {
      socket.emit('attendance_result', { status: 'error', message: 'Attendance already marked.' });
      return;
    }

    // B. GPS Check
    const distance = getDistanceFromLatLonInM(activeSession.venueLat, activeSession.venueLon, lat, lon);
    console.log(`🏃 Student ${fullName} is ${Math.round(distance)}m away.`);

    if (distance <= activeSession.radius) {
      // SUCCESS
      activeSession.students.push(studentId);

      // Save to DB
      try {
        const newLog = new AttendanceLog({
          studentName: fullName,
          studentId,
          className: activeSession.className,
          location: { lat, lon }
        });
        await newLog.save();
        console.log("💾 Saved to DB");
      } catch (err) {
        console.error("DB Save Error:", err);
      }

      socket.emit('attendance_result', { status: 'success', message: 'Marked Present!' });
      io.emit('update_stats', { count: activeSession.students.length });
    } else {
      // FAIL (Distance)
      socket.emit('attendance_result', { 
        status: 'error', 
        message: `Too far! (${Math.round(distance)}m away). Move closer.` 
      });
    }
  });
});

// === 6. API ROUTES ===

// Get History Route
app.get('/api/history', async (req, res) => {
  try {
    const logs = await AttendanceLog.find().sort({ checkInTime: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching logs" });
  }
});

// Submit Issue Route
app.post('/submit-issue', (req, res) => {
  const { name, category, message } = req.body;
  console.log("📝 SUPPORT TICKET:", { name, category, message });
  res.json({ status: 'success' });
});

// Start Server
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT ${PORT} (ES6 Mode)`);
});