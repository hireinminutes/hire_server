const mongoose = require('mongoose');

const mailingListSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  userType: {
    type: String,
    enum: ['job_seeker', 'employer', 'admin'],
    required: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unsubscribedAt: Date,
  preferences: {
    jobAlerts: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    promotional: {
      type: Boolean,
      default: false
    },
    systemUpdates: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
// Note: email field already has unique: true, so we only index isActive separately
mailingListSchema.index({ isActive: 1 });
mailingListSchema.index({ userId: 1, userType: 1 });

module.exports = mongoose.model('MailingList', mailingListSchema);