const mongoose = require('mongoose');

const verificationApplicationSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
  // Meeting details when approved
  meetingDetails: {
    date: Date,
    time: String,
    location: String,
    notes: String
  },
  // Notification tracking
  notificationsSent: [{
    type: {
      type: String,
      enum: ['application_submitted', 'application_reviewed', 'meeting_scheduled']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    message: String
  }]
}, {
  timestamps: true
});

// Prevent duplicate pending applications from same candidate
verificationApplicationSchema.index({ candidate: 1, status: 1 }, {
  unique: true,
  partialFilterExpression: { status: 'pending' }
});

module.exports = mongoose.model('VerificationApplication', verificationApplicationSchema);