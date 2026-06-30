import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

const GuardAuditPanel = () => {
  const [guardSessions, setGuardSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchGuardSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/guard-sessions`);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setGuardSessions(data.sessions || []);
        if (data.sessions.length === 0) {
          toast.info('No guard sessions found. Start a shift in Guard Console first.', { autoClose: 5000 });
        }
      } else {
        toast.error(data.message || 'Failed to fetch guard sessions');
      }
    } catch (error) {
      console.error('Guard Audit Panel Error:', error);
      toast.error(`Cannot connect to server: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchGuardSessions();
  }, [fetchGuardSessions]);

  const getRiskColor = (riskScore) => {
    if (riskScore >= 50) return 'text-red-500 bg-red-900/20 border-red-500';
    if (riskScore >= 30) return 'text-yellow-500 bg-yellow-900/20 border-yellow-500';
    return 'text-green-500 bg-green-900/20 border-green-500';
  };

  const getRiskLabel = (riskScore) => {
    if (riskScore >= 50) return 'HIGH RISK';
    if (riskScore >= 30) return 'MEDIUM';
    return 'LOW';
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'Active';
    const duration = new Date(endTime) - new Date(startTime);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-blue-500 mb-2">GUARD SHIFT AUDIT</h2>
        <p className="text-gray-400">Monitor all guard sessions and detect anomalies</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin border-4 border-gray-600 border-t-blue-500 rounded-full w-12 h-12"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {guardSessions.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-500">No guard sessions found</p>
              </div>
            ) : (
              guardSessions.map((session) => (
                <div
                  key={session._id}
                  className={`bg-gray-800 rounded-lg border-2 ${
                    session.status === 'FLAGGED'
                      ? 'border-red-500'
                      : session.status === 'ACTIVE'
                      ? 'border-green-500'
                      : 'border-gray-700'
                  } p-4 hover:bg-gray-750 transition-colors cursor-pointer`}
                  onClick={() => setSelectedSession(selectedSession?._id === session._id ? null : session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{session.guardId}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            session.status === 'ACTIVE'
                              ? 'bg-green-600 text-white'
                              : session.status === 'FLAGGED'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-600 text-white'
                          }`}
                        >
                          {session.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(session.riskScore)}`}>
                          {getRiskLabel(session.riskScore)} ({session.riskScore})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-400">Session ID</p>
                          <p className="font-mono text-sm">{session.sessionId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Parking Lot</p>
                          <p className="font-semibold">{session.parkingLot}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Duration</p>
                          <p className="font-semibold">{formatDuration(session.startTime, session.endTime)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Transactions</p>
                          <p className="font-semibold text-blue-400">{session.transactionCount?.total || 0}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-gray-900 rounded-lg p-3">
                        <div>
                          <p className="text-xs text-gray-400">Opening Cash</p>
                          <p className="font-bold text-green-400">{formatCurrency(session.openingCash)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Expected Cash</p>
                          <p className="font-bold text-blue-400">{formatCurrency(session.systemCashExpected)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Closing Cash</p>
                          <p className="font-bold text-yellow-400">{formatCurrency(session.closingCash)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Shortage</p>
                          <p className={`font-bold ${session.cashShortage > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {session.cashShortage > 0 ? '-' : '+'}{formatCurrency(Math.abs(session.cashShortage || 0))}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Manual Override %</p>
                          <p className={`font-bold ${session.manualOverrideRate > 20 ? 'text-red-400' : 'text-green-400'}`}>
                            {session.manualOverrideRate?.toFixed(1) || 0}%
                          </p>
                        </div>
                      </div>

                      {selectedSession?._id === session._id && (
                        <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-900 rounded-lg p-3">
                              <p className="text-xs text-gray-400 mb-1">CASH Revenue</p>
                              <p className="text-lg font-bold text-green-400">
                                {formatCurrency(session.revenueBreakdown?.CASH || session.revenueBreakdown?.cash || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-3">
                              <p className="text-xs text-gray-400 mb-1">UPI Revenue</p>
                              <p className="text-lg font-bold text-blue-400">
                                {formatCurrency(session.revenueBreakdown?.UPI || session.revenueBreakdown?.upi || 0)}
                              </p>
                            </div>
                            <div className="bg-gray-900 rounded-lg p-3">
                              <p className="text-xs text-gray-400 mb-1">FASTag Revenue</p>
                              <p className="text-lg font-bold text-purple-400">
                                {formatCurrency(session.revenueBreakdown?.FASTAG || session.revenueBreakdown?.fastag || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="bg-gray-900 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-2">System Health Issues</p>
                            <div className="flex gap-2">
                              {session.systemHealthIssues?.map((issue, idx) => (
                                <span key={idx} className="px-2 py-1 bg-red-900/20 text-red-400 rounded text-xs">
                                  {issue}
                                </span>
                              ))}
                              {!session.systemHealthIssues?.length && (
                                <span className="text-gray-500 text-xs">No issues reported</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <span className="text-xs text-gray-400">
                              Started: {new Date(session.startTime).toLocaleString()}
                            </span>
                            {session.endTime && (
                              <span className="text-xs text-gray-400">
                                | Ended: {new Date(session.endTime).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={fetchGuardSessions}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold transition-colors"
            >
              REFRESH
            </button>
            <p className="text-gray-400 text-sm">
              Total Sessions: {guardSessions.length} | Flagged: {guardSessions.filter(s => s.status === 'FLAGGED').length}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default GuardAuditPanel;
