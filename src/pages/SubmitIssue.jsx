import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import API_URL from '../config'; // <--- Import Config

const SubmitIssue = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'Technical Issue',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      // === REAL BACKEND CALL ===
      const response = await fetch(`${API_URL}/submit-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('success');
        // Clear the form
        setFormData({ name: '', email: '', category: 'Technical Issue', message: '' }); 
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error("Submission failed:", error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 p-6 font-sans flex flex-col items-center justify-center">
      
      {/* Header with Back Link */}
      <div className="w-full max-w-lg mb-6">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg border border-gray-100">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>
          <p className="text-gray-500 mt-1">Found a bug? Let the admin know.</p>
        </div>

        {status === 'success' ? (
          // === SUCCESS SCREEN ===
          <div className="text-center py-10 animation-fade-in">
            <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Issue Submitted!</h2>
            <p className="text-gray-500 mt-2">The admin has been notified. We will check it shortly.</p>
            <button 
              onClick={() => setStatus('idle')}
              className="mt-8 text-blue-600 font-bold hover:bg-blue-50 px-6 py-3 rounded-xl transition-colors"
            >
              Submit another issue
            </button>
          </div>
        ) : (
          // === FORM SCREEN ===
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="john@university.edu"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Type</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
              >
                <option>Technical Issue (App Crashing)</option>
                <option>GPS / Location Error</option>
                <option>Login / Account Problem</option>
                <option>Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea 
                name="message"
                required
                rows="4"
                value={formData.message}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                placeholder="Describe what happened..."
              ></textarea>
            </div>

            {/* Error Message */}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle size={16} />
                <span>Failed to send. Please check your connection.</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={status === 'submitting'}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Issue
                </>
              )}
            </button>

          </form>
        )}
      </div>
    </div>
  );
};

export default SubmitIssue;