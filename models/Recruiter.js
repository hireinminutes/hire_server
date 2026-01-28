const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const recruiterSchema = new mongoose.Schema({
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
  profilePicture: {
    type: String // base64 encoded image
  },
  role: {
    type: String,
    default: 'employer'
  },
  // Recruiter Onboarding Details - Data collected during onboarding form
  recruiterOnboardingDetails: {
    // Step 1: Personal Legitimacy
    phone: {
      type: String,
      trim: true
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },

    // Step 2: Company Authenticity
    company: {
      name: String,
      website: String,
      logo: String, // base64 encoded image
      size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
      },
      address: String, // Head office address
      images: [String], // Array of base64 encoded images
      socialLinks: {
        facebook: String,
        linkedin: String,
        twitter: String,
        instagram: String
      }
    },

    // Step 3: Recruiter's Authority
    jobTitle: {
      type: String,
      enum: ['HR', 'Talent Acquisition', 'Hiring Manager', 'Recruitment Manager', 'HR Manager', 'CEO', 'CTO', 'COO', 'Founder', 'Other']
    },
    employmentProof: String, // base64 encoded document

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now
    },
    isComplete: {
      type: Boolean,
      default: false
    }
  },

  profile: {
    // Recruiter Personal Details (all optional for basic signup)
    fullName: {
      type: String,
      trim: true
    },
    jobTitle: {
      type: String,
      enum: ['HR', 'Talent Acquisition', 'Hiring Manager', 'Recruitment Manager', 'HR Manager', 'CEO', 'CTO', 'COO', 'Founder', 'Other'],
      trim: true
    },
    workEmail: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    workPhone: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    employmentProof: {
      type: String // base64 encoded document
    },
    profilePhoto: String,
    location: {
      city: String,
      state: String,
      country: String
    },

    // Company Details (all optional for basic signup)
    company: {
      name: String,
      logo: String,
      description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
      },
      industry: {
        type: String,
        enum: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Consulting', 'Media', 'Real Estate', 'E-commerce', 'Automotive', 'Energy', 'Telecommunications', 'Food & Beverage', 'Pharmaceuticals', 'Construction', 'Transportation', 'Agriculture', 'Other']
      },
      size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
      },
      website: {
        type: String,
        match: [/^https?:\/\/.*/, 'Website must be a valid URL']
      },
      headOfficeLocation: {
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
      },
      foundingYear: {
        type: Number,
        min: [1800, 'Founding year must be valid'],
        max: [new Date().getFullYear(), 'Founding year cannot be in the future']
      },
      socialLinks: {
        linkedin: String,
        twitter: String,
        instagram: String,
        youtube: String,
        facebook: String
      },
      gstNumber: String, // GST or business registration number
      companyType: {
        type: String,
        enum: ['startup', 'MNC', 'agency', 'NGO', 'government', 'private', 'public', 'partnership', 'sole-proprietorship', 'other']
      },
      images: [String] // Array of base64 encoded images
    }
  },
  permissions: {
    canPostJobs: {
      type: Boolean,
      default: true
    },
    canViewApplications: {
      type: Boolean,
      default: true
    },
    canScheduleInterviews: {
      type: Boolean,
      default: true
    },
    canManageTeam: {
      type: Boolean,
      default: false
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  team: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recruiter'
    },
    role: {
      type: String,
      enum: ['member', 'manager', 'admin'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  postedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    postedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'filled'],
      default: 'active'
    }
  }],
  applicationsReceived: [{
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'interviewed', 'selected', 'rejected'],
      default: 'pending'
    }
  }],
  notifications: [{
    type: {
      type: String,
      enum: ['application_received', 'application_update', 'interview_scheduled', 'job_expired', 'system'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    relatedId: mongoose.Schema.Types.ObjectId, // Could be applicationId, jobId, etc.
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    jobsLimit: {
      type: Number,
      default: 5 // jobs per month
    },
    applicationsLimit: {
      type: Number,
      default: 100 // applications per month
    },
    features: [String], // array of feature flags
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  analytics: {
    totalJobsPosted: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    activeJobs: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    }
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
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false // New recruiters need admin approval
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalDate: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: String,

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
recruiterSchema.pre('save', async function () {
  try {
    // Sync fullName with profile.fullName
    if (this.profile && this.profile.fullName) {
      this.fullName = this.profile.fullName;
    }

    // Only hash password if it's modified and exists
    if (!this.isModified('password') || !this.password) {
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
  } catch (error) {
    console.error('Error in recruiter pre-save hook:', error);
    throw error;
  }
});

// Compare password method
recruiterSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
recruiterSchema.methods.toJSON = function () {
  const recruiterObject = this.toObject();
  delete recruiterObject.password;
  delete recruiterObject.resetPasswordToken;
  delete recruiterObject.resetPasswordExpire;
  delete recruiterObject.verificationToken;
  return recruiterObject;
};

module.exports = mongoose.model('Recruiter', recruiterSchema);