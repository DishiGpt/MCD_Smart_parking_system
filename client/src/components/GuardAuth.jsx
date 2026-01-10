import React, { useState } from 'react';
import { Shield, Camera, Printer, Wifi, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const GuardAuth = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('login'); // 'login' | 'systemCheck' | 'cashSetup'
  const [guardId, setGuardId] = useState('');
  const [password, setPassword] = useState('');
  const [parkingLot, setParkingLot] = useState('Main Gate Parking');
  const [openingCash, setOpeningCash] = useState('');
  const [systemHealth, setSystemHealth] = useState({
    camera: 'OK',
    printer: 'OK',
    internet: 'OK'
  });
  const [loading, setLoading] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // PHASE 1: Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (!guardId.trim() || !password.trim()) {
      toast.error('Please enter Guard ID and Password');
      return;
    }
    setStep('systemCheck');
  };

  // PHASE 2: System Health Check
  const handleSystemCheck = () => {
    const hasFailures = Object.values(systemHealth).some(status => status === 'FAIL');
    
    if (hasFailures) {
      toast.warning('⚠️ System failures detected. Manual mode enabled.', { autoClose: 3000 });
    }
    
    setStep('cashSetup');
  };

  // PHASE 3: Opening Cash & Start Shift
  const handleStartShift = async (e) => {
    e.preventDefault();
    
    if (!openingCash || parseFloat(openingCash) < 0) {
      toast.error('Please enter valid opening cash amount');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/guard/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardId: guardId.toUpperCase(),
          password,
          parkingLot,
          openingCash: parseFloat(openingCash),
          systemHealth
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Shift started successfully!');
        onLoginSuccess({
          sessionId: data.session.sessionId,
          guardId: data.session.guardId,
          parkingLot: data.session.parkingLot,
          systemHealth: data.session.systemHealth,
          openingCash: parseFloat(openingCash)
        });
      } else if (response.status === 400 && data.activeSession) {
        // Guard already has active session, resume it
        toast.info('Resuming your active shift...');
        onLoginSuccess({
          sessionId: data.activeSession.sessionId,
          guardId: data.activeSession.guardId,
          parkingLot: data.activeSession.parkingLot,
          systemHealth: data.activeSession.systemHealthAtStart,
          openingCash: data.activeSession.openingCash
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* STEP 1: LOGIN */}
        {step === 'login' && (
          <div className="bg-gray-800 rounded-2xl border-2 border-blue-500 shadow-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <Shield className="text-blue-400" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white text-center mb-2">Guard Login</h1>
            <p className="text-gray-400 text-center text-sm mb-8">Secure Shift Authentication</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Guard ID</label>
                <input
                  type="text"
                  value={guardId}
                  onChange={(e) => setGuardId(e.target.value.toUpperCase())}
                  placeholder="GUARD001"
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Parking Lot</label>
                <select
                  value={parkingLot}
                  onChange={(e) => setParkingLot(e.target.value)}
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="Main Gate Parking">Main Gate Parking</option>
                  <option value="North Wing Parking">North Wing Parking</option>
                  <option value="South Wing Parking">South Wing Parking</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg"
              >
                Next: System Check
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SYSTEM HEALTH CHECK */}
        {step === 'systemCheck' && (
          <div className="bg-gray-800 rounded-2xl border-2 border-yellow-500 shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">System Health Check</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Camera className="text-blue-400" size={24} />
                  <span className="text-white font-semibold">Camera</span>
                </div>
                <button
                  onClick={() => setSystemHealth({ ...systemHealth, camera: systemHealth.camera === 'OK' ? 'FAIL' : 'OK' })}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    systemHealth.camera === 'OK' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {systemHealth.camera}
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Printer className="text-blue-400" size={24} />
                  <span className="text-white font-semibold">Printer</span>
                </div>
                <button
                  onClick={() => setSystemHealth({ ...systemHealth, printer: systemHealth.printer === 'OK' ? 'FAIL' : 'OK' })}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    systemHealth.printer === 'OK' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {systemHealth.printer}
                </button>
              </div>

              <div className="flex items-center justify-between bg-gray-900 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wifi className="text-blue-400" size={24} />
                  <span className="text-white font-semibold">Internet</span>
                </div>
                <button
                  onClick={() => setSystemHealth({ ...systemHealth, internet: systemHealth.internet === 'OK' ? 'FAIL' : 'OK' })}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    systemHealth.internet === 'OK' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}
                >
                  {systemHealth.internet}
                </button>
              </div>
            </div>

            {Object.values(systemHealth).some(s => s === 'FAIL') && (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
                <p className="text-yellow-200 text-sm">
                  System failures detected. Manual mode will be enabled for this shift.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('login')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSystemCheck}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OPENING CASH */}
        {step === 'cashSetup' && (
          <div className="bg-gray-800 rounded-2xl border-2 border-green-500 shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Opening Cash Balance</h2>
            <p className="text-gray-400 text-center text-sm mb-8">Count cash in drawer before shift</p>

            <form onSubmit={handleStartShift} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Opening Cash Amount (₹)</label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-4 rounded-lg text-2xl font-bold text-center focus:outline-none focus:border-green-500"
                  required
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  This will be used for end-of-shift reconciliation
                </p>
              </div>

              <div className="bg-gray-900 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Guard ID:</span>
                  <span className="text-white font-bold">{guardId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Parking Lot:</span>
                  <span className="text-white font-bold">{parkingLot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">System Status:</span>
                  <span className={`font-bold ${
                    Object.values(systemHealth).every(s => s === 'OK') ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {Object.values(systemHealth).every(s => s === 'OK') ? 'ALL OK' : 'MANUAL MODE'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('systemCheck')}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-all"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Starting...' : '🚀 Start Shift'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuardAuth;
