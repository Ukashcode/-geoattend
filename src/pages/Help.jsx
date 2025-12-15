import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, AlertTriangle } from 'lucide-react';

const Help = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Back Button */}
      <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8">
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Home</span>
      </Link>

      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
        <p className="text-gray-500 mb-8">Common issues and solutions.</p>

        <div className="space-y-4">
          
          {/* FAQ Item 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="bg-red-50 p-3 rounded-full text-red-500">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">"Location Denied" Error</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  If you accidentally blocked location access:
                  <br/>1. Click the Lock icon 🔒 in your browser address bar.
                  <br/>2. Click "Permissions" or "Site Settings".
                  <br/>3. Set Location to <strong>Allow</strong>.
                  <br/>4. Refresh the page.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Item 2 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              <div className="bg-yellow-50 p-3 rounded-full text-yellow-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">"Too Far Away" Error</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  GPS inside buildings can be jumpy.
                  <br/>• Try moving closer to a window.
                  <br/>• Turn your Wi-Fi <strong>ON</strong> (this helps accuracy even if you aren't connected).
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Help;