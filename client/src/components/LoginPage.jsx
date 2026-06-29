import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GuardAuth from './GuardAuth';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [guardVerified, setGuardVerified] = useState(false);
  const [guardData, setGuardData] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.role === 'ADMIN') {
          login('ADMIN', 'Administrator');
          navigate('/admin');
        } else if (data.role === 'GUARD') {
          setGuardData({
            guardId: data.guardId,
            guardName: data.guardName,
            assignedParkingLot: data.assignedParkingLot,
            password: password,
          });
          setGuardVerified(true);
        }
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Branding — above card */}
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-white mb-3">
            PARK<span className="text-blue-400">SURE</span>
          </h1>
          <p className="text-xl text-gray-300">
            MCD Smart Parking Management System
          </p>
        </div>

        {/* Login Card */}
        {!guardVerified ? (
          <div className="bg-gray-800 rounded-2xl border-2 border-blue-500 shadow-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <Shield className="text-blue-400" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Staff Login
            </h2>
            <p className="text-gray-400 text-center text-sm mb-8">
              Enter your credentials to continue
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  ID / Guard ID
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin or GUARD001"
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-900 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block" />
                ) : 'Login'}
              </button>
            </form>
          </div>
        ) : (
          /* When role === GUARD, render GuardAuth here with prefill props */
          <GuardAuth
            prefillGuardId={guardData.guardId}
            prefillGuardName={guardData.guardName}
            prefillParkingLot={guardData.assignedParkingLot}
            prefillPassword={guardData.password}
            onLoginSuccess={(sessionData) => {
              localStorage.setItem('guardSession', JSON.stringify({
                sessionId: sessionData.sessionId,
                guardId: sessionData.guardId,
                parkingLot: sessionData.parkingLot,
                systemHealth: sessionData.systemHealth || { camera: 'OK', printer: 'OK', internet: 'OK' },
                openingCash: sessionData.openingCash
              }));
              login('GUARD', guardData.guardId);
              navigate('/guard');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LoginPage;
