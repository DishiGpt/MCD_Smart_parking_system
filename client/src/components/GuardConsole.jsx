import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import GuardAuth from './GuardAuth';
import { useAuth } from '../context/AuthContext';

const GuardConsole = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  // Session Management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [showEndShiftModal, setShowEndShiftModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [latestSessionDetails, setLatestSessionDetails] = useState(null);
  
  const webcamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);
  const [mode, setMode] = useState('ENTRY');
  const [lastScanned, setLastScanned] = useState(null);
  const [scannedPlates, setScannedPlates] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showManualExitModal, setShowManualExitModal] = useState(false);
  const [manualVehicle, setManualVehicle] = useState('');
  const [manualExitVehicle, setManualExitVehicle] = useState('');
  const [manualReason, setManualReason] = useState('CAMERA_GLITCH');
  const [manualExitReason, setManualExitReason] = useState('CAMERA_GLITCH');
  const [loading, setLoading] = useState(false);
  const scanIntervalRef = useRef(null);

  // Camera Health (OCR-independent)
  const [cameraStatus, setCameraStatus] = useState('INITIALIZING');
  
  // Payment Modal for Exit
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingExitData, setPendingExitData] = useState(null);

  // Success Countdown States
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [successData, setSuccessData] = useState(null);
  const countdownTimerRef = useRef(null);

  // Entry Success Countdown States
  const [entrySuccess, setEntrySuccess] = useState(false);
  const [entrySuccessData, setEntrySuccessData] = useState(null);
  const [entryCountdown, setEntryCountdown] = useState(10);
  const entryCountdownTimerRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Extract session data (with defaults for hooks)
  const guardName = sessionData?.guardId || 'Unknown';
  const parkingLot = sessionData?.parkingLot || 'Main Gate Parking';
  const sessionId = sessionData?.sessionId;

  // Handle successful login
  const handleLoginSuccess = (data) => {
    setSessionData(data);
    setIsAuthenticated(true);
    // Save to localStorage for persistence across reloads
    localStorage.setItem('guardSession', JSON.stringify(data));
    // Update AuthContext
    login('GUARD', data.guardId);
    toast.success(`Shift started! Session ID: ${data.sessionId}`);
  };

  // Restore session on component mount
  useEffect(() => {
    const restoreSession = async () => {
      const savedSession = localStorage.getItem('guardSession');
      if (savedSession) {
        try {
          const parsedSession = JSON.parse(savedSession);
          
          // Validate session is still active with backend
          const response = await fetch(`${API_BASE}/guard/active-session/${parsedSession.guardId}`);
          const data = await response.json();
          
          if (data.success && data.hasActiveSession && data.session) {
            // Session is still active, restore it
            const restoredSession = {
              sessionId: data.session.sessionId,
              guardId: data.session.guardId,
              parkingLot: data.session.parkingLot,
              systemHealth: data.session.systemHealthAtStart,
              openingCash: data.session.openingCash
            };
            setSessionData(restoredSession);
            setIsAuthenticated(true);
            // Also restore AuthContext user state
            login('GUARD', data.session.guardId);
            toast.success('Session restored! Welcome back.', { autoClose: 3000 });
          } else {
            // Session no longer active, clear localStorage
            localStorage.removeItem('guardSession');
            if (data.hasActiveSession === false) {
              toast.info('Previous session has ended. Please login again.');
            }
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          localStorage.removeItem('guardSession');
        }
      }
    };
    
    restoreSession();
  }, [API_BASE, login]);

  const startCountdown = (onComplete) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(10);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startEntryCountdown = (onComplete) => {
    if (entryCountdownTimerRef.current) {
      clearInterval(entryCountdownTimerRef.current);
    }
    setEntryCountdown(10);
    entryCountdownTimerRef.current = setInterval(() => {
      setEntryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(entryCountdownTimerRef.current);
          entryCountdownTimerRef.current = null;
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (entryCountdownTimerRef.current) {
        clearInterval(entryCountdownTimerRef.current);
      }
    };
  }, []);

  const fetchScanHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scan-history?parkingLotName=${parkingLot}&limit=20`);
      const data = await response.json();
      if (data.success && data.scans) {
        setScannedPlates(data.scans);
      }
    } catch (error) {
      console.error('Error fetching scan history:', error);
    }
  }, [parkingLot, API_BASE]);

  useEffect(() => {
    fetchScanHistory();
    const intervalId = setInterval(fetchScanHistory, 5000);
    return () => clearInterval(intervalId);
  }, [fetchScanHistory]);

  // Manual entry is ALWAYS enabled to handle muddy plates and edge cases

  const handleCameraReady = useCallback(() => {
    console.log('✅ Camera ready and operational');
    setCameraStatus('OK');
  }, []);

  const handleCameraError = useCallback((error) => {
    console.error('❌ Camera error:', error);
    
    if (error?.name === 'NotAllowedError' || error?.message?.includes('Permission')) {
      setCameraStatus('PERMISSION_DENIED');
      toast.error('Camera permission denied. Manual entry enabled.');
    } else if (error?.name === 'NotFoundError') {
      setCameraStatus('NO_CAMERA');
      toast.error('No camera detected. Manual entry enabled.');
    } else {
      setCameraStatus('STREAM_ERROR');
      toast.error('Camera stream error. Manual entry enabled.');
    }
  }, []);

  const handlePlateDetected = useCallback(async (plateNumber) => {
    setLastScanned({ number: plateNumber, time: Date.now() });
    setLoading(true);

    try {
      if (mode === 'ENTRY') {
        // Process ENTRY immediately
        const response = await fetch(`${API_BASE}/entry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleNumber: plateNumber, parkingLotName: parkingLot, sessionId })
        });

        const data = await response.json();

        if (data.success) {
          toast.success(`Vehicle ${plateNumber} Entry Logged`);
          setEntrySuccessData({ vehicleNumber: plateNumber });
          setEntrySuccess(true);
          startEntryCountdown(() => {
            setEntrySuccess(false);
            setEntrySuccessData(null);
            fetchScanHistory();
          });
          // Also fetch again after 1 second to ensure database updates are reflected
          setTimeout(() => fetchScanHistory(), 1000);
        } else {
          // Show error with more context
          toast.error(`${plateNumber}: ${data.message}`);
          // Still refresh scan history to show current state
          fetchScanHistory();
        }
      } else {
        // For EXIT, first calculate fee then show payment modal
        const response = await fetch(`${API_BASE}/calculate-fee`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleNumber: plateNumber })
        });

        const data = await response.json();

        if (data.success) {
          const fee = data.fee || 0;
          // Show payment modal instead of immediately processing
          setPendingExitData({ vehicleNumber: plateNumber, fee });
          setShowPaymentModal(true);
        } else {
          toast.error(data.message || 'Vehicle not found or fee calculation failed');
        }
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [mode, parkingLot, API_BASE, fetchScanHistory, sessionId]);

  const scanPlate = useCallback(async () => {
    try {
      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) return;

      console.log('📸 Running OCR scan...');
      const { data } = await Tesseract.recognize(screenshot, 'eng');
      const text = data.text.toUpperCase();
      console.log('📝 OCR completed:', text.substring(0, 100));

      const plateRegex = /[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}|\b[A-Z]{2,3}\d{2,4}[A-Z]{1,3}\b/g;
      const matches = text.match(plateRegex);

      if (matches && matches.length > 0) {
        const plate = matches[0].replace(/\s+/g, '').trim();
        console.log('✅ Plate detected:', plate);
        
        // Avoid duplicate scans within 5 seconds
        if (lastScanned && lastScanned.number === plate && Date.now() - lastScanned.time < 5000) {
          console.log('⏭️ Duplicate ignored');
          return;
        }

        handlePlateDetected(plate);
      } else {
        console.log('ℹ️ No plate detected in this frame - will retry');
        // NOTE: Not detecting a plate is NORMAL, not a failure
        // OCR will keep trying automatically every 2 seconds
      }
    } catch (error) {
      console.error('⚠️ OCR error (will retry):', error.message);
      // NOTE: OCR errors are logged but do NOT affect camera health
      // Manual entry is NOT enabled due to OCR issues
    }
  }, [lastScanned, handlePlateDetected]);

  useEffect(() => {
    if (!isScanning || !webcamRef.current) return;

    scanIntervalRef.current = setInterval(() => scanPlate(), 2000);
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isScanning, scanPlate]);

  const handleManualEntryClick = () => {
    setShowManualModal(true);
  };

  const handleManualExitClick = () => {
    setShowManualExitModal(true);
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!manualVehicle.trim()) {
      toast.warning('Please enter a vehicle number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/manual-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: manualVehicle.toUpperCase(),
          parkingLotName: parkingLot,
          reason: manualReason,
          guardName: guardName,
          cameraStatus: cameraStatus,
          sessionId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.warning(`Manual Entry: ${manualVehicle.toUpperCase()} Logged (${manualReason})`);
        const vehicleNum = manualVehicle.toUpperCase();
        setEntrySuccessData({ vehicleNumber: vehicleNum });
        setManualVehicle('');
        setManualReason('CAMERA_GLITCH');
        setShowManualModal(false);
        setEntrySuccess(true);
        startEntryCountdown(() => {
          setEntrySuccess(false);
          setEntrySuccessData(null);
          fetchScanHistory();
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualExit = async (e) => {
    e.preventDefault();
    if (!manualExitVehicle.trim()) {
      toast.warning('Please enter a vehicle number');
      return;
    }

    setLoading(true);

    try {
      // First calculate the fee
      const response = await fetch(`${API_BASE}/calculate-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNumber: manualExitVehicle.toUpperCase() })
      });

      const data = await response.json();

      if (data.success) {
        const fee = data.fee || 0;
        // Show payment modal with manual exit details
        setPendingExitData({ 
          vehicleNumber: manualExitVehicle.toUpperCase(), 
          fee,
          isManual: true,
          reason: manualExitReason
        });
        setShowPaymentModal(true);
        setShowManualExitModal(false);
      } else {
        toast.error(data.message || 'Vehicle not found');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirmed = async (paymentMode) => {
    if (!pendingExitData) return;

    setLoading(true);

    try {
      const endpoint = pendingExitData.isManual ? '/manual-exit' : '/exit';
      const body = pendingExitData.isManual 
        ? {
            vehicleNumber: pendingExitData.vehicleNumber,
            parkingLotName: parkingLot,
            reason: pendingExitData.reason,
            guardName: guardName,
            cameraStatus: cameraStatus,
            paymentMode,
            sessionId
          }
        : {
            vehicleNumber: pendingExitData.vehicleNumber,
            paymentMode,
            sessionId
          };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Vehicle ${pendingExitData.vehicleNumber} Exit - Fee: ₹${pendingExitData.fee} (${paymentMode})`);
        setSuccessData({
          vehicleNumber: pendingExitData.vehicleNumber,
          fee: pendingExitData.fee,
          paymentMode
        });
        setManualExitVehicle('');
        setManualExitReason('CAMERA_GLITCH');
        setPaymentSuccess(true);
        startCountdown(() => {
          setPaymentSuccess(false);
          setShowPaymentModal(false);
          setPendingExitData(null);
          setSuccessData(null);
          fetchScanHistory();
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEndShiftModal = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/guard/active-session/${guardName}`);
      const data = await response.json();
      if (data.success && data.hasActiveSession && data.session) {
        setLatestSessionDetails(data.session);
      }
    } catch (err) {
      console.error('Error fetching session details for end shift:', err);
    } finally {
      setLoading(false);
      setShowEndShiftModal(true);
    }
  };

  const handleEndShift = async (e) => {
    e.preventDefault();
    
    if (!closingCash || parseFloat(closingCash) < 0) {
      toast.error('Please enter valid closing cash amount');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/guard/end-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          closingCash: parseFloat(closingCash)
        })
      });

      const data = await response.json();

      if (data.success) {
        const settlement = data.settlement;
        const shortage = settlement.cashShortage || 0;
        
        if (shortage > 0) {
          toast.warning(`Shift ended. Cash shortage: ₹${shortage}`, { autoClose: 8000 });
        } else if (shortage < 0) {
          toast.info(`Shift ended. Cash surplus: ₹${Math.abs(shortage)}`, { autoClose: 8000 });
        } else {
          toast.success('Shift ended. Cash reconciliation perfect!', { autoClose: 5000 });
        }
        
        // Logout after short delay
        setTimeout(() => {
          setIsAuthenticated(false);
          setSessionData(null);
          setShowEndShiftModal(false);
          // Clear localStorage
          localStorage.removeItem('guardSession');
          // Clear AuthContext
          logout();
          // Redirect to central login page
          navigate('/login');
        }, 2000);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show GuardAuth if not authenticated
  if (!isAuthenticated) {
    return <GuardAuth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      <div className="bg-gray-800 border-b-2 border-red-500 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-red-500">GUARD CONSOLE</h1>
            <p className="text-sm text-gray-400">ANPR Scanning & Manual Override</p>
          </div>
          <div className="flex gap-2">
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <p className="text-xs text-gray-300">Guard ID</p>
              <p className="font-mono text-lg font-bold">{guardName}</p>
            </div>
            <div className="bg-gray-700 px-4 py-2 rounded-lg">
              <p className="text-xs text-gray-300">Parking Lot</p>
              <p className="font-mono text-lg font-bold">{parkingLot}</p>
            </div>
            <button
              onClick={handleOpenEndShiftModal}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold transition-all shadow-lg"
            >
              END SHIFT
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col bg-black rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-mono text-sm">{isScanning ? 'LIVE SCANNING' : 'PAUSED'}</span>
            </div>
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isScanning ? 'PAUSE' : 'RESUME'}
            </button>
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              height="100%"
              videoConstraints={{ facingMode: 'environment', width: 1280, height: 720 }}
              style={{ objectFit: 'cover' }}
              onUserMedia={handleCameraReady}
              onUserMediaError={handleCameraError}
            />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin border-4 border-gray-600 border-t-green-500 rounded-full w-12 h-12"></div>
              </div>
            )}
            
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg border-2 border-gray-600">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  cameraStatus === 'OK' ? 'bg-green-500 animate-pulse' :
                  cameraStatus === 'INITIALIZING' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500 animate-pulse'
                }`}></div>
                <div className="text-xs">
                  <p className="text-white font-bold">
                    {cameraStatus === 'OK' && 'CAMERA OK'}
                    {cameraStatus === 'INITIALIZING' && 'INITIALIZING'}
                    {cameraStatus === 'NO_CAMERA' && 'NO CAMERA'}
                    {cameraStatus === 'PERMISSION_DENIED' && 'PERMISSION DENIED'}
                    {cameraStatus === 'STREAM_ERROR' && 'STREAM ERROR'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-green-500 p-4 shadow-lg">
            {entrySuccess && entrySuccessData ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-green-400 text-center">✅ Entry Successful</p>
                <div className="bg-gray-700 px-4 py-3 rounded-lg border-2 border-green-500">
                  <p className="text-4xl font-mono font-bold text-green-400 text-center">{entrySuccessData.vehicleNumber}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-yellow-400 font-semibold mb-1">Gate open</p>
                  <p className="text-5xl font-bold text-white animate-pulse">{entryCountdown}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2">LAST SCANNED VEHICLE</p>
                {lastScanned ? (
                  <div className="space-y-2">
                    <div className="bg-gray-700 px-4 py-3 rounded-lg border-2 border-green-500">
                      <p className="text-4xl font-mono font-bold text-green-400">{lastScanned.number}</p>
                    </div>
                    <p className="text-sm text-gray-300">{new Date(lastScanned.time).toLocaleTimeString()}</p>
                  </div>
                ) : (
                  <div className="bg-gray-700 px-4 py-6 rounded-lg text-center text-gray-400">
                    <p className="text-lg">Waiting for scan...</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-3 border-2 border-blue-500">
            <p className="text-xs text-gray-400 mb-2">SCANNER MODE</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('ENTRY')}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'ENTRY' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ENTRY
              </button>
              <button
                onClick={() => setMode('EXIT')}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'EXIT' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                EXIT
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleManualEntryClick}
              className="bg-red-600 hover:bg-red-700 text-white border-red-500 cursor-pointer font-bold py-4 rounded-lg transition-all text-sm shadow-lg border-2"
            >
              MANUAL ENTRY<br />
              <span className="text-xs text-gray-200">(Always Available)</span>
            </button>

            <button
              onClick={handleManualExitClick}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500 cursor-pointer font-bold py-4 rounded-lg transition-all text-sm shadow-lg border-2"
            >
              MANUAL EXIT<br />
              <span className="text-xs text-gray-200">(Always Available)</span>
            </button>
          </div>

          <div className="flex-1 bg-gray-800 rounded-lg border-2 border-gray-700 p-3 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2 sticky top-0 bg-gray-800">SCAN HISTORY</p>
            <div className="space-y-2">
              {scannedPlates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No scans yet</p>
              ) : (
                scannedPlates.map((scan, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg text-xs font-mono border-l-4 ${
                      scan.status === 'FLAGGED'
                        ? 'bg-red-900/20 border-red-500 text-red-300'
                        : 'bg-green-900/20 border-green-500 text-green-300'
                    }`}
                  >
                    <p className="font-bold">{scan.plate}</p>
                    <p className="text-gray-400">{scan.time} - {scan.method}</p>
                    {scan.reason && <p className="text-yellow-400">Reason: {scan.reason}</p>}
                    {scan.fee > 0 && <p className="text-blue-300">Fee: Rs.{scan.fee}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border-2 border-red-500 shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">MANUAL ENTRY FORM</h2>

            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Vehicle Number Plate</label>
                <input
                  type="text"
                  value={manualVehicle}
                  onChange={(e) => setManualVehicle(e.target.value.toUpperCase())}
                  placeholder="e.g., DL01AB1234"
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono text-lg focus:outline-none focus:border-red-500 placeholder-gray-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Failure Reason</label>
                <select
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-red-500"
                  disabled={loading}
                >
                  <option value="CAMERA_GLITCH">Camera Glitch</option>
                  <option value="SERVER_TIMEOUT">Server Timeout</option>
                  <option value="SYSTEM_FAILURE">System Failure</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">Entry By</p>
                <p className="font-mono font-bold text-gray-300">{guardName}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualModal(false);
                    setManualVehicle('');
                    setManualReason('CAMERA_GLITCH');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading || !manualVehicle.trim()}
                >
                  {loading ? 'LOGGING...' : 'LOG ENTRY'}
                </button>
              </div>

              <p className="text-xs text-yellow-400 text-center mt-4">
                This entry will be flagged in the system for admin review.
              </p>
            </form>
          </div>
        </div>
      )}

      {showManualExitModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border-2 border-orange-500 shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-orange-500 mb-4">MANUAL EXIT FORM</h2>

            <form onSubmit={handleManualExit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Vehicle Number Plate</label>
                <input
                  type="text"
                  value={manualExitVehicle}
                  onChange={(e) => setManualExitVehicle(e.target.value.toUpperCase())}
                  placeholder="e.g., DL01AB1234"
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono text-lg focus:outline-none focus:border-orange-500 placeholder-gray-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Failure Reason</label>
                <select
                  value={manualExitReason}
                  onChange={(e) => setManualExitReason(e.target.value)}
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-orange-500"
                  disabled={loading}
                >
                  <option value="CAMERA_GLITCH">Camera Glitch</option>
                  <option value="SERVER_TIMEOUT">Server Timeout</option>
                  <option value="SYSTEM_FAILURE">System Failure</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">Exit By</p>
                <p className="font-mono font-bold text-gray-300">{guardName}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualExitModal(false);
                    setManualExitVehicle('');
                    setManualExitReason('CAMERA_GLITCH');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading || !manualExitVehicle.trim()}
                >
                  {loading ? 'PROCESSING...' : 'LOG EXIT'}
                </button>
              </div>

              <p className="text-xs text-yellow-400 text-center mt-4">
                This exit will be flagged in the system for admin review.
              </p>
            </form>
          </div>
        </div>
      )}

      {showEndShiftModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border-2 border-red-500 shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">END SHIFT</h2>

            <form onSubmit={handleEndShift} className="space-y-4">
              <div className="bg-gray-800 px-4 py-3 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Guard ID:</span>
                  <span className="font-mono font-bold">{guardName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session ID:</span>
                  <span className="font-mono text-xs">{sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Opening Cash:</span>
                  <span className="font-bold text-green-400">₹{latestSessionDetails?.openingCash || sessionData?.openingCash || 0}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 text-xs">
                  <span className="text-gray-400">CASH Collected:</span>
                  <span className="font-bold text-blue-400">₹{latestSessionDetails?.currentCashExpected || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Expected UPI:</span>
                  <span className="font-bold text-indigo-400">₹{latestSessionDetails?.upiCollected || 0}</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 font-bold">
                  <span className="text-white">Expected Closing Cash:</span>
                  <span className="text-yellow-400">
                    ₹{(latestSessionDetails?.openingCash || sessionData?.openingCash || 0) + (latestSessionDetails?.currentCashExpected || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Actual Closing Cash in Drawer (Must match ₹{(latestSessionDetails?.openingCash || sessionData?.openingCash || 0) + (latestSessionDetails?.currentCashExpected || 0)})
                </label>
                <input
                  type="number"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder={`Enter ₹${(latestSessionDetails?.openingCash || sessionData?.openingCash || 0) + (latestSessionDetails?.currentCashExpected || 0)} to close`}
                  step="0.01"
                  min="0"
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono text-lg focus:outline-none focus:border-red-500 placeholder-gray-500"
                  disabled={loading}
                />
              </div>

              <div className="bg-yellow-900/20 border-l-4 border-yellow-500 px-4 py-3 rounded">
                <p className="text-yellow-400 text-sm">
                  ⚠️ System will auto-calculate expected cash and detect any shortage/surplus
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEndShiftModal(false);
                    setClosingCash('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
                  disabled={loading}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading || !closingCash}
                >
                  {loading ? 'PROCESSING...' : 'END SHIFT'}
                </button>
              </div>

              <p className="text-xs text-red-400 text-center mt-4">
                ⚠️ This will log you out and close your session
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal for Exit */}
      {showPaymentModal && pendingExitData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border-2 border-yellow-500 shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-yellow-500 mb-4">💰 Payment Collection</h2>

            {paymentSuccess && successData ? (
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-900/30 border-2 border-green-500 rounded-full flex items-center justify-center text-4xl animate-bounce">
                    ✅
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-500">Payment Successful</h3>
                  <p className="text-gray-400 text-sm mt-1">Gate is opening...</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 font-mono space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vehicle:</span>
                    <span className="text-white font-bold">{successData.vehicleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Paid:</span>
                    <span className="text-green-400 font-bold">₹{successData.fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Method:</span>
                    <span className="text-blue-400 font-bold">{successData.paymentMode}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  Closing automatically in <span className="font-bold text-white text-lg">{countdown}</span> seconds
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-800 px-6 py-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Vehicle Number</p>
                  <p className="text-3xl font-mono font-bold text-white">{pendingExitData.vehicleNumber}</p>
                </div>

                <div className="bg-yellow-900/30 border-2 border-yellow-500 px-6 py-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Parking Fee</p>
                  <p className="text-4xl font-bold text-yellow-400">₹{pendingExitData.fee}</p>
                </div>

                <div className="bg-gray-800 px-4 py-3 rounded-lg">
                  <p className="text-yellow-400 text-sm font-semibold mb-2">⚠️ Collect Payment Before Opening Gate</p>
                  <p className="text-gray-400 text-xs">Select payment method after receiving payment</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePaymentConfirmed('CASH')}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 flex flex-col items-center gap-2"
                  >
                    <span className="text-3xl">💵</span>
                    <span>Cash Received</span>
                  </button>

                  <button
                    onClick={() => handlePaymentConfirmed('UPI')}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg disabled:opacity-50 flex flex-col items-center gap-2"
                  >
                    <span className="text-3xl">📱</span>
                    <span>UPI Verified</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPendingExitData(null);
                    setLoading(false);
                  }}
                  disabled={loading}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                    <div className="animate-spin border-2 border-gray-600 border-t-yellow-500 rounded-full w-5 h-5"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardConsole;
