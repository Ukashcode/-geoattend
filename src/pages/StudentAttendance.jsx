import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowLeft, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import io from 'socket.io-client';
import API_URL from '../config';

// Debugging: Check if URL is correct in browser console
console.log("Connecting to Backend at:", API_URL);

const socket = io.connect(API_URL, {
  reconnectionAttempts: 5,
  timeout: 10000, // 10 second connection timeout
});

const StudentAttendance = () => {
  const [step, setStep] = useState('input'); // input -> processing -> result
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    otp: ''
  });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);

  // === 1. MONITOR CONNECTION STATUS ===
  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    // Listen for results
    socket.on('attendance_result', (data) => {
      setStatus(data.status);
      setMessage(data.message);
      setStep('result');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('attendance_result');
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.fullName || !formData.studentId || formData.otp.length !== 4) {
      alert("Please fill in all fields and a 4-digit OTP.");
      return;
    }

    if (!isConnected) {
      alert("Cannot connect to server. Please check your internet or wait for the server to wake up.");
      return;
    }

    setStep('processing');
    setMessage("Acquiring GPS Location...");

    if (!navigator.geolocation) {
      handleError("Geolocation is not supported by your browser.");
      return;
    }

    // === 2. GPS WITH TIMEOUT ===
    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // Wait max 10 seconds for GPS
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        setMessage("Verifying with Server...");
        
        // Send to server
        socket.emit('mark_attendance', {
          studentOtp: formData.otp,
          fullName: formData.fullName,
          studentId: formData.studentId,
          lat: latitude,
          lon: longitude
        });

        // === 3. SERVER TIMEOUT SAFETY ===
        // If server doesn't reply in 10 seconds, show error
        setTimeout(() => {
          setStep((currentStep) => {
            if (currentStep === 'processing') {
              setStatus('error');
              setMessage("Server request timed out. The backend might be sleeping. Please try again.");
              return 'result';
            }
            return currentStep;
          });
        }, 15000);
      },
      (error) => {
        let errorMsg = "Location access denied.";
        if (error.code === 3) errorMsg = "GPS timed out. Move to an open area.";
        if (error.code === 2) errorMsg = "GPS unavailable. Check your location settings.";
        handleError(errorMsg);
      },
      gpsOptions
    );
  };

  const handleError = (msg) => {
    setStep('result');
    setStatus('error');
    setMessage(msg);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Connection Warning */}
      {!isConnected && (
        <div className="absolute top-20 bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
          <WifiOff size={14} />
          Connecting to server...
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 px-2">
        <h1 className="text-xl font-bold text-gray-900">GeoAttend</h1>
        <Link to="/" className="text-sm text-gray-500 font-medium hover:text-blue-600">
          Switch Role
        </Link>
      </div>

      {/* === STEP 1: INPUT === */}
      {step === 'input' && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Student Check-in</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Jane Doe" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
              <input type="text" name="studentId" value={formData.studentId} onChange={handleChange} placeholder="e.g. 2024001" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">4-Digit OTP</label>
              <input type="number" name="otp" value={formData.otp} onChange={handleChange} placeholder="0 0 0 0" maxLength={4} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-3xl font-bold text-gray-800 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:tracking-widest" />
            </div>

            <button onClick={handleSubmit} disabled={!isConnected} className={`w-full font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95 ${isConnected ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
              {isConnected ? "Verify Attendance" : "Connecting..."}
            </button>
          </div>
        </motion.div>
      )}

      {/* === STEP 2: PROCESSING === */}
      {step === 'processing' && (
        <div className="text-center">
          <Loader2 size={64} className="text-teal-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">Processing...</h3>
          <p className="text-gray-400 text-sm mt-2">{message}</p>
        </div>
      )}

      {/* === STEP 3: RESULT === */}
      {step === 'result' && (
        <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full">
          {status === 'success' ? (
            <div className="mb-6">
              <CheckCircle size={80} className="text-teal-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900 mt-4">Checked In!</h2>
              <p className="text-gray-500 mt-2">You are marked present.</p>
            </div>
          ) : (
            <div className="mb-6">
              <XCircle size={80} className="text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900 mt-4">Failed</h2>
              <p className="text-red-500 mt-2 text-sm">{message}</p>
            </div>
          )}
          
          <button onClick={() => setStep('input')} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm">
            Try Again
          </button>
        </motion.div>
      )}

      <footer className="mt-8 text-gray-400 text-xs text-center max-w-xs">
        &copy; 2025 GeoAttend System.
      </footer>
    </div>
  );
};

export default StudentAttendance;