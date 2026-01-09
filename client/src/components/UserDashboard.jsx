import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

// ============================================
// DUMMY DATA FOR FALLBACK
// ============================================
const DUMMY_PARKING_DATA = [
  {
    _id: '1',
    name: 'Connaught Place Parking',
    totalCapacity: 500,
    currentOccupancy: 350,
    latitude: 28.6305,
    longitude: 77.1854,
  },
  {
    _id: '2',
    name: 'India Gate Lot',
    totalCapacity: 400,
    currentOccupancy: 280,
    latitude: 28.6129,
    longitude: 77.2295,
  },
  {
    _id: '3',
    name: 'Rajpath Garage',
    totalCapacity: 600,
    currentOccupancy: 580,
    latitude: 28.6168,
    longitude: 77.1738,
  },
  {
    _id: '4',
    name: 'South Extension Lot',
    totalCapacity: 300,
    currentOccupancy: 150,
    latitude: 28.5649,
    longitude: 77.2122,
  },
  {
    _id: '5',
    name: 'Khan Market Parking',
    totalCapacity: 250,
    currentOccupancy: 245,
    latitude: 28.5961,
    longitude: 77.2100,
  },
];

// ============================================
// HAVERSINE FORMULA - Calculate distance
// ============================================
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

// ============================================
// CAPACITY COLOR LOGIC
// ============================================
const getOccupancyColor = (occupancy, capacity) => {
  const percentage = (occupancy / capacity) * 100;

  if (percentage < 70) return 'bg-green-500';
  if (percentage < 90) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getOccupancyBg = (occupancy, capacity) => {
  const percentage = (occupancy / capacity) * 100;

  if (percentage < 70) return 'bg-green-50';
  if (percentage < 90) return 'bg-yellow-50';
  return 'bg-red-50';
};

// ============================================
// MAIN COMPONENT
// ============================================
const UserDashboard = () => {
  const [parkingLots, setParkingLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // ============================================
  // FETCH USER LOCATION
  // ============================================
  useEffect(() => {
    const fetchUserLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ latitude, longitude });
            console.log(`User location: ${latitude}, ${longitude}`);
          },
          (error) => {
            console.warn('Geolocation permission denied:', error.message);
            setLocationPermissionDenied(true);
            // Use default location (Connaught Place, New Delhi)
            setUserLocation({ latitude: 28.6305, longitude: 77.1854 });
          }
        );
      } else {
        console.warn('Geolocation not supported');
        setUserLocation({ latitude: 28.6305, longitude: 77.1854 });
      }
    };

    fetchUserLocation();
  }, []);

  // ============================================
  // FETCH PARKING LOTS
  // ============================================
  useEffect(() => {
    const fetchParkingLots = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get('/api/parking-lots');
        const lots = response.data.parkingLots || response.data || [];

        if (Array.isArray(lots) && lots.length > 0) {
          setParkingLots(lots);
        } else {
          throw new Error('No parking lots found');
        }
      } catch (err) {
        console.warn('API Error - Using dummy data:', err.message);
        setError('Using demo data');
        setParkingLots(DUMMY_PARKING_DATA);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when we have user location
    if (userLocation) {
      fetchParkingLots();
    }
  }, [userLocation]);

  // ============================================
  // SORT BY DISTANCE
  // ============================================
  useEffect(() => {
    if (parkingLots.length > 0 && userLocation) {
      const lotsWithDistance = parkingLots.map((lot) => ({
        ...lot,
        distance: calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          lot.latitude,
          lot.longitude
        ),
      }));

      // Sort by distance (nearest first)
      const sorted = lotsWithDistance.sort((a, b) => a.distance - b.distance);
      setFilteredLots(sorted);
    }
  }, [parkingLots, userLocation]);

  // ============================================
  // HANDLE NAVIGATE
  // ============================================
  const handleNavigate = (latitude, longitude, lotName) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
    console.log(`Navigating to ${lotName}`);
  };

  // ============================================
  // CALCULATE OCCUPANCY PERCENTAGE
  // ============================================
  const getOccupancyPercentage = (occupancy, capacity) => {
    return Math.round((occupancy / capacity) * 100);
  };

  // ============================================
  // RENDER LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
            <MapPin className="text-blue-600" />
            Nearby Parking Lots
          </h1>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-gray-600 font-semibold text-lg">
              Fetching your location and parking data...
            </p>
            <p className="text-gray-500 text-sm">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER MAIN UI
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="text-blue-600 w-9 h-9" />
            Nearby Parking Lots
          </h1>
          <p className="text-gray-600 mt-2">
            {locationPermissionDenied
              ? '📍 Using default location (Permission denied)'
              : '📍 Sorted by distance from your location'}
          </p>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="text-yellow-600 w-5 h-5" />
              <span className="text-yellow-800 text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredLots.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Parking Lots Found</h2>
            <p className="text-gray-600">Try again or check back later</p>
          </div>
        ) : (
          /* Parking Lots Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLots.map((lot) => {
              const occupancyPercentage = getOccupancyPercentage(
                lot.currentOccupancy,
                lot.totalCapacity
              );
              const colorClass = getOccupancyColor(lot.currentOccupancy, lot.totalCapacity);
              const bgClass = getOccupancyBg(lot.currentOccupancy, lot.totalCapacity);

              return (
                <div
                  key={lot._id}
                  className={`rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-2xl hover:scale-105 ${bgClass} bg-white`}
                >
                  {/* Card Header with Distance Badge */}
                  <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 h-32 flex items-center justify-center">
                    <div className="text-white text-center">
                      <h2 className="text-xl font-bold">{lot.name}</h2>
                      <p className="text-blue-100 text-sm mt-1">Parking Lot</p>
                    </div>

                    {/* Distance Badge */}
                    <div className="absolute top-3 right-3 bg-white text-blue-600 px-3 py-1 rounded-full font-semibold text-sm shadow-md flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {lot.distance} km
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Occupancy Info */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-700 font-semibold">Occupancy</span>
                        <span className="text-gray-900 font-bold text-lg">
                          {lot.currentOccupancy}/{lot.totalCapacity}
                        </span>
                      </div>

                      {/* Occupancy Percentage */}
                      <div className="text-right mb-2">
                        <span
                          className={`text-sm font-semibold ${
                            occupancyPercentage < 70
                              ? 'text-green-600'
                              : occupancyPercentage < 90
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {occupancyPercentage}% Full
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${colorClass}`}
                          style={{
                            width: `${occupancyPercentage}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Availability Status */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">
                          {lot.totalCapacity - lot.currentOccupancy}
                        </span>{' '}
                        spots available
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="mb-4">
                      {occupancyPercentage < 70 ? (
                        <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                          ✓ Spaces Available
                        </span>
                      ) : occupancyPercentage < 90 ? (
                        <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold">
                          ⚠ Getting Full
                        </span>
                      ) : (
                        <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-semibold">
                          ✕ Nearly Full
                        </span>
                      )}
                    </div>

                    {/* Coordinates (for reference) */}
                    <div className="mb-4 text-xs text-gray-500 p-2 bg-gray-50 rounded">
                      📍 {lot.latitude.toFixed(4)}, {lot.longitude.toFixed(4)}
                    </div>

                    {/* Navigate Button */}
                    <button
                      onClick={() => handleNavigate(lot.latitude, lot.longitude, lot.name)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Navigation className="w-4 h-4" />
                      Navigate
                    </button>
                  </div>

                  {/* Distance Info Footer */}
                  <div className="bg-gray-50 px-5 py-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600 text-center">
                      {lot.distance < 1
                        ? '📍 Less than 1 km away'
                        : lot.distance < 5
                        ? '📍 Nearby - Quick drive'
                        : '📍 Within reach'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 How It Works</h3>
          <ul className="space-y-2 text-gray-700">
            <li>✓ We use your device location to find nearby parking lots</li>
            <li>✓ Lots are sorted by distance (nearest first)</li>
            <li>✓ Green bars = Plenty of spaces | Yellow = Getting full | Red = Almost full</li>
            <li>✓ Click "Navigate" to get directions in Google Maps</li>
            <li>✓ Distance is updated in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
