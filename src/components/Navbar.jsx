import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  return (
    // Removed 'max-w-...' so it takes full width
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 w-full">
      <div className="flex items-center justify-between px-6 py-4">
        
        {/* === LEFT: LOGO === */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-xl font-sans">G</span>
          </div>
          <span className="text-2xl font-bold text-gray-900 tracking-tight">
            GeoAttend
          </span>
        </Link>

        {/* === RIGHT: DASHBOARD BUTTON === */}
        <div className="flex items-center gap-4">
          
          {/* If we are on the Dashboard, show a "Back Home" button */}
          {location.pathname === '/dashboard' ? (
            <Link to="/">
              <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors">
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Back Home</span>
              </button>
            </Link>
          ) : (
            // Otherwise, show the Dashboard button (Hide it on student page)
            !location.pathname.includes('/student') && (
              <Link to="/dashboard">
                <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium transition-colors">
                  <LayoutDashboard size={20} />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
              </Link>
            )
          )}
          
        </div>

      </div>
    </nav>
  );
};

export default Navbar;