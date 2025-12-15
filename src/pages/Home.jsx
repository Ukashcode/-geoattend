import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Smartphone } from 'lucide-react';

const Home = () => {
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
      </div>

      {/* 2. CARD CONTAINER */}
      <div className="w-full max-w-md space-y-8">
        
        {/* === LECTURER CARD === */}
        <div className="rounded-3xl shadow-lg border border-gray-100 overflow-hidden bg-white">
          {/* Top Half: Blue Background with Icon */}
          <div className="bg-blue-50 h-48 flex items-center justify-center">
            <FileText size={80} className="text-blue-600" />
          </div>
          
          {/* Bottom Half: Content */}
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
          {/* Top Half: Teal Background with Icon */}
          <div className="bg-teal-50 h-48 flex items-center justify-center">
            <Smartphone size={80} className="text-teal-600" />
          </div>
          
          {/* Bottom Half: Content */}
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