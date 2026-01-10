import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Geolocation,
  PermissionsAndroid,
  Platform,
  StatusBar,
  ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { NativeWindStyleSheet } from 'nativewind';

const API_BASE = 'http://localhost:5000/api';

// Initialize NativeWind
NativeWindStyleSheet.setOutput({
  default: 'native',
});

const HomeScreen = ({ navigation }) => {
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    fetchParkingLots();
  }, []);

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Smart Parking needs your location to show nearby parking lots',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Location permission denied');
          return;
        }
      }

      // Use expo-location instead of geolocation
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (err) {
      console.error('Location Error:', err);
      setError('Failed to get location');
      // Set default location for demo
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.2090
      });
    }
  };

  const fetchParkingLots = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/parking-lots`);
      
      if (response.data.success) {
        const lots = response.data.parkingLots.map(lot => ({
          ...lot,
          distance: userLocation 
            ? calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                lot.location?.latitude || 28.6139,
                lot.location?.longitude || 77.2090
              )
            : 'N/A'
        }));

        // Sort by distance
        lots.sort((a, b) => {
          if (a.distance === 'N/A') return 1;
          if (b.distance === 'N/A') return -1;
          return a.distance - b.distance;
        });

        setParkingLots(lots);
      } else {
        setError('Failed to fetch parking lots');
        // Use mock data for demo
        setMockParkingLots();
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      // Use mock data if API fails
      setMockParkingLots();
    } finally {
      setLoading(false);
    }
  };

  const setMockParkingLots = () => {
    const mockLots = [
      {
        id: '1',
        name: 'Main Gate Parking',
        location: 'Sector 1, Delhi',
        occupancy: 45,
        capacity: 100,
        available: 55,
        occupancyRate: '45.0',
        hourlyRate: 50,
        isFull: false,
        distance: 2.5
      },
      {
        id: '2',
        name: 'Central Hub Lot',
        location: 'Sector 5, Delhi',
        occupancy: 92,
        capacity: 120,
        available: 28,
        occupancyRate: '76.7',
        hourlyRate: 60,
        isFull: false,
        distance: 4.2
      },
      {
        id: '3',
        name: 'Airport Terminal Parking',
        location: 'Airport Road, Delhi',
        occupancy: 150,
        capacity: 150,
        available: 0,
        occupancyRate: '100.0',
        hourlyRate: 100,
        isFull: true,
        distance: 8.1
      },
      {
        id: '4',
        name: 'Shopping Mall Lot',
        location: 'Connaught Place, Delhi',
        occupancy: 35,
        capacity: 85,
        available: 50,
        occupancyRate: '41.2',
        hourlyRate: 40,
        isFull: false,
        distance: 5.8
      }
    ];
    setParkingLots(mockLots);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance in km
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  const getCapacityColor = (rate) => {
    if (rate >= 80) return '#ef4444'; // red
    if (rate >= 60) return '#f97316'; // orange
    return '#22c55e'; // green
  };

  const renderLotCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Details', { lot: item })}
      className="bg-white mx-4 mb-3 rounded-xl shadow-lg p-4 border border-gray-200"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-600 mt-1">{item.location}</Text>
        </View>
        {item.isFull && (
          <View className="bg-red-100 rounded-full px-3 py-1">
            <Text className="text-red-600 font-bold text-xs">FULL</Text>
          </View>
        )}
      </View>

      {/* Capacity Bar */}
      <View className="mb-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-xs text-gray-600 font-semibold">
            Capacity: {item.occupancy}/{item.capacity}
          </Text>
          <Text className="text-xs font-bold" style={{ color: getCapacityColor(parseFloat(item.occupancyRate)) }}>
            {item.occupancyRate}%
          </Text>
        </View>
        <View className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <View
            style={{
              width: `${parseFloat(item.occupancyRate)}%`,
              backgroundColor: getCapacityColor(parseFloat(item.occupancyRate)),
              height: '100%'
            }}
          />
        </View>
      </View>

      {/* Info Row */}
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Text className="text-sm font-bold text-gray-700">
            🚗 {item.available} Available
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="items-center">
            <Text className="text-xs text-gray-600">Distance</Text>
            <Text className="font-bold text-gray-800">{item.distance} km</Text>
          </View>
          <View className="items-center">
            <Text className="text-xs text-gray-600">Hourly Rate</Text>
            <Text className="font-bold text-gray-800">₹{item.hourlyRate}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-4">
        <Text className="text-2xl font-bold text-gray-800">🅿️ Smart Parking</Text>
        <Text className="text-sm text-gray-600 mt-1">Find & Reserve Nearby Spots</Text>

        {userLocation && (
          <View className="mt-2 flex-row items-center gap-1">
            <Text className="text-xs text-blue-600">📍</Text>
            <Text className="text-xs text-blue-600 font-semibold">
              Location: {userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View className="bg-red-100 mx-4 mt-4 p-3 rounded-lg border border-red-300">
          <Text className="text-red-700 text-sm font-semibold">⚠️ {error}</Text>
        </View>
      )}

      {/* Loading State */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-gray-600 mt-2">Loading parking lots...</Text>
        </View>
      ) : parkingLots.length === 0 ? (
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-gray-600 text-lg mb-2">No parking lots found</Text>
          <TouchableOpacity
            onPress={fetchParkingLots}
            className="bg-blue-600 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-bold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={parkingLots}
          renderItem={renderLotCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
          refreshing={loading}
          onRefresh={fetchParkingLots}
        />
      )}

      {/* Refresh Button */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          onPress={fetchParkingLots}
          className="bg-blue-600 rounded-full w-14 h-14 justify-center items-center shadow-lg"
        >
          <Text className="text-2xl">🔄</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HomeScreen;
