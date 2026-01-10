import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { toast } from 'react-toastify';

const GuardConsole = () => {
  const webcamRef = useRef(null);
  const [isScanning, setIsScanning] = useState(true);
  const [mode, setMode] = useState('ENTRY'); // ENTRY or EXIT
  const [lastScanned, setLastScanned] = useState(null);
  const [scannedPlates, setScannedPlates] = useState([]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualVehicle, setManualVehicle] = useState('');
  const [manualReason, setManualReason] = useState('CAMERA_GLITCH');
  const [guardName] = useState('Guard-' + Math.random().toString(36).substr(2, 5).toUpperCase());
  const [parkingLot] = useState('Main Gate Parking');
  const [loading, setLoading] = useState(false);
  const scanIntervalRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch scan history from server (used in multiple places)
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

  // Fetch scan history on component mount and set up auto-refresh
  useEffect(() => {
    fetchScanHistory();
    // Refresh every 5 seconds to show latest scans from other guards
    const intervalId = setInterval(fetchScanHistory, 5000);
    return () => clearInterval(intervalId);
  }, [fetchScanHistory]);

  // Handle plate detected - extracted as separate function
  const handlePlateDetected = useCallback(async (plateNumber) => {
    setLastScanned({ number: plateNumber, time: Date.now() });
    setLoading(true);

    try {
      const endpoint = mode === 'ENTRY' ? '/entry' : '/exit';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: plateNumber,
          parkingLotName: parkingLot
        })
      });

      const data = await response.json();

      if (data.success) {
        // Show success toast
        toast.success(`✅ Vehicle ${plateNumber} Logged`, {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true
        });

        // Immediately fetch updated history from server (500ms to allow DB write)
        setTimeout(async () => {
          console.log('🔄 Refreshing scan history after plate detection...');
          try {
            const historyResponse = await fetch(`${API_BASE}/scan-history?parkingLotName=${parkingLot}&limit=20`);
            const historyData = await historyResponse.json();
            if (historyData.success && historyData.scans) {
              console.log('✅ Updated scan history:', historyData.scans.length, 'scans');
              setScannedPlates(historyData.scans);
            }
          } catch (error) {
            console.error('Error refreshing scan history:', error);
          }
        }, 500);
      } else {
        toast.error(`❌ ${data.message}`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [mode, parkingLot, API_BASE]);

  // Scan plate function with useCallback to prevent dependencies issues
  const scanPlate = useCallback(async () => {
    try {
      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) {
        console.warn('⚠️ No screenshot available - camera may not be ready');
        return;
      }

      console.log('📸 Capturing screenshot for OCR...');
      const { data } = await Tesseract.recognize(screenshot, 'eng');
      const text = data.text.toUpperCase();
      
      console.log('📝 OCR Text detected:', text.substring(0, 100));

      // RegEx pattern for vehicle number plates (Indian format or alphanumeric)
      const plateRegex = /[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,2}\s?\d{4}|\b[A-Z]{2,3}\d{2,4}[A-Z]{1,3}\b/g;
      const matches = text.match(plateRegex);

      if (matches && matches.length > 0) {
        const plate = matches[0].replace(/\s+/g, '').trim();
        console.log('🎯 Plate detected:', plate);
        
        // Avoid duplicate scans within 5 seconds
        if (lastScanned && lastScanned.number === plate && Date.now() - lastScanned.time < 5000) {
          console.log('⏭️ Duplicate scan ignored (within 5s cooldown)');
          return;
        }

        console.log('✅ Calling handlePlateDetected for:', plate);
        handlePlateDetected(plate);
      } else {
        console.log('❌ No plate pattern matched in text');
      }
    } catch (error) {
      console.error('❌ OCR Error:', error.message);
    }
  }, [lastScanned, handlePlateDetected]);

  // Start ANPR scanning every 2 seconds
  useEffect(() => {
    if (!isScanning || !webcamRef.current) {
      console.log('⏸️ Scanning paused - isScanning:', isScanning, 'webcamRef:', !!webcamRef.current);
      return;
    }

    console.log('🟢 Starting ANPR scan interval...');
    scanIntervalRef.current = setInterval(() => {
      console.log('📹 Scan cycle triggered (every 2s)');
      scanPlate();
    }, 2000);

    return () => {
      console.log('🟡 Clearing scan interval');
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isScanning, scanPlate]);

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!manualVehicle.trim()) {
      toast.warning('⚠️ Please enter a vehicle number', {
        position: 'top-right',
        autoClose: 2000
      });
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
          guardName: guardName
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.warning(`⚠️ Manual Entry: ${manualVehicle.toUpperCase()} Logged (${manualReason})`, {
          position: 'top-right',
          autoClose: 3000
        });

        // Reset form
        setManualVehicle('');
        setManualReason('CAMERA_GLITCH');
        setShowManualModal(false);

        // Immediately fetch updated history from server (500ms to allow DB write)
        setTimeout(async () => {
          console.log('🔄 Refreshing scan history after manual entry...');
          try {
            const historyResponse = await fetch(`${API_BASE}/scan-history?parkingLotName=${parkingLot}&limit=20`);
            const historyData = await historyResponse.json();
            if (historyData.success && historyData.scans) {
              console.log('✅ Updated scan history:', historyData.scans.length, 'scans');
              setScannedPlates(historyData.scans);
            }
          } catch (error) {
            console.error('Error refreshing scan history:', error);
          }
        }, 500);
      } else {
        toast.error(`❌ ${data.message}`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b-2 border-red-500 p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-red-500">🚗 GUARD CONSOLE</h1>
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
          </div>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* LEFT: Camera Feed */}
        <div className="flex-1 flex flex-col bg-black rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl">
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="font-mono text-sm">
                {isScanning ? '🔴 LIVE SCANNING' : '⏸️ PAUSED'}
              </span>
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
            />
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin border-4 border-gray-600 border-t-green-500 rounded-full w-12 h-12"></div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Last Scanned & Controls */}
        <div className="w-96 flex flex-col gap-4 overflow-hidden">
          {/* Last Scanned Vehicle Card */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-green-500 p-4 shadow-lg">
            <p className="text-xs text-gray-400 mb-2">LAST SCANNED VEHICLE</p>
            {lastScanned ? (
              <div className="space-y-2">
                <div className="bg-gray-700 px-4 py-3 rounded-lg border-2 border-green-500">
                  <p className="text-4xl font-mono font-bold text-green-400">{lastScanned.number}</p>
                </div>
                <p className="text-sm text-gray-300">
                  ⏰ {new Date(lastScanned.time).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="bg-gray-700 px-4 py-6 rounded-lg text-center text-gray-400">
                <p className="text-lg">📷 Waiting for scan...</p>
              </div>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="bg-gray-800 rounded-lg p-3 border-2 border-blue-500">
            <p className="text-xs text-gray-400 mb-2">SCANNER MODE</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('ENTRY')}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'ENTRY'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🚪 ENTRY
              </button>
              <button
                onClick={() => setMode('EXIT')}
                className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'EXIT'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🚪 EXIT
              </button>
            </div>
          </div>

          {/* Manual Override Button */}
          <button
            onClick={() => setShowManualModal(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-colors text-lg shadow-lg border-2 border-red-500"
          >
            ⚠️ MANUAL ENTRY<br />
            <span className="text-xs text-gray-200">(System Failure Only)</span>
          </button>

          {/* Scanned History */}
          <div className="flex-1 bg-gray-800 rounded-lg border-2 border-gray-700 p-3 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2 sticky top-0 bg-gray-800">📋 SCAN HISTORY</p>
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
                    <p className="text-gray-400">{scan.time} • {scan.method}</p>
                    {scan.reason && <p className="text-yellow-400">Reason: {scan.reason}</p>}
                    {scan.fee > 0 && <p className="text-blue-300">Fee: ₹{scan.fee}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border-2 border-red-500 shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-500 mb-4">⚠️ MANUAL ENTRY FORM</h2>

            <form onSubmit={handleManualEntry} className="space-y-4">
              {/* Vehicle Number Input */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Vehicle Number Plate
                </label>
                <input
                  type="text"
                  value={manualVehicle}
                  onChange={(e) => setManualVehicle(e.target.value.toUpperCase())}
                  placeholder="e.g., DL01AB1234"
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg font-mono text-lg focus:outline-none focus:border-red-500 placeholder-gray-500"
                  disabled={loading}
                />
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  Failure Reason
                </label>
                <select
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full bg-gray-800 border-2 border-gray-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-red-500"
                  disabled={loading}
                >
                  <option value="CAMERA_GLITCH">📷 Camera Glitch</option>
                  <option value="SERVER_TIMEOUT">🌐 Server Timeout</option>
                  <option value="SYSTEM_FAILURE">⚡ System Failure</option>
                  <option value="OTHER">❓ Other</option>
                </select>
              </div>

              {/* Guard Info (Display Only) */}
              <div className="bg-gray-800 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-400">Entry By</p>
                <p className="font-mono font-bold text-gray-300">{guardName}</p>
              </div>

              {/* Buttons */}
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
                  {loading ? '⏳ LOGGING...' : '✅ LOG ENTRY'}
                </button>
              </div>

              <p className="text-xs text-yellow-400 text-center mt-4">
                ⚠️ This entry will be flagged in the system for admin review.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuardConsole;
