const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  parkingLotName: {
    type: String,
    required: true
  },
  parkingLotId: {
    type: String,
    required: false
  },
  userName: {
    type: String,
    default: ''
  },
  userContact: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['Overcharge', 'Slow service', 'Vehicle damage', 'Staff behavior', 'Payment issue', 'Other'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_REVIEW', 'RESOLVED'],
    default: 'PENDING'
  },
  adminReply: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
