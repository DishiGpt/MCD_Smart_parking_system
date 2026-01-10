const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  entryTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  fee: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  parkingLot: {
    type: String,
    required: true
  },
  entryMethod: {
    type: String,
    enum: ['ANPR', 'MANUAL_OVERRIDE', 'RFID'],
    default: 'ANPR'
  },
  isManualEntry: {
    type: Boolean,
    default: false
  },
  manualOverrideReason: {
    type: String,
    enum: ['CAMERA_GLITCH', 'SERVER_TIMEOUT', 'SYSTEM_FAILURE', 'OTHER'],
    // Do not default to null because enum validator rejects null.
    // Leave undefined when not a manual entry so validation is skipped.
    default: undefined
  },
  manualEntryBy: {
    type: String,
    default: null
  },
  flagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
