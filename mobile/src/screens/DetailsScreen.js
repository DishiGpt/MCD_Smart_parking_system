import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Alert as RNAlert
} from 'react-native';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const DetailsScreen = ({ route, navigation }) => {
  const { lot } = route.params;
  const [selectedHours, setSelectedHours] = useState(1);
  const [bookingModal, setBookingModal] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateFee = (hours) => {
    return lot.hourlyRate * hours;
  };

  const handleBooking = async () => {
    if (!driverName.trim() || !vehicleNumber.trim()) {
      RNAlert.alert('⚠️ Missing Info', 'Please enter driver name and vehicle number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/entry`, {
        vehicleNumber: vehicleNumber.toUpperCase(),
        parkingLotName: lot.name
      });

      if (response.data.success) {
        RNAlert.alert(
          '✅ Booking Confirmed',
          `Vehicle ${vehicleNumber.toUpperCase()} parked at ${lot.name}\n\nFee: ₹${calculateFee(selectedHours)}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setBookingModal(false);
        setDriverName('');
        setVehicleNumber('');
      } else {
        RNAlert.alert('❌ Error', response.data.message);
      }
    } catch (error) {
      RNAlert.alert('❌ Booking Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityColor = (rate) => {
    if (rate >= 80) return '#ef4444';
    if (rate >= 60) return '#f97316';
    return '#22c55e';
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-800">{lot.name}</Text>
          <Text className="text-sm text-gray-600">{lot.location}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Capacity Card */}
        <View className="bg-white m-4 rounded-xl p-4 shadow-sm border border-gray-200">
          <Text className="text-sm text-gray-600 font-semibold mb-2">Current Capacity</Text>
          <Text className="text-3xl font-bold text-gray-800 mb-3">
            {lot.occupancy}/{lot.capacity}
          </Text>
          <View className="mb-3">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-gray-700">Occupancy Rate</Text>
              <Text
                className="text-sm font-bold"
                style={{ color: getCapacityColor(parseFloat(lot.occupancyRate)) }}
              >
                {lot.occupancyRate}%
              </Text>
            </View>
            <View className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <View
                style={{
                  width: `${parseFloat(lot.occupancyRate)}%`,
                  backgroundColor: getCapacityColor(parseFloat(lot.occupancyRate)),
                  height: '100%'
                }}
              />
            </View>
          </View>
          <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-200">
            <View>
              <Text className="text-xs text-gray-600">Available</Text>
              <Text className="text-lg font-bold text-green-600">{lot.available}</Text>
            </View>
            <View>
              <Text className="text-xs text-gray-600">Status</Text>
              <Text className={`text-lg font-bold ${lot.isFull ? 'text-red-600' : 'text-green-600'}`}>
                {lot.isFull ? 'FULL' : 'OPEN'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-gray-600">Distance</Text>
              <Text className="text-lg font-bold text-blue-600">{lot.distance} km</Text>
            </View>
          </View>
        </View>

        {/* Pricing Info */}
        <View className="bg-white m-4 rounded-xl p-4 shadow-sm border border-gray-200">
          <Text className="text-sm text-gray-600 font-semibold mb-3">Pricing Information</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-gray-700">Hourly Rate</Text>
              <Text className="font-bold text-gray-800">₹{lot.hourlyRate}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-gray-700">24-Hour Rate</Text>
              <Text className="font-bold text-gray-800">₹{lot.hourlyRate * 24}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-700">Half-Day (12 hrs)</Text>
              <Text className="font-bold text-gray-800">₹{lot.hourlyRate * 12}</Text>
            </View>
          </View>
        </View>

        {/* Location Info */}
        <View className="bg-white m-4 rounded-xl p-4 shadow-sm border border-gray-200">
          <Text className="text-sm text-gray-600 font-semibold mb-2">Location Details</Text>
          <Text className="text-lg font-bold text-gray-800 mb-1">📍 {lot.location}</Text>
          <Text className="text-sm text-gray-600">
            Get directions and navigate to this parking lot
          </Text>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      {!lot.isFull && (
        <View className="bg-white border-t border-gray-200 p-4">
          <TouchableOpacity
            onPress={() => setBookingModal(true)}
            className="bg-blue-600 rounded-lg py-4 flex-row justify-center items-center gap-2"
          >
            <Text className="text-white text-lg font-bold">📅 Book Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Booking Modal */}
      <Modal
        visible={bookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6 pt-8">
            <TouchableOpacity
              onPress={() => setBookingModal(false)}
              className="absolute top-4 right-4"
            >
              <Text className="text-2xl">✕</Text>
            </TouchableOpacity>

            <Text className="text-2xl font-bold text-gray-800 mb-4">Book Parking Spot</Text>

            {/* Driver Name */}
            <Text className="text-sm text-gray-600 font-semibold mb-2">Driver Name</Text>
            <TextInput
              placeholder="Enter your name"
              value={driverName}
              onChangeText={setDriverName}
              className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
              editable={!loading}
            />

            {/* Vehicle Number */}
            <Text className="text-sm text-gray-600 font-semibold mb-2">Vehicle Number Plate</Text>
            <TextInput
              placeholder="e.g., DL01AB1234"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              className="border border-gray-300 rounded-lg px-4 py-2 mb-4 font-mono uppercase"
              editable={!loading}
            />

            {/* Duration Selection */}
            <Text className="text-sm text-gray-600 font-semibold mb-2">Duration (Hours)</Text>
            <View className="flex-row gap-2 mb-4">
              {[1, 2, 4, 8, 12, 24].map((hours) => (
                <TouchableOpacity
                  key={hours}
                  onPress={() => setSelectedHours(hours)}
                  className={`px-3 py-2 rounded-lg border ${
                    selectedHours === hours
                      ? 'bg-blue-600 border-blue-600'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                >
                  <Text
                    className={`font-bold text-sm ${
                      selectedHours === hours ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {hours}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total Fee */}
            <View className="bg-gray-100 rounded-lg p-4 mb-4">
              <Text className="text-sm text-gray-600">Total Fee</Text>
              <Text className="text-3xl font-bold text-blue-600">
                ₹{calculateFee(selectedHours)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setBookingModal(false)}
                className="flex-1 border border-gray-300 rounded-lg py-3"
                disabled={loading}
              >
                <Text className="text-center text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBooking}
                className="flex-1 bg-green-600 rounded-lg py-3"
                disabled={loading}
              >
                <Text className="text-center text-white font-bold">
                  {loading ? '⏳ Booking...' : '✅ Confirm Booking'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DetailsScreen;
