import React, { useState, useEffect } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import { Loader2, MapPin, BookOpen, Wifi, WifiOff, Clock, ChevronDown, History, Trash2, X } from 'lucide-react'; // Added X icon
import * as XLSX from 'xlsx';
import io from 'socket.io-client';
import API_URL from '../config';

const socket = io.connect(API_URL);

const LecturerSession = () => {
  const [step, setStep] = useState('setup');
  const [selectedClass, setSelectedClass] = useState(''); 
  const [duration, setDuration] = useState(120); 
  const [otp, setOtp] = useState(null);
  const [studentsPresent, setStudentsPresent] = useState(0);
  const [attendanceLog, setAttendanceLog] = useState([]); 
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [currentAccuracy, setCurrentAccuracy] = useState(null);
  const [savedCourses, setSavedCourses] = useState([]);

  useEffect(() => {
    if (step === 'setup') {
      const history = JSON.parse(localStorage.getItem('geoAttend_myClasses') || '[]');
      setSavedCourses(history);
    }
  }, [step]);

  function generateCode() {
    return Math.floor(1000 + Math.random() * 9000);
  }

  const clearCourseHistory = () => {
    if(confirm("Clear your recent course list?")) {
      localStorage.removeItem('geoAttend_myClasses');
      setSavedCourses([]);
      setSelectedClass('');
    }
  };

  const getPreciseLocation = (attempt = 1) => {
    setGpsLoading(true);
    setGpsStatus(attempt === 1 ? "Acquiring GPS..." : `Improving accuracy (${attempt}/3)...`);

    const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentAccuracy(Math.round(accuracy));

        if (accuracy > 50 && attempt < 3) { getPreciseLocation(attempt + 1); return; }
        if (accuracy > 100) {
           if(!confirm(`GPS Accuracy is ${Math.round(accuracy)}m. Continue?`)) {
             setGpsLoading(false); setGpsStatus(""); return;
           }
        }

        const initialOtp = generateCode();
        setOtp(initialOtp);
        setStep('active');
        setGpsLoading(false);

        const cleanName = selectedClass.trim(); 
        const myClasses = JSON.parse(localStorage.getItem('geoAttend_myClasses') || '[]');
        
        if (!myClasses.includes(cleanName)) {
          const newHistory = [cleanName, ...myClasses]; 
          localStorage.setItem('geoAttend_myClasses', JSON.stringify(newHistory));
          setSavedCourses(newHistory); 
        }

        socket.emit('start_session', {
          otp: initialOtp,
          lat: latitude,
          lon: longitude,
          radius: 100,
          className: cleanName,
          lockDuration: duration
        });
      }, 
      (error) => {
        if (attempt < 3) { getPreciseLocation(attempt + 1); } else { setGpsLoading(false); alert("GPS Error."); }
      }, 
      options
    );
  };

  const handleStartSession = () => {
    if (!selectedClass.trim()) { alert("Enter Course Name."); return; }
    if (!navigator.geolocation) { alert("Geolocation needed."); return; }
    getPreciseLocation(1);
  };

  useEffect(() => {
    socket.emit('request_current_state');
    
    socket.on('session_restored', (data) => {
      if (data.isActive) {
        setStep('active');
        setSelectedClass(data.className);
        setOtp(data.otp);
        setStudentsPresent(data.count);
      }
    });

    socket.on('update_stats', (data) => {
      setStudentsPresent(data.count);
      if (data.newStudent) { setAttendanceLog((prev) => [data.newStudent, ...prev]); }
    });

    socket.on('session_expired', (data) => {
      alert(data.message);
      setStep('setup');
      setOtp(null);
    });

    return () => { 
      socket.off('session_restored'); 
      socket.off('update_stats'); 
      socket.off('session_expired'); 
    };
  }, []);

  const handleTimerComplete = () => {
    const newOtp = generateCode();
    setOtp(newOtp);
    socket.emit('update_otp', newOtp); 
    return { shouldRepeat: true };
  };

  const downloadExcel = () => {
    const dataToExport = attendanceLog.length > 0 ? attendanceLog : [{Status: "No Data"}];
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${selectedClass.replace(/[^a-z0-9]/gi, '_')}_Report.xlsx`);
  };

  // === NEW: END SESSION FUNCTION ===
  const handleEndSession = () => {
    if(confirm("End this session? Students won't be able to join anymore.")) {
      // Reload page to reset state and go back to setup
      window.location.reload();
    }
  };

  if (step === 'setup') {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Start New Session</h2>
          </div>
          <div className="p-8 space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Course Name</label>
              
              <div className="relative mb-3">
                <BookOpen className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input 
                  type="text" 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)} 
                  placeholder="e.g. PHY 101" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-10 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                />
                {/* === CLEAR BUTTON === */}
                {selectedClass && (
                  <button 
                    onClick={() => setSelectedClass('')}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {savedCourses.length > 0 && (
                <div className="relative">
                  <History className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <select 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-blue-50 border border-blue-100 rounded-xl pl-12 pr-4 py-3 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium cursor-pointer"
                    value="" 
                  >
                    <option value="" disabled>Select from recent courses...</option>
                    {savedCourses.map((course, index) => (
                      <option key={index} value={course}>{course}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 text-blue-400 pointer-events-none" size={20} />
                  
                  <button 
                    onClick={clearCourseHistory}
                    className="text-xs text-red-400 hover:text-red-600 mt-2 flex items-center gap-1 ml-1"
                  >
                    <Trash2 size={12} /> Clear recent courses
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Auto-Close & Lock)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium">
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={90}>1 Hour 30 Mins</option>
                  <option value={120}>2 Hours</option>
                  <option value={180}>3 Hours</option>
                </select>
                <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex gap-3"><MapPin className="text-blue-600 shrink-0" size={24} /><p className="text-blue-800 text-sm leading-relaxed"><span className="font-bold">Note:</span> Capturing GPS location.</p></div>
              {currentAccuracy && <div className={`text-xs font-bold mt-2 px-2 py-1 rounded w-fit ${currentAccuracy < 50 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>Accuracy: {currentAccuracy}m</div>}
            </div>
            
            <button onClick={handleStartSession} disabled={gpsLoading || !selectedClass.trim()} className={`w-full font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${!selectedClass.trim() || gpsLoading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              {gpsLoading ? <><Loader2 className="animate-spin" />{gpsStatus}</> : "Start Session"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="mb-6 text-center">
        <h2 className="text-gray-500 font-bold tracking-widest text-xs uppercase">CURRENT OTP CODE</h2>
        <h3 className="text-gray-900 font-bold mt-1 text-xl">{selectedClass}</h3>
      </div>
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="mb-8"><h1 className="text-8xl font-black text-gray-900 tracking-tighter">{otp}</h1></div>
        <div className="flex justify-center mb-4">
          <CountdownCircleTimer isPlaying duration={60} colors={['#3b82f6', '#eab308', '#ef4444']} colorsTime={[60, 30, 0]} onComplete={handleTimerComplete} size={120} strokeWidth={8}>
            {({ remainingTime }) => (<div className="flex flex-col items-center"><span className="text-gray-400 text-xs font-medium">Refreshes</span><span className="text-2xl font-bold text-gray-800">{remainingTime}s</span></div>)}
          </CountdownCircleTimer>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center"><span className="text-3xl font-bold text-gray-900 block">{studentsPresent}</span><span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Present</span></div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center"><span className="text-3xl font-bold text-gray-900 block">0</span><span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Mins</span></div>
      </div>
      <div className="w-full max-w-sm mt-8 pb-8 space-y-3">
        <button onClick={downloadExcel} className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all">Download Excel</button>
        
        {/* === NEW: END SESSION BUTTON === */}
        <button onClick={handleEndSession} className="w-full bg-red-100 text-red-600 py-4 rounded-xl font-bold hover:bg-red-200 transition-all">End Session & Start New</button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mt-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 text-left">Recent Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {attendanceLog.map((log, index) => (
              <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                <span className="font-bold text-gray-800">{log.studentName}</span>
                {log.status === 'Synced (Offline)' ? <span className="text-yellow-600 flex items-center gap-1 text-xs"><WifiOff size={12}/> Offline</span> : <span className="text-green-600 flex items-center gap-1 text-xs"><Wifi size={12}/> Live</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturerSession;