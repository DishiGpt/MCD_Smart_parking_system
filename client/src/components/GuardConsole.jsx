import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { toast } from 'react-toastify';

const GuardConsole = () => {
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
  const [guardName] = useState('Guard-' + Math.random().toString(36).substr(2, 5).toUpperCase());
  const [parkingLot] = useState('Main Gate Parking');
  const [loading, setLoading] = useState(false);
  const scanIntervalRef = useRef(null);

  // Camera Health & Manual Entry Control (OCR-independent)
  const [cameraStatus, setCameraStatus] = useState('INITIALIZING');
  const [manualEntryEnabled, setManualEntryEnabled] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

  useEffect(() => {
    // Manual entry is enabled ONLY when camera truly fails
    const shouldEnableManual = cameraStatus !== 'OK' && cameraStatus !== 'INITIALIZING';
    setManualEntryEnabled(shouldEnableManual);
    
    if (shouldEnableManual) {
      console.log('🔓 Manual entry ENABLED - Camera failure:', cameraStatus);
    } else {
      console.log('🔒 Manual entry LOCKED - Camera operational');
    }
  }, [cameraStatus]);

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
        toast.success(`Vehicle ${plateNumber} Logged`);
        setTimeout(() => fetchScanHistory(), 1000);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [mode, parkingLot, API_BASE, fetchScanHistory]);

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
    if (!manualEntryEnabled) {
      toast.error('Manual entry locked. Camera system is operational.');
      return;
    }
    setShowManualModal(true);
  };

  const handleManualExitClick = () => {
    if (!manualEntryEnabled) {
      toast.error('Manual exit locked. Camera system is operational.');
      return;
    }
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
          cameraStatus: cameraStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.warning(`Manual Entry: ${manualVehicle.toUpperCase()} Logged (${manualReason})`);
        setManualVehicle('');
        setManualReason('CAMERA_GLITCH');
        setShowManualModal(false);
        setTimeout(() => fetchScanHistory(), 1000);
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
      const response = await fetch(`${API_BASE}/manual-exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: manualExitVehicle.toUpperCase(),
          parkingLotName: parkingLot,
          reason: manualExitReason,
          guardName: guardName,
          cameraStatus: cameraStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Manual Exit: ${manualExitVehicle.toUpperCase()} - Fee: Rs.${data.transaction?.fee || 0}`);
        setManualExitVehicle('');
        setManualExitReason('CAMERA_GLITCH');
        setShowManualExitModal(false);
        setTimeout(() => fetchScanHistory(), 1000);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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
              disabled={!manualEntryEnabled}
              className={`font-bold py-4 rounded-lg transition-all text-sm shadow-lg border-2 ${
                manualEntryEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 cursor-pointer'
                  : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-60'
              }`}
            >
              {manualEntryEnabled ? (
                <>
                  MANUAL ENTRY<br />
                  <span className="text-xs text-gray-200">(Enabled)</span>
                </>
              ) : (
                <>
                  ENTRY LOCKED<br />
                  <span className="text-xs text-gray-400">(Camera OK)</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualExitClick}
              disabled={!manualEntryEnabled}
              className={`font-bold py-4 rounded-lg transition-all text-sm shadow-lg border-2 ${
                manualEntryEnabled
                  ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-500 cursor-pointer'
                  : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-60'
              }`}
            >
              {manualEntryEnabled ? (
                <>
                  MANUAL EXIT<br />
                  <span className="text-xs text-gray-200">(Enabled)</span>
                </>
              ) : (
                <>
                  EXIT LOCKED<br />
                  <span className="text-xs text-gray-400">(Camera OK)</span>
                </>
              )}
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
    </div>
  );
};

export default GuardConsole;
