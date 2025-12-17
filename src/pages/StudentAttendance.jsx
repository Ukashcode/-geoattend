import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, WifiOff, Lock, Clock, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import API_URL from '../config';

console.log("Connecting to Backend at:", API_URL);

const socket = io.connect(API_URL, {
  reconnectionAttempts: 5,
  timeout: 10000,
});

const LOCK_DURATION = 10 * 60 * 1000; // 10 Minutes

const StudentAttendance = () => {
  const [step, setStep] = useState('input'); 
  const [formData, setFormData] = useState({ fullName: '', studentId: '', otp: '' });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('attendance_result', (data) => {
      setStatus(data.status);
      setMessage(data.message);
      setStep('result');

      if (data.status === 'success') {
        const lockData = { timestamp: new Date().getTime(), studentId: formData.studentId };
        localStorage.setItem('geoAttend_lock', JSON.stringify(lockData));
        checkDeviceLock();
      }
    });

    checkDeviceLock();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('attendance_result');
    };
  }, [formData.studentId]);

  useEffect(() => {
    let timer;
    if (isDeviceLocked && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            setIsDeviceLocked(false);
            localStorage.removeItem('geoAttend_lock');
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDeviceLocked, timeLeft]);

  const checkDeviceLock = () => {
    const lockData = localStorage.getItem('geoAttend_lock');
    if (lockData) {
      const { timestamp } = JSON.parse(lockData);
      const now = new Date().getTime();
      const timePassed = now - timestamp;
      if (timePassed < LOCK_DURATION) {
        setIsDeviceLocked(true);
        setTimeLeft(LOCK_DURATION - timePassed);
      } else {
        localStorage.removeItem('geoAttend_lock');
        setIsDeviceLocked(false);
      }
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // === NEW: MOCK LOCATION DETECTOR ===
  const detectMockLocation = (coords) => {
    // 1. Check for missing Altitude/Speed (Common in basic spoofers on mobile)
    // Note: Some cheap real phones also miss this, so we use it as a "Risk Factor"
    // but we won't block solely on this to avoid false positives.
    
    // 2. Check for "Perfect" Accuracy
    // Real GPS rarely has accuracy < 3 meters inside a building.
    // Mock GPS often sets accuracy to 1 or 0.
    if (coords.accuracy <= 2) {
      return true; // Suspiciously perfect
    }

    return false;
  };

  const handleSubmit = () => {
    if (isDeviceLocked) { alert(`Device locked. Wait ${formatTime(timeLeft)}`); return; }
    if (!formData.fullName || !formData.studentId || formData.otp.length !== 4) { alert("Fill all fields."); return; }
    if (!isConnected) { alert("No connection."); return; }

    setStep('processing');
    setMessage("Analyzing GPS Signal...");

    if (!navigator.geolocation) { handleError("Geolocation not supported."); return; }

    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, altitude, speed } = position.coords;
        
        // === RUN SECURITY CHECKS ===
        if (detectMockLocation(position.coords)) {
          setStep('result');
          setStatus('error');
          setMessage("Security Alert: Irregular GPS signal detected. Please turn off any Mock Location apps.");
          return;
        }

        setMessage("Verifying with Server...");
        
        socket.emit('mark_attendance', {
          studentOtp: formData.otp,
          fullName: formData.fullName,
          studentId: formData.studentId,
          lat: latitude,
          lon: longitude
        });

        setTimeout(() => {
          setStep((currentStep) => {
            if (currentStep === 'processing') {
              setStatus('error');
              setMessage("Server timed out.");
              return 'result';
            }
            return currentStep;
          });
        }, 15000);
      },
      (error) => {
        let errorMsg = "Location access denied.";
        if (error.code === 3) errorMsg = "GPS timed out.";
        if (error.code === 2) errorMsg = "GPS unavailable.";
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

  if (isDeviceLocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-orange-100">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={40} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Device Cooldown</h2>
          <p className="text-gray-500 mt-2 text-sm">Attendance marked. Device locked temporarily.</p>
          <div className="mt-6 bg-gray-900 text-white rounded-xl p-4 flex items-center justify-center gap-3">
            <Clock size={20} className="text-orange-400" />
            <div className="text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Next Sign-in enabled in</p>
              <p className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</p>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} className="mt-6 text-gray-400 font-bold hover:text-gray-600 text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      {!isConnected && (
        <div className="absolute top-20 bg-red-100 text-red-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse z-10">
          <WifiOff size={14} /> Connecting...
        </div>
      )}

      {step === 'input' && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Student Check-in</h2>
          <div className="space-y-5">
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Jane Doe" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label><input type="text" name="studentId" value={formData.studentId} onChange={handleChange} placeholder="e.g. 2024001" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">4-Digit OTP</label><input type="number" name="otp" value={formData.otp} onChange={handleChange} placeholder="0 0 0 0" maxLength={4} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-3xl font-bold text-gray-800 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:tracking-widest" /></div>
            <button onClick={handleSubmit} disabled={!isConnected} className={`w-full font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95 ${isConnected ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>{isConnected ? "Verify Attendance" : "Connecting..."}</button>
          </div>
        </motion.div>
      )}

      {step === 'processing' && (
        <div className="text-center">
          <Loader2 size={64} className="text-teal-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">Processing...</h3>
          <p className="text-gray-400 text-sm mt-2">{message}</p>
        </div>
      )}

      {step === 'result' && (
        <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full">
          {status === 'success' ? (
            <div className="mb-6"><CheckCircle size={80} className="text-teal-500 mx-auto" /><h2 className="text-2xl font-bold text-gray-900 mt-4">Checked In!</h2><p className="text-gray-500 mt-2">You are marked present.</p><p className="text-xs text-gray-400 mt-4">Device locked for 10 mins.</p></div>
          ) : (
            <div className="mb-6">
              {message.includes("Security") ? <ShieldAlert size={80} className="text-red-600 mx-auto" /> : <XCircle size={80} className="text-red-500 mx-auto" />}
              <h2 className="text-2xl font-bold text-gray-900 mt-4">Failed</h2>
              <p className="text-red-500 mt-2 text-sm">{message}</p>
            </div>
          )}
          {status !== 'success' && <button onClick={() => setStep('input')} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm">Try Again</button>}
        </motion.div>
      )}
      <footer className="mt-8 text-gray-400 text-xs text-center max-w-xs">&copy; 2025 GeoAttend System.</footer>
    </div>
  );
};

export default StudentAttendance;