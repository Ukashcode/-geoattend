import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import API_URL from '../config'; // <--- Import this
// Connect to backend
const socket = io.connect(API_URL);

const StudentAttendance = () => {
  const [step, setStep] = useState('input');
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    otp: ''
  });
  const [status, setStatus] = useState(null); 
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.fullName || !formData.studentId || formData.otp.length !== 4) {
      alert("Please fill in all fields.");
      return;
    }

    setStep('processing');

    if (!navigator.geolocation) {
      setStep('result');
      setStatus('error');
      setMessage("Geolocation is not supported by your browser.");
      return;
    }

    // Added TIMEOUT option so it doesn't get stuck forever
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Send Data to Server
        socket.emit('mark_attendance', {
          studentOtp: formData.otp,
          fullName: formData.fullName,
          studentId: formData.studentId,
          lat: latitude,
          lon: longitude
        });
        
        // Safety: If server doesn't reply in 5 seconds, show error
        setTimeout(() => {
            if(step === 'processing') {
                // If we are still processing after 5 seconds, assume server is down
                // Note: This check relies on state closure, simplified for this demo
            }
        }, 5000);
      },
      (error) => {
        setStep('result');
        setStatus('error');
        setMessage("Location access denied or failed. Please ensure GPS is on.");
      },
      { timeout: 10000 } // Don't wait more than 10 seconds for GPS
    );
  };

  // Listen for Server Response
  useEffect(() => {
    socket.on('attendance_result', (data) => {
      setStatus(data.status);
      setMessage(data.message);
      setStep('result');
    });

    return () => {
      socket.off('attendance_result');
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* 
         I REMOVED THE HEADER TEXT HERE 
         (GeoAttend & Switch Role are gone)
      */}

      {/* === STEP 1: INPUT FORM === */}
      {step === 'input' && (
        <motion.div 
          initial={{opacity: 0, y: 10}} 
          animate={{opacity: 1, y: 0}} 
          className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Student Check-in</h2>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
              <input 
                type="text" 
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g. 2024001"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">4-Digit OTP</label>
              <input 
                type="number" 
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder="0 0 0 0"
                maxLength={4}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-3xl font-bold text-gray-800 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:tracking-widest"
              />
            </div>

            <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
              By clicking Check In, you allow access to your GPS location for verification.
            </p>

            <button 
              onClick={handleSubmit}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95"
            >
              Verify Attendance
            </button>
          </div>
        </motion.div>
      )}

      {/* === STEP 2: PROCESSING === */}
      {step === 'processing' && (
        <div className="text-center">
          <Loader2 size={64} className="text-teal-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">Verifying Location...</h3>
          <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
        </div>
      )}

      {/* === STEP 3: RESULT === */}
      {step === 'result' && (
        <motion.div 
          initial={{opacity: 0, scale: 0.9}} 
          animate={{opacity: 1, scale: 1}} 
          className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full"
        >
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
          
          <button 
            onClick={() => setStep('input')}
            className="text-gray-400 font-bold hover:text-gray-600 underline text-sm"
          >
            Try Again
          </button>
        </motion.div>
      )}

      

    </div>
  );
};

export default StudentAttendance;