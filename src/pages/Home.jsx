import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Smartphone, Download } from 'lucide-react'; // Added Download icon

const Home = () => {
  // State to store the install event
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // 1. Listen for the 'beforeinstallprompt' event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to notify the user they can add to home screen
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Function to trigger the install prompt
  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      // Clear the saved prompt since it can't be used again
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pb-12 px-4 font-sans">
      
      {/* 1. WELCOME HEADER */}
      <div className="text-center max-w-md mt-8 mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
          Welcome to <br />
          GeoAttend
        </h1>
        <p className="text-gray-500 text-lg leading-relaxed">
          Secure, location-based attendance tracking using dynamic OTPs. 
          Prevent proxy attendance and generate smart insights with AI.
        </p>

        {/* === CUSTOM INSTALL BUTTON (Only shows if installable) === */}
        {showInstallBtn && (
          <button 
            onClick={handleInstallClick}
            className="mt-6 flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-black transition-transform active:scale-95 mx-auto"
          >
            <Download size={20} />
            Install App
          </button>
        )}
      </div>

      {/* 2. CARD CONTAINER */}
      <div className="w-full max-w-md space-y-8">
        
        {/* === LECTURER CARD === */}
        <div className="rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-white">
          <div className="bg-blue-50 h-48 flex items-center justify-center">
            <FileText size={80} className="text-blue-600" />
          </div>
          <div className="p-8 text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Lecturer</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Create a secure attendance session, project the dynamic OTP, and generate AI-powered attendance reports.
            </p>
            <Link to="/lecturer">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95">
                Start Session
              </button>
            </Link>
          </div>
        </div>

        {/* === STUDENT CARD === */}
        <div className="rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-white">
          <div className="bg-teal-50 h-48 flex items-center justify-center">
            <Smartphone size={80} className="text-teal-600" />
          </div>
          <div className="p-8 text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Student</h2>
            <p className="text-gray-500 mb-6 leading-relaxed">
              Join an active session, verify your GPS location, and check in securely using the 4-digit code.
            </p>
            <Link to="/student">
              <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl text-lg shadow-lg transition-transform active:scale-95">
                Check In
              </button>
            </Link>
          </div>
        </div>

      </div>

      

    </div>
  );
};

export default Home;