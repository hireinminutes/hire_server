const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String, // Base64 encoded image
    required: true
  },
  ctaText: {
    type: String, // Call to action button text
    default: 'Learn More'
  },
  ctaUrl: {
    type: String, // URL where the ad leads
    required: true
  },
  displayDuration: {
    type: Number, // Duration in seconds the ad should stay visible
    default: 10
  },
  frequency: {
    type: Number, // Seconds before showing the ad again (e.g., 60s)
    default: 0
  },
  unskippableDuration: {
    type: Number, // Duration in seconds the ad cannot be skipped
    default: 0
  },
  targetAudience: {
    type: String,
    enum: ['candidates', 'recruiters', 'both'],
    default: 'candidates'
  },
  adType: {
    type: String, // Maps to 'placement' from frontend
    enum: ['popup', 'banner', 'home-banner', 'sidebar', 'sidebar-banner', 'jobs-page', 'fullscreen-modal'],
    default: 'popup'
  },
  // Full-screen modal specific settings
  modalDelay: {
    type: Number, // Seconds before modal appears after page load
    default: 0,
    min: 0
  },
  modalCloseBehavior: {
    type: String,
    enum: ['closeable', 'auto-close', 'both'],
    default: 'closeable'
  },
  modalAutoCloseDelay: {
    type: Number, // Seconds before modal auto-closes (only used when modalCloseBehavior is 'auto-close' or 'both')
    min: 1
  },
  priority: {
    type: Number, // Higher priority ads show first
    default: 1,
    min: 1,
    max: 10
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPaused: {
    type: Boolean,
    default: false
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
adSchema.index({ isActive: 1, targetAudience: 1, priority: -1 });
adSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Ad', adSchema);
