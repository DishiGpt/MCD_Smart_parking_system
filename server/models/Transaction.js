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
  exitMethod: {
    type: String,
    enum: ['ANPR', 'MANUAL_OVERRIDE'],
    default: 'ANPR'
  },
  manualExitBy: {
    type: String,
    default: null
  },
  manualExitReason: {
    type: String,
    enum: ['CAMERA_GLITCH', 'SERVER_TIMEOUT', 'SYSTEM_FAILURE', 'OTHER'],
    default: undefined
  },
  duration: {
    type: Number,
    default: 0
  },
  paymentMode: {
    type: String,
    enum: ['CASH', 'UPI', 'FASTAG', 'PENDING'],
    default: 'PENDING'
  },
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptNumber: {
    type: String,
    default: null
  },
  guardSessionId: {
    type: String,
    default: null
  },
  riskFlag: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  flagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-generate receipt number on payment
transactionSchema.pre('save', function(next) {
  if (this.paymentMode !== 'PENDING' && !this.receiptNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.receiptNumber = `RCP-${timestamp}-${random}`;
    this.receiptGenerated = true;
  }
  
  // Auto-calculate risk flag for manual entries
  if (this.isManualEntry || this.exitMethod === 'MANUAL_OVERRIDE') {
    if (this.paymentMode === 'CASH') {
      this.riskFlag = 'HIGH';
    } else if (this.paymentMode === 'PENDING') {
      this.riskFlag = 'CRITICAL';
    } else {
      this.riskFlag = 'MEDIUM';
    }
  }
  
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
