import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, User, Trash2, Layers, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import API_URL from '../config';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [myClasses, setMyClasses] = useState([]);

  useEffect(() => {
    fetchLogs();
    const savedClasses = JSON.parse(localStorage.getItem('geoAttend_myClasses') || '[]');
    setMyClasses(savedClasses);
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

  const handleDelete = async (id) => {
    if(!confirm("Delete this specific record?")) return;
    try {
      await fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' });
      setLogs(logs.filter(log => log._id !== id));
    } catch (error) {
      alert("Failed to delete");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("⚠️ WARNING: This will delete ALL attendance records from the database.")) return;
    try {
      await fetch(`${API_URL}/api/history/all`, { method: 'DELETE' });
      setLogs([]);
      alert("History cleared.");
    } catch (error) {
      alert("Failed to clear history");
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentId.includes(searchTerm);

    const isMyClass = myClasses.includes(log.className);
    return matchesSearch && isMyClass;
  });

  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const topic = log.className || "Unknown Class";
    if (!groups[topic]) groups[topic] = [];
    groups[topic].push(log);
    return groups;
  }, {});

  const downloadClassReport = (classLogs, className) => {
    const ws = XLSX.utils.json_to_sheet(classLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${className}_Attendance.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
            <p className="text-gray-500 mt-1">Viewing classes started on this device.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {filteredLogs.length > 0 && (
              <button onClick={handleDeleteAll} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-600 px-5 py-3 rounded-xl font-bold hover:bg-red-200 transition-colors shadow-sm active:scale-95">
                <Trash2 size={18} /> Clear Database
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center gap-3 sticky top-20 z-10">
          <Search className="text-gray-400" />
          <input type="text" placeholder="Search..." className="flex-grow outline-none text-gray-700 font-medium bg-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading records...</div>
        ) : Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-20 flex flex-col items-center text-gray-400">
            <AlertTriangle size={48} className="mb-4 text-gray-300" />
            <p className="font-medium text-gray-600">No classes found on this device.</p>
            <p className="text-sm mt-2">Start a session to see data here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedLogs).map(([className, classLogs]) => (
              <div key={className} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg text-white"><Layers size={20} /></div>
                    <div><h2 className="text-xl font-bold text-gray-900">{className}</h2><p className="text-sm text-gray-500">{classLogs.length} Students Present</p></div>
                  </div>
                  <button onClick={() => downloadClassReport(classLogs, className)} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md text-sm active:scale-95">
                    <Download size={16} /> Export {className}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-gray-400 text-xs uppercase tracking-wider border-b border-gray-50">
                        <th className="p-5 font-semibold pl-8">Student Name</th>
                        <th className="p-5 font-semibold">Student ID</th>
                        <th className="p-5 font-semibold">Check-in Time</th>
                        <th className="p-5 font-semibold text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {classLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-blue-50/50 transition-colors group">
                          <td className="p-5 pl-8"><div className="flex items-center gap-3"><div className="bg-gray-100 p-2 rounded-full text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors"><User size={14} /></div><span className="font-bold text-gray-800">{log.studentName}</span></div></td>
                          <td className="p-5 text-gray-600 font-mono text-sm">{log.studentId}</td>
                          <td className="p-5 text-gray-500 text-sm"><div className="flex items-center gap-2"><Calendar size={14} />{new Date(log.checkInTime).toLocaleString()}</div></td>
                          <td className="p-5 text-right pr-8"><button onClick={() => handleDelete(log._id)} className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
