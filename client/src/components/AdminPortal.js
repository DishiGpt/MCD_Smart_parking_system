import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, IndianRupee, Car, BarChart3, Bell, X } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Scanner from './Scanner';

const AdminPortal = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('ENTRY');
  
  const refreshData = async () => {
    try {
      const [alertsRes, transactionsRes, statusRes] = await Promise.all([
        axios.get('/api/alerts'),
        axios.get('/api/transactions'),
        axios.get('/api/status')
      ]);
      
      setAlerts(alertsRes.data.alerts || []);
      setTransactions(transactionsRes.data.transactions || []);
      setStats(transactionsRes.data.stats || {});
      // eslint-disable-next-line no-unused-vars
      const parkingLotStatus = statusRes.data.parkingLots || [];
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id) => {
    try {
      await axios.patch(`/api/alerts/${id}/resolve`);
      refreshData();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  // Mock chart data
  const chartData = [
    { name: '08:00', vehicles: 12 },
    { name: '10:00', vehicles: 45 },
    { name: '12:00', vehicles: 88 },
    { name: '14:00', vehicles: 76 },
    { name: '16:00', vehicles: 65 },
    { name: '18:00', vehicles: 92 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            MCD Enforcement Dashboard
          </h1>
        </div>

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 border-b flex justify-between items-center p-4">
                <h2 className="text-lg font-bold text-gray-800">
                  {scannerMode === 'ENTRY' ? 'Entry Scanner' : 'Exit Scanner'}
                </h2>
                <button
                  onClick={() => setShowScanner(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <Scanner
                  mode={scannerMode}
                  onSuccess={() => {
                    refreshData();
                    // Auto-close after success
                    setTimeout(() => setShowScanner(false), 2000);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-sm font-medium">Daily Revenue</span>
              <IndianRupee className="text-green-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-900">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-sm font-medium">Vehicles Today</span>
              <Car className="text-blue-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.todayCount || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-sm font-medium">Critical Alerts</span>
              <Bell className="text-red-500" size={20} />
            </div>
            <div className="text-2xl font-bold text-red-600">{alerts.filter(a => !a.resolved).length}</div>
            <div className="text-xs text-red-400 mt-1">Requires attention</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 text-sm font-medium">Avg Occupancy</span>
              <div className="h-2 w-2 rounded-full bg-orange-400"></div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats?.occupancyRate || 0}%</div>
          </div>
        </div>

        {/* Active Parking Sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Car size={18} className="text-blue-500" />
              Currently Parked Vehicles
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle Number</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Parking Lot</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Entry Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {transactions.filter(tx => tx.status === 'ACTIVE').length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                      No vehicles currently parked
                    </td>
                  </tr>
                ) : (
                  transactions.filter(tx => tx.status === 'ACTIVE').map((tx) => {
                    const entryTime = new Date(tx.entryTime);
                    const now = new Date();
                    const durationMinutes = Math.floor((now - entryTime) / 60000);
                    const hours = Math.floor(durationMinutes / 60);
                    const minutes = durationMinutes % 60;
                    
                    return (
                      <tr key={tx._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{tx.vehicleNumber}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                          {tx.parkingLot}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {entryTime.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {hours}h {minutes}m
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Occupancy Trends (Today)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="vehicles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                Live Tamper Alerts
              </h3>
              <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">Real-time</span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {alerts.length === 0 && (
                <div className="text-center text-slate-400 py-10">No active alerts. System secure.</div>
              )}
              {alerts.map(alert => (
                <div 
                  key={alert._id} 
                  className={`p-4 rounded-lg border-l-4 ${alert.resolved ? 'bg-slate-50 border-slate-300 opacity-60' : 'bg-red-50 border-red-500'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{alert.type.replace('_', ' ')}</div>
                      <div className="text-xs text-slate-500 mt-1">{alert.location}</div>
                      <div className="text-xs text-slate-400 mt-1">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                    </div>
                    {!alert.resolved ? (
                      <button 
                        onClick={() => handleResolve(alert._id)}
                        className="text-xs bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 px-2 py-1 rounded transition-colors"
                      >
                        Resolve
                      </button>
                    ) : (
                      <CheckCircle size={16} className="text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortal;
