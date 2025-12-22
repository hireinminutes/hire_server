const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  images: [{
    type: String // Base64 encoded images
  }],
  video: {
    type: String // Base64 encoded video
  },
  showFor: {
    type: String,
    enum: ['candidates', 'recruiters', 'both'],
    default: 'both'
  },
  links: [{
    title: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
