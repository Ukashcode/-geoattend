import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, WifiOff, Lock, Clock, UserCheck, CloudOff, RefreshCw, Save, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import io from 'socket.io-client';
import API_URL from '../config';

const getDeviceId = () => {
  let id = localStorage.getItem('geoAttend_deviceId');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('geoAttend_deviceId', id);
  }
  return id;
};

const socket = io.connect(API_URL, {
  reconnectionAttempts: 5,
  timeout: 10000,
  autoConnect: true
});

const StudentAttendance = () => {
  const [step, setStep] = useState('input'); 
  const [formData, setFormData] = useState({ fullName: '', studentId: '', otp: '' });
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');
  
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [overrideLock, setOverrideLock] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('geoAttend_name');
    const savedId = localStorage.getItem('geoAttend_id');
    if (savedName && savedId) {
      setFormData(prev => ({ ...prev, fullName: savedName, studentId: savedId }));
      setIsReturningUser(true);
    }

    const handleOnline = () => { setIsOfflineMode(false); attemptSync(); };
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    socket.on('connect', () => { setIsConnected(true); attemptSync(); });
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('attendance_result', (data) => {
      if (data.studentId && data.studentId !== formData.studentId) return;

      setIsSyncing(false);
      setStatus(data.status);
      setMessage(data.message);
      setStep('result');

      if (data.status === 'success') {
        const durationMs = (data.lockDuration || 60) * 60 * 1000;
        handleSuccess(formData.studentId, durationMs);
      }
    });

    checkDeviceLock();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('attendance_result');
    };
  }, [formData.studentId]);

  const attemptSync = () => {
    const pendingData = localStorage.getItem('geoAttend_pending');
    if (pendingData && socket.connected) {
      setIsSyncing(true);
      const data = JSON.parse(pendingData);
      data.isOffline = true; 
      socket.emit('mark_attendance', data);
      localStorage.removeItem('geoAttend_pending');
    }
  };

  const saveOffline = (data) => {
    localStorage.setItem('geoAttend_pending', JSON.stringify(data));
    setStep('result');
    setStatus('success'); 
    setMessage("Offline Mode: Attendance Saved! It will sync automatically.");
    handleSuccess(data.studentId, 60 * 60 * 1000);
  };

  const handleSuccess = (studentId, durationMs) => {
    const lockData = { 
      timestamp: new Date().getTime(), 
      studentId,
      duration: durationMs,
      otp: formData.otp 
    };
    localStorage.setItem('geoAttend_lock', JSON.stringify(lockData));
    localStorage.setItem('geoAttend_name', formData.fullName);
    localStorage.setItem('geoAttend_id', formData.studentId);
    
    setOverrideLock(false);
    checkDeviceLock();
  };

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
      const { timestamp, duration } = JSON.parse(lockData);
      const lockTime = duration || (60 * 60 * 1000); 
      const now = new Date().getTime();
      const timePassed = now - timestamp;

      if (timePassed < lockTime) {
        setIsDeviceLocked(true);
        setTimeLeft(lockTime - timePassed);
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

  const handleSubmit = () => {
    if (isDeviceLocked) {
      const lockData = JSON.parse(localStorage.getItem('geoAttend_lock'));
      if (lockData && lockData.otp === formData.otp) {
        alert(`You already signed in for this class. Device locked for ${formatTime(timeLeft)}`);
        return;
      }
    }

    if (!formData.fullName || !formData.studentId || formData.otp.length !== 4) { alert("Fill all fields."); return; }

    setStep('processing');
    setMessage("Acquiring GPS Location...");

    if (!navigator.geolocation) { 
        setStep('result'); setStatus('error'); setMessage("Geolocation not supported."); return; 
    }

    const gpsOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        const payload = {
          studentOtp: formData.otp,
          fullName: formData.fullName,
          studentId: formData.studentId,
          lat: latitude,
          lon: longitude,
          deviceId: getDeviceId(),
          timestamp: new Date().toISOString(),
          isOffline: false 
        };

        if (socket.connected && !isOfflineMode) {
          setMessage("Verifying with Server...");
          socket.emit('mark_attendance', payload);
        } else {
          saveOffline({ ...payload, isOffline: true });
        }
      },
      (error) => {
        setStep('result'); setStatus('error'); setMessage("Location access denied or GPS error.");
      },
      gpsOptions
    );
  };

  const handleReset = () => {
    if(confirm("This will clear all saved data on this device. Continue?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (isDeviceLocked && !overrideLock) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-orange-100">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={40} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Marked</h2>
          <p className="text-gray-500 mt-2 text-sm leading-relaxed">
            Device locked for this class to prevent proxy attendance.
          </p>
          <div className="mt-6 bg-gray-900 text-white rounded-xl p-4 flex items-center justify-center gap-3">
            <Clock size={20} className="text-orange-400" />
            <div className="text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Cooldown Timer</p>
              <p className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</p>
            </div>
          </div>
          <button onClick={() => { setOverrideLock(true); setStep('input'); setFormData(prev => ({ ...prev, otp: '' })); }} className="mt-6 w-full flex items-center justify-center gap-2 text-blue-600 font-bold bg-blue-50 py-3 rounded-xl hover:bg-blue-100 transition-colors">
            Join Another Class <ArrowRight size={16} />
          </button>
          <button onClick={() => window.location.href = '/'} className="mt-4 text-gray-400 text-xs hover:text-gray-600">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {isSyncing && <div className="absolute top-20 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 z-10 animate-pulse"><RefreshCw size={14} className="animate-spin" /> Syncing Data...</div>}
      {!isConnected && !isSyncing && <div className="absolute top-20 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 z-10 border border-yellow-200"><CloudOff size={14} /> Offline Mode</div>}

      <button onClick={handleReset} className="absolute top-4 right-4 text-xs text-gray-400 hover:text-red-500 underline">Reset App</button>

      {step === 'input' && (
        <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}} className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
          {isReturningUser ? (
            <div className="mb-6 text-center">
               <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><UserCheck size={32} className="text-blue-600" /></div>
               <h2 className="text-xl font-bold text-gray-900">Welcome, {formData.fullName.split(' ')[0]}</h2>
               <p className="text-sm text-gray-500">{formData.studentId}</p>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-gray-900 mb-6">Student Check-in</h2>
          )}
          <div className="space-y-5">
            {!isReturningUser && (
              <>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label><input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Jane Doe" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label><input type="text" name="studentId" value={formData.studentId} onChange={handleChange} placeholder="e.g. 2024001" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
              </>
            )}
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">4-Digit OTP</label><input type="number" name="otp" value={formData.otp} onChange={handleChange} placeholder="0 0 0 0" maxLength={4} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-4 text-center text-3xl font-bold text-gray-800 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:tracking-widest" /></div>
            <button onClick={handleSubmit} className={`w-full font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95 ${!isConnected ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
              {!isConnected ? (<span className="flex items-center justify-center gap-2"><Save size={20} /> Save Offline</span>) : "Verify Attendance"}
            </button>
            {isReturningUser && <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-xs text-gray-400 hover:text-gray-600 underline">Not you? Switch Account</button>}
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
            <div className="mb-6">
              {message.includes("Offline") ? <RefreshCw size={80} className="text-yellow-500 mx-auto" /> : <CheckCircle size={80} className="text-teal-500 mx-auto" />}
              <h2 className="text-2xl font-bold text-gray-900 mt-4">{message.includes("Offline") ? "Saved Offline" : "Checked In!"}</h2>
              <p className="text-gray-500 mt-2 text-sm px-4">{message}</p>
            </div>
          ) : (
            <div className="mb-6">
              <XCircle size={80} className="text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900 mt-4">Failed</h2>
              <p className="text-red-500 mt-2 text-sm">{message}</p>
            </div>
          )}
          {status !== 'success' && <button onClick={() => setStep('input')} className="text-gray-400 font-bold hover:text-gray-600 underline text-sm">Try Again</button>}
          {status === 'success' && <button onClick={() => { setStep('input'); setOverrideLock(false); }} className="mt-4 text-blue-600 font-bold">Done</button>}
        </motion.div>
      )}

      <footer className="mt-8 text-gray-400 text-xs text-center max-w-xs">&copy; 2025 GeoAttend System.</footer>
    </div>
  );
};

export default StudentAttendance;