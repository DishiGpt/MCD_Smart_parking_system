import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, IndianRupee, Car, BarChart3, Bell, X, Shield, UserPlus, Users, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Scanner from './Scanner';
import GuardAuditPanel from './GuardAuditPanel';
import { toast } from 'react-toastify';

const AdminPortal = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode] = useState('ENTRY');
  const [activeTab, setActiveTab] = useState('staff'); // 'dashboard' | 'guards' | 'staff'
  const [parkingLots, setParkingLots] = useState([]);
 
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

  const API_BASE = axios.defaults.baseURL || '/api';
 
  const refreshData = async () => {
    try {
      setLoading(true);
      const [alertsRes, transactionsRes, statusRes, guardsRes, parkingLotsRes] = await Promise.all([
        axios.get('/api/alerts'),
        axios.get('/api/transactions'),
        axios.get('/api/status'),
        axios.get('/api/guards'),
        axios.get('/api/parking-lots')
      ]);
     
      setAlerts(alertsRes.data.alerts || []);
      setTransactions(transactionsRes.data.transactions || []);
      setStats(transactionsRes.data.stats || {});
      setParkingLots(parkingLotsRes.data.parkingLots || []);
      setGuards(guardsRes.data.guards || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch data from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id) => {
    try {
      await axios.patch(`/api/alerts/${id}/resolve`);
      toast.success('Alert resolved');
      refreshData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  // CREATE - Add new guard
  const handleAddGuard = async (e) => {
    e.preventDefault();
    
    if (!newGuard.name || !newGuard.guardId || !newGuard.password || !newGuard.phoneNumber) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/guards', {
        guardId: newGuard.guardId,
        name: newGuard.name,
        password: newGuard.password,
        phoneNumber: newGuard.phoneNumber,
        assignedParkingLot: newGuard.assignedLot || null,
        status: 'ACTIVE'
      });

      if (response.data.success) {
        setNewGuard({ name: '', guardId: '', password: '', phoneNumber: '', assignedLot: '' });
        toast.success(`Guard ${newGuard.name} added successfully!`);
        refreshData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add guard');
    } finally {
      setLoading(false);
    }
  };

  // UPDATE - Toggle guard status
  const handleToggleStatus = async (guard) => {
    try {
      const newStatus = guard.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await axios.patch(`/api/guards/${guard._id}`, { status: newStatus });
      
      if (response.data.success) {
        toast.info(`${guard.name} status updated to ${newStatus}`);
        refreshData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update guard status');
    }
  };

  // EDIT - Open edit modal
  const handleEditClick = (guard) => {
    setEditingGuard(guard);
    setEditForm({
      name: guard.name,
      phoneNumber: guard.phoneNumber || '',
      assignedLot: guard.assignedParkingLot || '',
      password: '' // Don't pre-fill password for security
    });
    setShowEditModal(true);
  };

  // UPDATE - Submit edit form
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

      // Only include password if it's been changed
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password;
      }

      const response = await axios.put(`/api/guards/${editingGuard._id}`, updateData);
      
      if (response.data.success) {
        toast.success(`Guard ${editForm.name} updated successfully!`);
        setShowEditModal(false);
        setEditingGuard(null);
        setEditForm({ name: '', phoneNumber: '', assignedLot: '', password: '' });
        refreshData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update guard');
    } finally {
      setLoading(false);
    }
  };

  // DELETE - Open delete confirmation modal
  const handleDeleteClick = (guard) => {
    setDeletingGuard(guard);
    setShowDeleteModal(true);
  };

  // DELETE - Confirm deletion
  const handleDeleteConfirm = async () => {
    if (!deletingGuard) return;

    try {
      setLoading(true);
      const response = await axios.delete(`/api/guards/${deletingGuard._id}`);
      
      if (response.data.success) {
        toast.success(`Guard ${deletingGuard.name} deleted successfully`);
        setShowDeleteModal(false);
        setDeletingGuard(null);
        refreshData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete guard');
    } finally {
      setLoading(false);
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

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={18} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('guards')}
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'guards'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield size={18} />
            Guard Audit
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={18} />
            Staff Management
          </button>
        </div>

        {/* STAFF MANAGEMENT TAB */}
        {activeTab === 'staff' ? (
          <div className="space-y-6">
            {/* Add New Guard Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-500" />
                Add New Guard
              </h3>
              <form onSubmit={handleAddGuard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newGuard.name}
                  onChange={(e) => setNewGuard({ ...newGuard, name: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
                <input
                  type="text"
                  placeholder="Guard ID (e.g., GUARD004)"
                  value={newGuard.guardId}
                  onChange={(e) => setNewGuard({ ...newGuard, guardId: e.target.value.toUpperCase() })}
                  className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 font-mono"
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newGuard.password}
                  onChange={(e) => setNewGuard({ ...newGuard, password: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g., +91-9876543210)"
                  value={newGuard.phoneNumber}
                  onChange={(e) => setNewGuard({ ...newGuard, phoneNumber: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
                <select
                  value={newGuard.assignedLot}
                  onChange={(e) => setNewGuard({ ...newGuard, assignedLot: e.target.value })}
                  className="border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Select Parking Lot</option>
                  {parkingLots.map((lot) => (
                    <option key={lot.id} value={lot.name}>{lot.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <UserPlus size={18} />
                  {loading ? 'Adding...' : 'Add Guard'}
                </button>
              </form>
            </div>

            {/* Guards List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Guard ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Assigned Lot</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loading && guards.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin border-2 border-blue-600 border-t-transparent rounded-full w-5 h-5"></div>
                            Loading guards...
                          </div>
                        </td>
                      </tr>
                    ) : guards && guards.length > 0 ? guards.map((guard) => (
                      <tr key={guard._id || guard.guardId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900">
                          {guard._id ? guard._id.slice(-6) : guard.guardId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{guard.name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-slate-700">{guard.guardId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                          {guard.assignedParkingLot || 'Not Assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            guard.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : guard.status === 'INACTIVE'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {guard.status === 'ACTIVE' ? '🟢 ACTIVE' : guard.status === 'INACTIVE' ? '⚫ INACTIVE' : '🔴 SUSPENDED'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatus(guard)}
                              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
                              disabled={loading}
                            >
                              Toggle Status
                            </button>
                            <button
                              onClick={() => handleEditClick(guard)}
                              className="text-green-600 hover:text-green-800 font-medium transition-colors flex items-center gap-1"
                              disabled={loading}
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(guard)}
                              className="text-red-600 hover:text-red-800 font-medium transition-colors flex items-center gap-1"
                              disabled={loading}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          No guards found. Add a new guard to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'guards' ? (
          <GuardAuditPanel />
        ) : (
          <>
            {/* Dashboard content - Stats, Transactions, Charts, Alerts */}
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
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && editingGuard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-blue-600 text-white p-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Edit2 size={20} />
                Edit Guard: {editingGuard.guardId}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingGuard(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  placeholder="+91-9876543210"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Assigned Parking Lot</label>
                <select
                  value={editForm.assignedLot}
                  onChange={(e) => setEditForm({ ...editForm, assignedLot: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Not Assigned</option>
                  {parkingLots.map((lot) => (
                    <option key={lot.id} value={lot.name}>{lot.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingGuard(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Guard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && deletingGuard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-red-600 text-white p-4 rounded-t-xl flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trash2 size={20} />
                Confirm Deletion
              </h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingGuard(null);
                }}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this guard?
                </p>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-bold text-gray-900">{deletingGuard.name}</p>
                  <p className="text-sm text-gray-600 font-mono">{deletingGuard.guardId}</p>
                  <p className="text-sm text-gray-600">{deletingGuard.assignedParkingLot || 'Not Assigned'}</p>
                </div>
                <p className="text-sm text-red-600 mt-4 font-semibold">
                  ⚠️ This action cannot be undone!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingGuard(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Guard
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortal;
