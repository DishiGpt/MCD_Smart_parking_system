import React, { useState, useEffect } from 'react';
import { Settings, Zap, LogIn, LogOut, AlertOctagon, RefreshCw } from 'lucide-react';
import axios from 'axios';

const SimulatorPortal = () => {
  const [vehicleNum, setVehicleNum] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [lots, setLots] = useState([]);
  const [log, setLog] = useState(null);

  useEffect(() => {
    axios.get('/api/status').then(response => {
      const data = response.data.parkingLots || [];
      setLots(data);
      if (data.length > 0) setSelectedLot(data[0].name);
    });
  }, []);

  const showLog = (type, msg) => {
    setLog({ type, msg });
    setTimeout(() => setLog(null), 4000);
  };

  const handleEntry = async () => {
    if (!vehicleNum) return showLog('error', 'Enter Vehicle Number');
    try {
      await axios.post('/api/entry', {
        vehicleNumber: vehicleNum.toUpperCase(),
        parkingLotName: selectedLot
      });
      showLog('success', `Entry Allowed: ${vehicleNum.toUpperCase()}`);
      setVehicleNum('');
    } catch (e) {
      showLog('error', e.response?.data?.message || e.message);
    }
  };

  const handleExit = async () => {
    if (!vehicleNum) return showLog('error', 'Enter Vehicle Number');
    try {
      const response = await axios.post('/api/exit', {
        vehicleNumber: vehicleNum.toUpperCase()
      });
      showLog('info', `Exit Processed. Fee: ₹${response.data.transaction.fee}`);
      setVehicleNum('');
    } catch (e) {
      showLog('error', e.response?.data?.message || e.message);
    }
  };

  const handleTheftTrigger = async () => {
    try {
      await axios.post('/api/alert', {
        type: 'GHOST_VEHICLE',
        location: selectedLot,
        description: 'Loop detector triggered without RFID scan - Possible unauthorized entry'
      });
      showLog('error', '⚠️ GHOST VEHICLE ALERT DISPATCHED TO ADMIN!');
    } catch (e) {
      showLog('error', e.response?.data?.message || e.message);
    }
  };

  const handleForcedEntry = async () => {
    try {
      await axios.post('/api/alert', {
        type: 'FORCED_ENTRY',
        location: selectedLot,
        description: 'Barrier forced open without authorization'
      });
      showLog('error', '⚠️ FORCED ENTRY DETECTED!');
    } catch (e) {
      showLog('error', e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
          <Settings className="text-blue-400" size={32} />
          <div>
            <h1 className="text-2xl font-bold">Hardware Simulator</h1>
            <p className="text-slate-400 text-sm">IoT Signal Emulation Console</p>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 shadow-lg border border-slate-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <RefreshCw size={18} className="text-slate-400" />
            Sensor Configuration
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Target Parking Lot</label>
              <select 
                value={selectedLot} 
                onChange={(e) => setSelectedLot(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {lots.map(lot => (
                  <option key={lot._id} value={lot.name}>{lot.name} (Occ: {lot.currentOccupancy}/{lot.capacity})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Simulate RFID / OCR Read</label>
              <input 
                type="text" 
                placeholder="Enter License Plate (e.g. DL-10-AB-1234)" 
                value={vehicleNum}
                onChange={(e) => setVehicleNum(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wider"
              />
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Normal Operations */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Standard Operations</h3>
            <div className="space-y-3">
              <button 
                onClick={handleEntry}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogIn size={20} />
                Simulate Valid Entry
              </button>
              <button 
                onClick={handleExit}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LogOut size={20} />
                Simulate Valid Exit
              </button>
            </div>
          </div>

          {/* Anomaly Triggers */}
          <div className="bg-slate-800 p-5 rounded-xl border border-red-900/50">
            <h3 className="text-red-400 text-xs font-bold uppercase mb-4">Tamper / Theft Simulation</h3>
            <div className="space-y-3">
              <button 
                onClick={handleTheftTrigger}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 animate-pulse"
              >
                <Zap size={20} />
                TRIGGER GHOST VEHICLE
              </button>
              <button 
                onClick={handleForcedEntry}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 border border-red-500/30 text-red-200 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <AlertOctagon size={18} />
                Simulate Forced Entry
              </button>
            </div>
            <p className="mt-3 text-[10px] text-slate-500 leading-tight">
              *Simulates Loop Detector triggering without valid RFID/Auth tag. Immediate alert to admin.
            </p>
          </div>
        </div>

        {/* Console Output */}
        {log && (
          <div className={`mt-6 p-4 rounded-lg border flex items-center gap-3 ${
            log.type === 'error' ? 'bg-red-900/50 border-red-500 text-red-200' : 
            log.type === 'success' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-200' : 
            'bg-blue-900/50 border-blue-500 text-blue-200'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              log.type === 'error' ? 'bg-red-500' : log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
            }`} />
            <span className="font-mono text-sm">{log.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulatorPortal;
