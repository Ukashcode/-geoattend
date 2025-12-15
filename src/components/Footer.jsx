import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-gray-100 py-6 mt-auto">
      <div className="max-w-md mx-auto px-4 text-center">
        
        <div className="flex items-center justify-center gap-6 mb-4">
          
          <Link to="/help" className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <HelpCircle size={16} />
            <span>Help Center</span>
          </Link>

          <span className="text-gray-300">•</span>

          {/* This Link now points to our new form */}
          <Link to="/support" className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <Mail size={16} />
            <span>Contact Admin</span>
          </Link>

        </div>

        <p className="text-xs text-gray-400">
          &copy; 2025 GeoAttend System. v1.0
        </p>
      </div>
    </footer>
  );
};

export default Footer;