import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, User, Trash2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import API_URL from '../config';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    fetch(`${API_URL}/api/history`)
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  // === SINGLE DELETE ===
  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to delete this record?")) return;

    try {
      await fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' });
      setLogs(logs.filter(log => log._id !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  // === NEW: DELETE ALL FUNCTION ===
  const handleDeleteAll = async () => {
    const confirm1 = confirm("⚠️ WARNING: This will delete ALL attendance records permanently.");
    if (!confirm1) return;
    
    const confirm2 = confirm("Are you absolutely sure? This cannot be undone.");
    if (!confirm2) return;

    try {
      await fetch(`${API_URL}/api/history/all`, { method: 'DELETE' });
      setLogs([]); // Clear the UI instantly
      alert("All history has been cleared.");
    } catch (error) {
      alert("Failed to clear history");
    }
  };

  const filteredLogs = logs.filter(log => 
    log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.studentId.includes(searchTerm)
  );

  const downloadReport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance History");
    XLSX.writeFile(wb, "Full_Attendance_History.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance History</h1>
            <p className="text-gray-500 mt-1">View and manage all past records.</p>
          </div>
          
          <div className="flex gap-3">
            {/* DELETE ALL BUTTON */}
            {logs.length > 0 && (
              <button 
                onClick={handleDeleteAll}
                className="flex items-center gap-2 bg-red-100 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors shadow-sm active:scale-95"
              >
                <Trash2 size={20} />
                Clear History
              </button>
            )}

            {/* EXPORT BUTTON */}
            <button 
              onClick={downloadReport}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg active:scale-95"
            >
              <Download size={20} />
              Export All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-3">
          <Search className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by Student Name, ID, or Class..." 
            className="flex-grow outline-none text-gray-700 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* The Table */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center text-gray-400">
              <AlertTriangle size={48} className="mb-4 text-gray-300" />
              <p>No records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                    <th className="p-6 font-bold">Student</th>
                    <th className="p-6 font-bold">Class</th>
                    <th className="p-6 font-bold">Time</th>
                    <th className="p-6 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-blue-50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{log.studentName}</p>
                            <p className="text-xs text-gray-500">{log.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-medium text-gray-700">{log.className}</span>
                      </td>
                      <td className="p-6 text-gray-500 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(log.checkInTime).toLocaleString()}
                        </div>
                      </td>
                      <td className="p-6">
                        <button 
                          onClick={() => handleDelete(log._id)}
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete this record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;