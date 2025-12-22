const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  role: {
    type: String,
    default: 'admin'
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },

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
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function () {
  try {
    if (!this.isModified('password') || !this.password) {
      return;
    }
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
  } catch (error) {
    console.error('Error in admin pre-save hook:', error);
    throw error;
  }
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.toJSON = function () {
  const adminObject = this.toObject();
  delete adminObject.password;
  return adminObject;
};

module.exports = mongoose.model('Admin', adminSchema);
