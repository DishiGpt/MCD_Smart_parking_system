import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapView({ parkingLots, userLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([28.7041, 77.1025], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add parking lot markers
    if (parkingLots && parkingLots.length > 0) {
      parkingLots.forEach((lot) => {
        if (lot.location && lot.location.latitude && lot.location.longitude) {
          const occupancyPercent = (lot.currentOccupancy / lot.capacity) * 100;
          
          // Determine marker color based on availability
          let markerColor = '#10b981'; // green
          if (occupancyPercent >= 100) {
            markerColor = '#ef4444'; // red
          } else if (occupancyPercent >= 80) {
            markerColor = '#f59e0b'; // orange
          } else if (occupancyPercent >= 50) {
            markerColor = '#fbbf24'; // yellow
          }

          // Create custom icon
          const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                background-color: ${markerColor};
                width: 40px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 3px solid white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="
                  transform: rotate(45deg);
                  color: white;
                  font-weight: bold;
                  font-size: 18px;
                ">🅿️</span>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
          });

          const marker = L.marker(
            [lot.location.latitude, lot.location.longitude],
            { icon: customIcon }
          ).addTo(mapInstanceRef.current);

          // Create popup content with navigation button
          const availableSpots = lot.capacity - lot.currentOccupancy;
          const statusText = lot.status === 'FULL' ? 'FULL' : 'AVAILABLE';
          
          marker.bindPopup(`
            <div style="min-width: 200px; font-family: system-ui;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                ${lot.name}
              </h3>
              <div style="margin-bottom: 8px;">
                <span style="
                  background-color: ${markerColor};
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: bold;
                ">${statusText}</span>
              </div>
              <p style="margin: 8px 0; font-size: 14px; color: #4b5563;">
                <strong>Available:</strong> ${availableSpots} / ${lot.capacity} spots
              </p>
              <p style="margin: 8px 0; font-size: 12px; color: #6b7280;">
                📍 ${lot.location.address || 'Delhi'}
              </p>
              <div style="margin-top: 10px; display: flex; gap: 5px;">
                <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${lot.location.latitude},${lot.location.longitude}', '_blank')" 
                  style="
                    flex: 1;
                    background-color: #2563eb;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 12px;
                  ">
                  🗺️ Navigate
                </button>
                <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${lot.location.latitude},${lot.location.longitude}', '_blank')"
                  style="
                    flex: 1;
                    background-color: #059669;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 12px;
                  ">
                  📍 View
                </button>
              </div>
            </div>
          `);

          markersRef.current.push(marker);
        }
      });
    }

    // Add user location marker if available
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const userMarker = L.marker(
        [userLocation.latitude, userLocation.longitude],
        { icon: userIcon }
      ).addTo(mapInstanceRef.current);

      userMarker.bindPopup('<strong>Your Location</strong>');
      markersRef.current.push(userMarker);
    }

  }, [parkingLots, userLocation]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '500px', 
        width: '100%', 
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 1
      }}
    />
  );
}

export default MapView;
