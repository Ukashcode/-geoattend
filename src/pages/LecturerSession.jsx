import React, { useState, useEffect } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { User, Clock, FileSpreadsheet, LogOut, ChevronDown, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import io from 'socket.io-client';
import API_URL from '../config'; // <--- Import Config

// Connect to backend using the dynamic URL
const socket = io.connect(API_URL);

const LecturerSession = () => {
  // === STATES ===
  const [step, setStep] = useState('setup'); // 'setup' -> 'active'
  const [selectedClass, setSelectedClass] = useState('Advanced React Patterns');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Session Data
  const [otp, setOtp] = useState(null);
  const [studentsPresent, setStudentsPresent] = useState(0);
  const [attendanceLog, setAttendanceLog] = useState([]); // Stores student details

  // Available Classes (Mock Data)
  const classes = [
    "Advanced React Patterns",
    "Introduction to Quantum Physics",
    "Macroeconomics 101",
    "World History: The Industrial Revolution"
  ];

  // === HELPER FUNCTIONS ===
  function generateCode() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  // === ACTION: START SESSION ===
  const handleStartSession = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is needed to set the geofence.");
      return;
    }

    // 1. Get GPS Location of Lecturer (The Geofence Center)
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      const initialOtp = generateCode();

      // 2. Save State & Send to Server
      setOtp(initialOtp);
      setStep('active');

      // Emit start event with Location Data
      socket.emit('start_session', {
        otp: initialOtp,
        lat: latitude,
        lon: longitude,
        radius: 75, // <--- CHANGED TO 75 METERS (For 500 students)
        className: selectedClass
      });

    }, (error) => {
      alert("Unable to retrieve location. Please allow GPS access.");
    });
  };

  // === SOCKET LISTENERS (Only active when session starts) ===
  useEffect(() => {
    if (step === 'active') {
      socket.on('update_stats', (data) => {
        setStudentsPresent(data.count);
        // In a real app, you'd receive the student list here too to populate attendanceLog
      });
    }
    return () => {
      socket.off('update_stats');
    };
  }, [step]);

  // === ACTION: REFRESH OTP (Every 30s) ===
  const handleTimerComplete = () => {
    const newOtp = generateCode();
    setOtp(newOtp);
    // Tell server the OTP changed (keep the location same)
    socket.emit('update_otp', newOtp); 
    return { shouldRepeat: true };
  };

  // === ACTION: DOWNLOAD EXCEL ===
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendanceLog.length > 0 ? attendanceLog : [{Status: "No Data"}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${selectedClass}_Report.xlsx`);
  };

  // =========================================================
  // RENDER: STEP 1 - SETUP SCREEN
  // =========================================================
  if (step === 'setup') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Start New Class Session</h2>
          </div>

          <div className="p-8 space-y-6">
            
            {/* Custom Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Class / Topic</label>
              
              {/* The Trigger Box */}
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-800 font-medium">{selectedClass}</span>
                <ChevronDown size={20} className="text-gray-500" />
              </button>

              {/* The Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] rounded-xl shadow-2xl z-10 border border-gray-700 overflow-hidden">
                  {classes.map((cls) => (
                    <div 
                      key={cls}
                      onClick={() => {
                        setSelectedClass(cls);
                        setIsDropdownOpen(false);
                      }}
                      className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <span className="text-white text-sm font-medium">{cls}</span>
                      {selectedClass === cls ? (
                        <div className="w-5 h-5 rounded-full border-2 border-teal-400 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-teal-400 rounded-full" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blue Info Note */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-blue-800 text-sm leading-relaxed">
                <span className="font-bold">Note:</span> Starting a session will capture your current GPS location as the geofence center (Radius: 75m).
              </p>
            </div>

            {/* Start Button */}
            <button 
              onClick={handleStartSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Start Attendance Session
            </button>

          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER: STEP 2 - ACTIVE OTP SCREEN
  // =========================================================
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Top Header */}
      <div className="mb-6 text-center">
        <h2 className="text-gray-500 font-bold tracking-widest text-xs uppercase">CURRENT OTP CODE</h2>
        <h3 className="text-gray-900 font-bold mt-1">{selectedClass}</h3>
      </div>

      {/* THE BIG CARD */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-black text-gray-900 tracking-tighter">{otp}</h1>
        </div>

        <div className="flex justify-center mb-4">
          <CountdownCircleTimer
            isPlaying
            duration={30}
            colors={['#3b82f6', '#eab308', '#ef4444']}
            colorsTime={[30, 15, 0]}
            onComplete={handleTimerComplete}
            size={120}
            strokeWidth={8}
            trailColor="#f3f4f6"
          >
            {({ remainingTime }) => (
              <div className="flex flex-col items-center">
                <span className="text-gray-400 text-xs font-medium">Refreshes</span>
                <span className="text-2xl font-bold text-gray-800">{remainingTime}s</span>
              </div>
            )}
          </CountdownCircleTimer>
        </div>
      </div>

      {/* LIVE STATS */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <span className="text-3xl font-bold text-gray-900 block">{studentsPresent}</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Present Students</span>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
          <span className="text-3xl font-bold text-gray-900 block">0</span>
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Minutes Elapsed</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="w-full max-w-sm mt-8 pb-8">
        <button 
          onClick={downloadExcel}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all mb-3"
        >
          End Session & Generate Report
        </button>
      </div>

    </div>
  );
};

export default LecturerSession;