import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const LandingPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  const handleAdminLogin = (e) => {
    e.preventDefault();
    
    // Mock PIN check (1234)
    if (adminPin === '1234') {
      login('ADMIN', 'Admin User');
      toast.success('Admin login successful!');
      navigate('/admin');
    } else {
      toast.error('Invalid PIN. Try 1234');
      setAdminPin('');
    }
  };

  const handleGuardLogin = () => {
    navigate('/guard-login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-16 w-16 text-blue-400" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">
            PARK<span className="text-blue-400">SURE</span>
          </h1>
          <p className="text-xl text-gray-300">MCD Smart Parking Management System</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Admin Login Card */}
          <div 
            className="bg-white/10 backdrop-blur-md border-2 border-blue-400 rounded-2xl p-8 hover:bg-white/20 transition-all cursor-pointer group"
            onClick={() => setShowAdminPinModal(true)}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-blue-500 p-6 rounded-full group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Admin Login</h2>
              <p className="text-gray-300 text-lg">
                Access dashboard, manage parking lots, view analytics and audit logs
              </p>
              <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                Enter Admin Portal
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* Guard Login Card */}
          <div 
            className="bg-white/10 backdrop-blur-md border-2 border-green-400 rounded-2xl p-8 hover:bg-white/20 transition-all cursor-pointer group"
            onClick={handleGuardLogin}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-green-500 p-6 rounded-full group-hover:scale-110 transition-transform">
                <Shield className="h-16 w-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">Guard Login</h2>
              <p className="text-gray-300 text-lg">
                Start shift, scan vehicles, process entries and exits with ANPR system
              </p>
              <button className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                Enter Guard Console
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/user')}
            className="text-gray-300 hover:text-white underline text-lg transition-colors"
          >
            Continue to Driver Portal →
          </button>
        </div>
      </div>

      {/* Admin PIN Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border-2 border-blue-500 shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-center mb-6">
              <Lock className="text-blue-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">Admin Authentication</h2>
            <p className="text-gray-400 text-center text-sm mb-6">Enter your 4-digit PIN</p>

            <form onSubmit={handleAdminLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Enter PIN"
                  maxLength="4"
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-6 py-4 rounded-lg text-center text-2xl font-bold tracking-widest focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Demo PIN: 1234
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPin('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50"
                  disabled={adminPin.length !== 4}
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
