import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// === IMPORT FROM COMPONENTS FOLDER ===
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// === IMPORT FROM PAGES FOLDER ===
import Home from './pages/Home';
import LecturerSession from './pages/LecturerSession';
import StudentAttendance from './pages/StudentAttendance';
import Help from './pages/Help';
import SubmitIssue from './pages/SubmitIssue';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white font-sans flex flex-col">
        
        {/* Navigation (Component) */}
        <Navbar />
        
        {/* Pages Content */}
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lecturer" element={<LecturerSession />} />
            <Route path="/student" element={<StudentAttendance />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<SubmitIssue />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </div>

        {/* Footer (Component) */}
        <Footer />
        
      </div>
    </Router>
  );
}

export default App;