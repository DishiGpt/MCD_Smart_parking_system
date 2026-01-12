import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  SafeAreaView,
  StatusBar,
  Platform, 
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

// ============================================
// ⚠️ CONFIGURATION
// ============================================
// Ensure this Ngrok link is still active (Black window is open)
const API_URL = 'https://mcd-smart-parking-system.onrender.com'; 

// ============================================
// DUMMY DATA (Failsafe)
// ============================================
const DUMMY_PARKING_DATA = [
  {
    _id: '1',
    name: 'Connaught Place Block A',
    totalCapacity: 500,
    currentOccupancy: 350,
    location: { latitude: 28.6305, longitude: 77.1854 }, 
  },
  {
    _id: '2',
    name: 'South Extension Market Part 2 (Long Name Test)',
    totalCapacity: 400,
    currentOccupancy: 280,
    location: { latitude: 28.6129, longitude: 77.2295 },
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const getOccupancyPercentage = (occupancy, capacity) => {
  return Math.round((occupancy / capacity) * 100);
};

const getOccupancyColor = (occupancy, capacity) => {
  const percentage = getOccupancyPercentage(occupancy, capacity);
  if (percentage < 70) return '#10b981'; 
  if (percentage < 90) return '#f59e0b'; 
  return '#ef4444'; 
};

const getOccupancyBg = (occupancy, capacity) => {
  const percentage = getOccupancyPercentage(occupancy, capacity);
  if (percentage < 70) return '#f0fdf4'; 
  if (percentage < 90) return '#fffbf0'; 
  return '#fef2f2'; 
};

const getStatusBadge = (occupancy, capacity) => {
  const percentage = getOccupancyPercentage(occupancy, capacity);
  if (percentage < 70) {
    return { text: 'Spaces Available', icon: '✓', color: '#059669' };
  } else if (percentage < 90) {
    return { text: 'Getting Full', icon: '⚠', color: '#b45309' };
  } else {
    return { text: 'Nearly Full', icon: '✕', color: '#dc2626' };
  }
};

const getDistanceMessage = (distance) => {
  if (distance < 1) return '📍 Less than 1 km away';
  if (distance < 5) return '📍 Nearby - Quick drive';
  return '📍 Within reach';
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function App() {
  const [parkingLots, setParkingLots] = useState([]);
  const [filteredLots, setFilteredLots] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Get Location
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Using Default Location (Delhi).");
          setUserLocation({ latitude: 28.6305, longitude: 77.1854 });
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation(location.coords);
      } catch (err) {
        console.warn('Location Error:', err.message);
        setUserLocation({ latitude: 28.6305, longitude: 77.1854 });
      }
    };
    fetchUserLocation();
  }, []);

  // 2. Fetch Data
  useEffect(() => {
    const fetchParkingLots = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching from: ${API_URL}/api/parking-lots`);
        const response = await axios.get(`${API_URL}/api/parking-lots`, {
          timeout: 4000, 
        });

        const lots = response.data.parkingLots || response.data || [];
        if (Array.isArray(lots) && lots.length > 0) {
          setParkingLots(lots);
        } else {
          throw new Error('Empty Data');
        }

      } catch (err) {
        console.log('API Failed, switching to Offline Mode:', err.message);
        setError('Showing Demo Data (Offline Mode)');
        setParkingLots(DUMMY_PARKING_DATA);
      } finally {
        setLoading(false);
      }
    };

    if (userLocation) {
      fetchParkingLots();
    }
  }, [userLocation]);

  // 3. Sort Data by Distance
  useEffect(() => {
    if (parkingLots.length > 0 && userLocation) {
      const sorted = parkingLots.map((lot) => {
        
        const lat = parseFloat(lot.location?.latitude || lot.latitude || 0);
        const lng = parseFloat(lot.location?.longitude || lot.longitude || 0);
        
        return {
          ...lot,
          latitude: lat,
          longitude: lng,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            lat,
            lng
          ),
        };
      }).sort((a, b) => a.distance - b.distance);
      
      setFilteredLots(sorted);
    }
  }, [parkingLots, userLocation]);

  // 4. Handle Navigation
  const handleNavigate = (lat, lng, label) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const labelEncoded = encodeURIComponent(label);
    
    const url = Platform.select({
      ios: `${scheme}${labelEncoded}@${latLng}`,
      android: `${scheme}${latLng}(${labelEncoded})`
    });

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const browserUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(browserUrl);
      }
    });
  };

  // 5. Render
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Finding nearest spots...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#eff6ff" />
      <ScrollView style={styles.scrollView}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>🅿️ Find Parking</Text>
          <Text style={styles.headerSubtitle}>Live availability nearby</Text>
          {error && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>⚠️ {error}</Text>
            </View>
          )}
        </View>

        {/* List */}
        <View style={styles.lotsContainer}>
          {filteredLots.map((lot) => {
            const cap = lot.totalCapacity || lot.capacity || 100;
            const occ = lot.currentOccupancy || lot.occupied || 0;
            const pct = getOccupancyPercentage(occ, cap);
            const color = getOccupancyColor(occ, cap);
            const bg = getOccupancyBg(occ, cap);
            const badge = getStatusBadge(occ, cap);

            return (
              <View key={lot._id || lot.id} style={[styles.parkingCard, { backgroundColor: bg }]}>
                
                {/* ✅ UI FIX: Replaced simple View with styled components 
                   to prevent text overflow 
                */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerTextContainer}> 
                    <Text style={styles.lotName}>{lot.name}</Text>
                    <Text style={styles.lotType}>Public Parking</Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{lot.distance} km</Text>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  
                  {/* Stats */}
                  <View style={styles.occupancyHeader}>
                    <Text style={styles.occupancyLabel}>Occupancy</Text>
                    <Text style={[styles.occupancyPercentage, { color }]}>
                      {occ}/{cap} ({pct}%)
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>

                  {/* Status Text */}
                  <View style={[styles.statusBadge, { borderColor: badge.color, marginTop: 12 }]}>
                    <Text style={[styles.statusText, { color: badge.color }]}>
                      {badge.icon} {badge.text}
                    </Text>
                  </View>

                  {/* Navigate Button */}
                  <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => handleNavigate(lot.latitude, lot.longitude, lot.name)}
                  >
                    <Text style={styles.navigateButtonText}>📍 Navigate</Text>
                  </TouchableOpacity>

                  <Text style={styles.distanceMessage}>{getDistanceMessage(lot.distance)}</Text>
                </View>
              </View>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f9ff' },
  scrollView: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, color: '#374151', fontWeight: '600' },
  headerContainer: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  headerSubtitle: { fontSize: 14, color: '#6b7280' },
  alertBox: { backgroundColor: '#fef3c7', padding: 8, marginTop: 8, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  alertText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
  lotsContainer: { paddingBottom: 40 },
  
  // ✅ UI FIX: Updated Card Header Styles
  parkingCard: { borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', elevation: 3 },
  cardHeader: { 
    backgroundColor: '#2563eb', 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'flex-start' // Aligns badge to top if text wraps
  },
  headerTextContainer: {
    flex: 1, // This allows text to wrap instead of pushing badge
    marginRight: 10 // Space between text and badge
  },
  lotName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 2 },
  lotType: { fontSize: 12, color: '#e0e7ff' },
  
  // Badge Layout
  distanceBadge: { backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, minWidth: 60, alignItems: 'center' },
  distanceText: { color: '#2563eb', fontWeight: '700', fontSize: 12 },
  
  cardBody: { padding: 16 },
  occupancyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  occupancyLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  occupancyPercentage: { fontSize: 14, fontWeight: '700' },
  progressBarContainer: { height: 10, backgroundColor: '#d1d5db', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '600' },
  navigateButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, marginTop: 12, alignItems: 'center' },
  navigateButtonText: { color: '#fff', fontWeight: '700' },
  distanceMessage: { textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 8 }
});