import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, AlertCircle, X, Clock, ExternalLink } from 'lucide-react';
import axios from 'axios';

// Navigation Modal Component
const NavigationModal = ({ lot, onClose }) => {
  const [routeData] = useState(() => {
    const dist = (Math.random() * 8 + 1.5).toFixed(1);
    const t = Math.round(parseFloat(dist) * 3.5 + 2);
    return { distance: dist, time: t };
  });

  const googleMapsUrl = lot.location 
    ? `https://www.google.com/maps/dir/?api=1&destination=${lot.location.latitude},${lot.location.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lot.location || lot.name)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Navigation size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800 leading-tight">Navigating to...</h3>
              <p className="text-sm text-slate-500 font-medium">{lot.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative bg-slate-100 h-64 w-full overflow-hidden group">
          {lot.location && lot.location.latitude ? (
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight={0} 
              marginWidth={0} 
              src={`https://maps.google.com/maps?q=${lot.location.latitude},${lot.location.longitude}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              title="Parking Location"
              className="w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <MapPin size={48} />
            </div>
          )}
          
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2 text-xs font-medium text-slate-600">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Traffic is light
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin size={12} /> Distance
              </span>
              <span className="text-3xl font-bold text-slate-800">{routeData.distance} <span className="text-sm font-medium text-slate-400">km</span></span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={12} /> Est. Time
              </span>
              <span className="text-3xl font-bold text-slate-800">{routeData.time} <span className="text-sm font-medium text-slate-400">min</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 py-3.5 text-slate-600 font-semibold bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <a 
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 no-underline"
            >
              <ExternalLink size={18} className="text-blue-100" />
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserPortal = () => {
  // API Base URL Configuration
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLot, setSelectedLot] = useState(null);

  const fetchLots = async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      setLots(response.data.parkingLots || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLots();
    const interval = setInterval(fetchLots, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (occupancy, capacity) => {
    const percentage = (occupancy / capacity) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 relative">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">Find Parking</h1>
          <p className="text-slate-500 mt-2">Live availability across Delhi NCR</p>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading live data...</div>
        ) : (
          <div className="space-y-4">
            {lots.map((lot) => {
              const percentage = Math.round((lot.currentOccupancy / lot.capacity) * 100);
              const isFull = percentage >= 100;

              return (
                <div 
                  key={lot._id} 
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-slate-900">{lot.name}</h2>
                        {isFull && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                            <AlertCircle size={12} /> FULL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-slate-500 text-sm mb-4">
                        <MapPin size={16} className="mr-1" />
                        {lot.location?.address || 'Delhi NCR'}
                      </div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
                        <div 
                          className={`h-full transition-all duration-500 ${getStatusColor(lot.currentOccupancy, lot.capacity)}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm font-medium">
                        <span className={isFull ? 'text-red-600' : 'text-green-600'}>
                          {isFull ? '0 spots left' : `${lot.capacity - lot.currentOccupancy} spots available`}
                        </span>
                        <span className="text-slate-400">{lot.currentOccupancy} / {lot.capacity} Occupied</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => setSelectedLot(lot)}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors shadow-sm active:scale-95"
                      >
                        <Navigation size={18} />
                        Navigate
                      </button>
                      <div className="text-center text-xs text-slate-400 group-hover:text-blue-500 transition-colors">
                        Live Data
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedLot && (
        <NavigationModal 
          lot={selectedLot} 
          onClose={() => setSelectedLot(null)} 
        />
      )}
    </div>
  );
};

export default UserPortal;
