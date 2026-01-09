const mongoose = require('mongoose');

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  currentOccupancy: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'FULL', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

// Automatically update status based on occupancy
parkingLotSchema.pre('save', function(next) {
  if (this.currentOccupancy >= this.capacity) {
    this.status = 'FULL';
  } else if (this.status !== 'MAINTENANCE') {
    this.status = 'AVAILABLE';
  }
  next();
});

module.exports = mongoose.model('ParkingLot', parkingLotSchema);
