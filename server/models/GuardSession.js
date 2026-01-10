const mongoose = require('mongoose');

const guardSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  guardId: {
    type: String,
    required: true
  },
  guardName: {
    type: String,
    required: true
  },
  parkingLot: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  openingCash: {
    type: Number,
    required: true,
    default: 0
  },
  closingCash: {
    type: Number,
    default: null
  },
  systemCashExpected: {
    type: Number,
    default: 0
  },
  actualCashCollected: {
    type: Number,
    default: 0
  },
  cashShortage: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CLOSED', 'FLAGGED'],
    default: 'ACTIVE'
  },
  systemHealthAtStart: {
    camera: { type: String, enum: ['OK', 'FAIL'], default: 'OK' },
    printer: { type: String, enum: ['OK', 'FAIL'], default: 'OK' },
    internet: { type: String, enum: ['OK', 'FAIL'], default: 'OK' }
  },
  transactionCount: {
    total: { type: Number, default: 0 },
    automated: { type: Number, default: 0 },
    manual: { type: Number, default: 0 },
    entries: { type: Number, default: 0 },
    exits: { type: Number, default: 0 }
  },
  revenueBreakdown: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    fastag: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  manualOverrideRate: {
    type: Number,
    default: 0
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  flaggedTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  shortageAlertCreated: {
    type: Boolean,
    default: false
  },
  auditNotes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Calculate risk score before saving
guardSessionSchema.pre('save', function(next) {
  if (this.transactionCount.total > 0) {
    this.manualOverrideRate = (this.transactionCount.manual / this.transactionCount.total) * 100;
    
    // Risk score calculation:
    // - Manual override rate > 20% = +30 points
    // - Cash shortage > 5% = +40 points
    // - System health failures = +10 points each
    let risk = 0;
    
    if (this.manualOverrideRate > 20) risk += 30;
    if (this.manualOverrideRate > 40) risk += 20;
    
    if (this.systemCashExpected > 0) {
      const shortagePercent = Math.abs(this.cashShortage / this.systemCashExpected) * 100;
      if (shortagePercent > 5) risk += 40;
    }
    
    const healthChecks = this.systemHealthAtStart;
    if (healthChecks.camera === 'FAIL') risk += 10;
    if (healthChecks.printer === 'FAIL') risk += 10;
    if (healthChecks.internet === 'FAIL') risk += 10;
    
    this.riskScore = Math.min(risk, 100);
    
    // Auto-flag high-risk sessions
    if (this.riskScore >= 50) {
      this.status = 'FLAGGED';
    }
  }
  next();
});

module.exports = mongoose.model('GuardSession', guardSessionSchema);
