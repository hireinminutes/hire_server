const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'college'
  },
  contactNumber: {
    type: String,
    trim: true
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  website: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String // URL or base64
  },
  accreditation: {
    type: String,
    trim: true
  },
  establishedYear: {
    type: Number
  },
  otpHash: {
    type: String,
    select: false
  },
  otpExpiresAt: {
    type: Date,
    select: false
  },
  otpAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate'
  }],

  // User Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: false
    },
    profileVisibility: {
      type: Boolean,
      default: true
    },
    showActivityStatus: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      enum: ['en', 'es', 'fr', 'de'],
      default: 'en'
    }
  },

  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorBackupCodes: [{
    type: String,
    select: false
  }],
  twoFactorSetupToken: {
    type: String,
    select: false
  },
  twoFactorSetupExpires: {
    type: Date,
    select: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password and update timestamps before saving
collegeSchema.pre('save', async function () {
  try {
    // Only hash password if it's modified and exists
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.password, salt);
      this.password = hashedPassword;
    }

    // Update the updatedAt field
    this.updatedAt = Date.now();
  } catch (error) {
    console.error('Error in college pre-save middleware:', error);
    throw error;
  }
});

// Compare password method
collegeSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for better query performance
collegeSchema.index({ email: 1 });
collegeSchema.index({ name: 1 });

module.exports = mongoose.model('College', collegeSchema);