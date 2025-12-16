import React, { useState, useEffect } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { User, ChevronDown, Loader2 } from 'lucide-react'; // Added Loader
import * as XLSX from 'xlsx';
import io from 'socket.io-client';
import API_URL from '../config';

const socket = io.connect(API_URL);

const LecturerSession = () => {
  const [step, setStep] = useState('setup');
  const [selectedClass, setSelectedClass] = useState('Advanced React Patterns');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [otp, setOtp] = useState(null);
  const [studentsPresent, setStudentsPresent] = useState(0);
  
  // === FIX 1: Store actual student data for Excel ===
  const [attendanceLog, setAttendanceLog] = useState([]); 
  const [gpsLoading, setGpsLoading] = useState(false); // UI Feedback

  const classes = [
    "Advanced React Patterns",
    "Introduction to Quantum Physics",
    "Macroeconomics 101",
    "World History: The Industrial Revolution"
  ];

  function generateCode() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  const handleStartSession = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is needed.");
      return;
    }

    setGpsLoading(true); // Show loading spinner

    // === FIX 2: FORCE HIGH ACCURACY GPS ===
    const options = {
      enableHighAccuracy: true, // Force GPS hardware
      timeout: 10000,           // Wait up to 10s for a good signal
      maximumAge: 0             // Do not use cached location
    };

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      // Optional: Warn if accuracy is bad (>50m)
      if (accuracy > 50) {
        if(!confirm(`GPS Accuracy is low (${Math.round(accuracy)}m). This might cause issues. Continue?`)) {
          setGpsLoading(false);
          return;
        }
      }

      const initialOtp = generateCode();
      setOtp(initialOtp);
      setStep('active');
      setGpsLoading(false);

      socket.emit('start_session', {
        otp: initialOtp,
        lat: latitude,
        lon: longitude,
        radius: 100, // Increased to 100m to be safe
        className: selectedClass
      });

    }, (error) => {
      setGpsLoading(false);
      alert("Error getting location. Please ensure GPS is ON and try again.");
    }, options);
  };

  // === FIX 3: Listen for Student Data ===
  useEffect(() => {
    if (step === 'active') {
      socket.on('update_stats', (data) => {
        setStudentsPresent(data.count);
        
        // Add the new student to our local list for Excel
        if (data.newStudent) {
          setAttendanceLog((prev) => [...prev, data.newStudent]);
        }
      });
    }
    return () => {
      socket.off('update_stats');
    };
  }, [step]);

  const handleTimerComplete = () => {
    const newOtp = generateCode();
    setOtp(newOtp);
    socket.emit('update_otp', newOtp); 
    return { shouldRepeat: true };
  };

  const downloadExcel = () => {
    // Check if we have data
    const dataToExport = attendanceLog.length > 0 ? attendanceLog : [{Status: "No students joined yet"}];
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${selectedClass}_Report.xlsx`);
  };

  // --- RENDER SETUP ---
  if (step === 'setup') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Start New Class Session</h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class / Topic</label>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-800 font-medium">{selectedClass}</span>
                <ChevronDown size={20} className="text-gray-500" />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] rounded-xl shadow-2xl z-10 border border-gray-700 overflow-hidden">
                  {classes.map((cls) => (
                    <div key={cls} onClick={() => { setSelectedClass(cls); setIsDropdownOpen(false); }} className="px-5 py-4 cursor-pointer hover:bg-slate-700 text-white border-b border-slate-700/50">
                      {cls}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-blue-800 text-sm leading-relaxed">
                <span className="font-bold">Note:</span> We will capture your precise GPS location now. Please stand in the center of the hall.
              </p>
            </div>

            <button 
              onClick={handleStartSession}
              disabled={gpsLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2"
            >
              {gpsLoading ? <Loader2 className="animate-spin" /> : "Start Attendance Session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER ACTIVE ---
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-6 text-center">
        <h2 className="text-gray-500 font-bold tracking-widest text-xs uppercase">CURRENT OTP CODE</h2>
        <h3 className="text-gray-900 font-bold mt-1">{selectedClass}</h3>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-black text-gray-900 tracking-tighter">{otp}</h1>
        </div>
        <div className="flex justify-center mb-4">
          <CountdownCircleTimer isPlaying duration={30} colors={['#3b82f6', '#eab308', '#ef4444']} colorsTime={[30, 15, 0]} onComplete={handleTimerComplete} size={120} strokeWidth={8}>
            {({ remainingTime }) => (
              <div className="flex flex-col items-center">
                <span className="text-gray-400 text-xs font-medium">Refreshes</span>
                <span className="text-2xl font-bold text-gray-800">{remainingTime}s</span>
              </div>
            )}
          </CountdownCircleTimer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <span className="text-3xl font-bold text-gray-900 block">{studentsPresent}</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Present</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <span className="text-3xl font-bold text-gray-900 block">0</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mins</span>
        </div>
      </div>

      <div className="w-full max-w-sm mt-8 pb-8">
        <button onClick={downloadExcel} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all mb-3">
          End Session & Download Excel
        </button>
      </div>
    </div>
  );
};

export default LecturerSession;