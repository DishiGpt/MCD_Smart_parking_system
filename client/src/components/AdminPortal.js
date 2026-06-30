import React, { useEffect, useState, useCallback } from 'react';
import { 
  AlertTriangle, IndianRupee, Car, BarChart3, 
  Bell, Shield, UserPlus, Users, Edit2, Trash2 
} from 'lucide-react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { toast } from 'react-toastify';

// Ensure these components exist in your components folder
import Scanner from './Scanner';
import GuardAuditPanel from './GuardAuditPanel';

const AdminPortal = () => {
  // API Base URL Configuration
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode] = useState('ENTRY');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'guards' | 'staff'
  const [parkingLots, setParkingLots] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Staff Management State
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newGuard, setNewGuard] = useState({
    name: '',
    guardId: '',
    password: '',
    phoneNumber: '',
    assignedLot: ''
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuard, setEditingGuard] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    assignedLot: '',
    password: ''
  });

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingGuard, setDeletingGuard] = useState(null);

  // 🔄 REFRESH DATA (Fixed Logic)
  const refreshData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      // ✅ FIX: Added 'trendsRes' to capture the 6th API call
      const [alertsRes, transactionsRes, , guardsRes, parkingLotsRes, trendsRes] = await Promise.all([
        axios.get(`${API_BASE}/alerts`),
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/status`),
        axios.get(`${API_BASE}/guards`),
        axios.get(`${API_BASE}/parking-lots`),
        axios.get(`${API_BASE}/occupancy-trends`) // This was missing in the variable list
      ]);
      
      setAlerts(alertsRes.data.alerts || []);
      setTransactions(transactionsRes.data.transactions || []);
      setStats(transactionsRes.data.stats || {});
      setGuards(guardsRes.data.guards || []);
      setParkingLots(parkingLotsRes.data.parkingLots || []);
      
      // ✅ FIX: Set the chart data correctly
      setChartData(trendsRes.data.trends || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      // Only show toast on first load to avoid spamming on auto-refresh
      if(!stats) toast.error('Failed to connect to server');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [API_BASE, stats]);

  useEffect(() => {
    refreshData(true); // Show loader on initial mount
    const interval = setInterval(() => refreshData(false), 30000); // Silent background refresh
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleResolve = async (id) => {
    try {
      await axios.patch(`${API_BASE}/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      refreshData(false); // Silent refresh
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  // --- STAFF MANAGEMENT HANDLERS ---

  const handleAddGuard = async (e) => {
    e.preventDefault();
    if (!newGuard.name || !newGuard.guardId || !newGuard.password || !newGuard.phoneNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/guards`, {
        guardId: newGuard.guardId,
        name: newGuard.name,
        password: newGuard.password,
        phoneNumber: newGuard.phoneNumber,
        assignedParkingLot: newGuard.assignedLot || null,
        status: 'ACTIVE'
      });

      if (response.data.success) {
        toast.success(`Guard ${newGuard.name} added successfully!`);
        setNewGuard({ name: '', guardId: '', password: '', phoneNumber: '', assignedLot: '' });
        refreshData(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add guard');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (guard) => {
    setEditingGuard(guard);
    setEditForm({
      name: guard.name,
      phoneNumber: guard.phoneNumber || '',
      assignedLot: guard.assignedParkingLot || '',
      password: '' 
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name) {
      toast.error('Name is required');
      return;
    }

    try {
      setLoading(true);
      const updateData = {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        assignedParkingLot: editForm.assignedLot || null,
        status: editingGuard.status
      };
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password;
      }

      const response = await axios.put(`${API_BASE}/guards/${editingGuard._id}`, updateData);
      if (response.data.success) {
        toast.success(`Guard ${editForm.name} updated successfully!`);
        setShowEditModal(false);
        setEditingGuard(null);
        setEditForm({ name: '', phoneNumber: '', assignedLot: '', password: '' });
        refreshData(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update guard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (guard) => {
    setDeletingGuard(guard);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGuard) return;
    try {
      setLoading(true);
      const response = await axios.delete(`${API_BASE}/guards/${deletingGuard._id}`);
      if (response.data.success) {
        toast.success(`Guard ${deletingGuard.name} deleted successfully`);
        setShowDeleteModal(false);
        setDeletingGuard(null);
        refreshData(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete guard');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" />
            MCD Enforcement Dashboard
          </h1>
          <div className="text-sm text-slate-500">
             Admin Portal • {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex gap-2">
          {['dashboard', 'guards', 'staff'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-2 capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'dashboard' && <BarChart3 size={18} />}
              {tab === 'guards' && <Shield size={18} />}
              {tab === 'staff' && <Users size={18} />}
              {tab === 'guards' ? 'Guard Audit' : tab === 'staff' ? 'Staff Management' : tab}
            </button>
          ))}
        </div>

        {/* --- STAFF TAB --- */}
        {activeTab === 'staff' ? (
          <div className="space-y-6">
            {/* Add Guard Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" />
                Add New Guard
              </h3>
              <form onSubmit={handleAddGuard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <input
                  type="text" placeholder="Full Name" value={newGuard.name}
                  onChange={(e) => setNewGuard({ ...newGuard, name: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2" required
                />
                <input
                  type="text" placeholder="ID (e.g. GUARD01)" value={newGuard.guardId}
                  onChange={(e) => setNewGuard({ ...newGuard, guardId: e.target.value.toUpperCase() })}
                  className="border border-slate-300 rounded-lg px-4 py-2 font-mono" required
                />
                <input
                  type="password" placeholder="Password" value={newGuard.password}
                  onChange={(e) => setNewGuard({ ...newGuard, password: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2" required
                />
                <input
                  type="tel" placeholder="Phone" value={newGuard.phoneNumber}
                  onChange={(e) => setNewGuard({ ...newGuard, phoneNumber: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2" required
                />
                <select
                  value={newGuard.assignedLot}
                  onChange={(e) => setNewGuard({ ...newGuard, assignedLot: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2"
                >
                  <option value="">Select Lot</option>
                  {parkingLots.map(lot => (
                    <option key={lot.id} value={lot.name}>{lot.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus size={18} /> Add
                </button>
              </form>
            </div>

            {/* Guards Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               {/* ... Keep the same table code you had ... */}
               <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-blue-500" />
                  Registered Guards ({guards.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Guard ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Lot</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {guards.map((guard) => (
                      <tr key={guard._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-sm">{guard.guardId}</td>
                        <td className="px-6 py-4 font-semibold">{guard.name}</td>
                        <td className="px-6 py-4 text-sm">{guard.assignedParkingLot || 'Unassigned'}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 text-xs rounded-full ${guard.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             {guard.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 flex gap-3">
                           <button onClick={() => handleEditClick(guard)} className="text-blue-600"><Edit2 size={16}/></button>
                           <button onClick={() => handleDeleteClick(guard)} className="text-red-600"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        
        /* --- GUARD AUDIT TAB --- */
        ) : activeTab === 'guards' ? (
          <GuardAuditPanel />

        /* --- DASHBOARD TAB --- */
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm font-medium">Daily Revenue</span>
                  <IndianRupee className="text-green-500" size={20} />
                </div>
                <div className="text-2xl font-bold">₹{stats?.totalRevenue?.toLocaleString() || 0}</div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm font-medium">Vehicles Today</span>
                  <Car className="text-blue-500" size={20} />
                </div>
                <div className="text-2xl font-bold">{stats?.todayCount || 0}</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm font-medium">Critical Alerts</span>
                  <Bell className="text-red-500" size={20} />
                </div>
                <div className="text-2xl font-bold text-red-600">{alerts.filter(a => !a.resolved).length}</div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500 text-sm font-medium">Avg Occupancy</span>
                  <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                </div>
                <div className="text-2xl font-bold">{stats?.occupancyRate || 0}%</div>
              </div>
            </div>

            {/* Active Sessions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Car size={18} className="text-blue-500" /> Currently Parked
                </h3>
              </div>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Lot</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.filter(tx => tx.status === 'ACTIVE').map(tx => (
                      <tr key={tx._id}>
                        <td className="px-6 py-4 font-bold">{tx.vehicleNumber}</td>
                        <td className="px-6 py-4 text-sm">{tx.parkingLot}</td>
                        <td className="px-6 py-4 text-sm">{new Date(tx.entryTime).toLocaleTimeString()}</td>
                        <td className="px-6 py-4"><span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">ACTIVE</span></td>
                      </tr>
                    ))}
                    {transactions.filter(tx => tx.status === 'ACTIVE').length === 0 && (
                      <tr><td colSpan="4" className="text-center py-4 text-slate-400">No active vehicles</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Occupancy Trends (Today)</h3>
                {/* ✅ FIX: Added explicit height container to prevent Recharts crash */}
                <div className="h-64 w-full">
                  {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis tick={{fontSize: 12}} />
                        <Tooltip />
                        <Bar dataKey="vehicles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                      Loading Chart Data...
                    </div>
                  )}
                </div>
              </div>

              {/* Alerts Feed */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500" /> Live Alerts
                  </h3>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                  {alerts.map(alert => (
                    <div key={alert._id} className={`p-3 rounded border-l-4 ${alert.resolved ? 'bg-slate-50 border-slate-300' : 'bg-red-50 border-red-500'}`}>
                      <div className="flex justify-between">
                        <div>
                          <div className="font-bold text-sm">{alert.type}</div>
                          <div className="text-xs text-slate-500">{alert.location} • {new Date(alert.timestamp).toLocaleTimeString()}</div>
                        </div>
                        {!alert.resolved && (
                          <button onClick={() => handleResolve(alert._id)} className="text-xs bg-white border px-2 rounded">Resolve</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && <div className="text-center text-slate-400 mt-10">No alerts</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* EDIT & DELETE MODALS (Keep existing implementation) */}
      {showEditModal && editingGuard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Edit Guard</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
               <input className="w-full border p-2 rounded" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
               <input className="w-full border p-2 rounded" value={editForm.phoneNumber} onChange={e => setEditForm({...editForm, phoneNumber: e.target.value})} placeholder="Phone" />
               <input className="w-full border p-2 rounded" type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="New Password (Optional)" />
               <div className="flex gap-2">
                 <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
                 <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">Save</button>
               </div>
            </form>
          </div>
        </div>
      )}
      
      {showDeleteModal && deletingGuard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white p-6 rounded-lg w-96">
             <h3 className="text-lg font-bold text-red-600 mb-2">Confirm Delete</h3>
             <p className="mb-4 text-sm text-gray-600">Are you sure you want to remove {deletingGuard.name}?</p>
             <div className="flex gap-2">
               <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>
               <button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 text-white py-2 rounded">Delete</button>
             </div>
           </div>
        </div>
      )}

      {/* Scanner Modal (Keep existing) */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white p-4 rounded-lg">
              <Scanner mode={scannerMode} onSuccess={() => { refreshData(); setShowScanner(false); }} />
              <button onClick={() => setShowScanner(false)} className="mt-4 w-full bg-gray-200 py-2 rounded">Close</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;