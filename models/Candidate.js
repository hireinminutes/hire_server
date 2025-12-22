const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const candidateSchema = new mongoose.Schema({
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
    enum: ['job_seeker', 'college_student'],
    default: 'job_seeker'
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'premium', 'pro'],
    default: 'free'
  },
  planActivatedAt: {
    type: Date
  },
  planExpiresAt: {
    type: Date
  },
  interviewLinks: [{
    link: String,
    sharedAt: {
      type: Date,
      default: Date.now
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  }],
  interviewCount: {
    type: Number,
    default: 0
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College'
  },
  slug: {
    type: String,
    unique: true,
    sparse: true // Allow null values but ensure uniqueness when present
  },
  profilePicture: {
    type: String // base64 encoded image
  },
  profile: {
    // Basic Personal Info
    profilePhoto: String, // URL to profile photo
    phone: String,
    location: {
      city: String,
      state: String,
      country: String
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },

    // Professional Summary
    professionalSummary: {
      type: String,
      maxlength: [500, 'Professional summary cannot exceed 500 characters']
    },

    // Skills
    skills: [{
      name: String,
      isVerified: {
        type: Boolean,
        default: false
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
      },
      verifiedAt: Date
    }],

    // Experience
    experience: [{
      jobTitle: {
        type: String,
        required: true
      },
      companyName: {
        type: String,
        required: true
      },
      employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'internship', 'freelance', 'contract'],
        required: true
      },
      location: String,
      startDate: {
        type: Date,
        required: true
      },
      endDate: Date, // null if currently working
      isCurrentlyWorking: {
        type: Boolean,
        default: false
      }
    }],

    // Education
    education: [{
      degreeName: {
        type: String,
        required: true
      },
      institution: {
        type: String,
        required: true
      },
      specialization: String,
      startYear: {
        type: Number,
        required: true
      },
      endYear: Number,
      score: String, // CGPA or percentage
      grade: String // Distinction, First Class, etc.
    }],

    // Projects
    projects: [{
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      },
      techStack: [String],
      role: String,
      startDate: Date,
      endDate: Date,
      duration: String, // e.g., "3 months"
      githubLink: String,
      demoLink: String,
      isLive: {
        type: Boolean,
        default: false
      }
    }],

    // Certifications & Training
    certifications: [{
      certificateName: {
        type: String,
        required: true
      },
      issuingOrganization: {
        type: String,
        required: true
      },
      issueDate: {
        type: Date
      },
      expiryDate: Date,
      credentialId: String,
      credentialUrl: String,
      isVerified: {
        type: Boolean,
        default: false
      }
    }],

    // Resume & Documents (base64 encoded)
    documents: {
      resume: mongoose.Schema.Types.Mixed, // Allow both string and object during migration
      coverLetter: mongoose.Schema.Types.Mixed, // Allow both string and object during migration
      portfolioUrl: String
    },

    // Social Profiles
    socialProfiles: {
      linkedin: String,
      github: String,
      facebook: String,
      instagram: String,
      twitter: String,
      website: String
    },

    // Coding Platform Links
    codingProfiles: {
      leetcode: String,
      geeksforgeeks: String,
      hackerrank: String,
      codechef: String,
      codeforces: String,
      atcoder: String,
      spoj: String,
      hackerearth: String
    }
  },

  // Saved Jobs
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  }],

  // Registered Courses
  registeredCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedAt: Date,
    certificateUrl: String
  }],

  // Applied Jobs
  appliedJobs: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected'],
      default: 'pending'
    }
  }],

  // Notifications
  notifications: [{
    type: {
      type: String,
      enum: ['job_match', 'application_update', 'interview_invite', 'course_recommendation', 'system'],
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
    relatedId: mongoose.Schema.Types.ObjectId, // Could be jobId, applicationId, etc.
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Profile Completion
  profileCompletion: {
    basicInfo: { type: Boolean, default: false },
    professionalSummary: { type: Boolean, default: false },
    skills: { type: Boolean, default: false },
    experience: { type: Boolean, default: false },
    education: { type: Boolean, default: false },
    projects: { type: Boolean, default: false },
    certifications: { type: Boolean, default: false },
    documents: { type: Boolean, default: false },
    socialProfiles: { type: Boolean, default: false },
    overall: { type: Number, default: 0, min: 0, max: 100 }
  },

  skillPassport: {
    badgeId: String,
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      default: 'Beginner'
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    verifiedSkills: [String],
    verifiedAt: Date
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
  isProfileVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  hasPaidJobAccess: {
    type: Boolean,
    default: false
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
candidateSchema.pre('save', async function () {
  try {
    // Only hash password if it's modified and exists
    if (!this.isModified('password') || !this.password) {
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(this.password, salt);
    this.password = hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw error;
  }
});

// Generate slug before saving
candidateSchema.pre('save', async function () {
  try {
    if (!this.isModified('fullName') && this.slug) {
      return;
    }

    if (!this.fullName) {
      return;
    }

    const baseSlug = this.fullName
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .trim();

    if (!baseSlug) {
      return;
    }

    let slug = baseSlug;
    let counter = 1;

    // Ensure uniqueness
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      if (counter > 100) break; // Prevent infinite loop
    }

    this.slug = slug;
  } catch (error) {
    console.error('Error generating slug:', error);
    throw error;
  }
});

// Compare password method
candidateSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get documents with migration
candidateSchema.methods.getMigratedDocuments = function () {
  const docs = { ...this.profile.documents };

  // Migrate resume
  if (docs.resume && typeof docs.resume === 'object' && docs.resume.uploadedAt) {
    docs.resume = '';
  }

  // Migrate cover letter
  if (docs.coverLetter && typeof docs.coverLetter === 'object' && docs.coverLetter.uploadedAt) {
    docs.coverLetter = '';
  }

  return docs;
};

// Remove password from JSON output
candidateSchema.methods.toJSON = function () {
  const candidateObject = this.toObject();

  // Apply migration to documents
  if (candidateObject.profile && candidateObject.profile.documents) {
    candidateObject.profile.documents = this.getMigratedDocuments();
  }

  delete candidateObject.password;
  delete candidateObject.resetPasswordToken;
  delete candidateObject.resetPasswordExpire;
  delete candidateObject.verificationToken;
  return candidateObject;
};

// Indexes for better query performance
candidateSchema.index({ role: 1 });
candidateSchema.index({ college: 1 });
candidateSchema.index({ 'profile.skills.name': 1 });
candidateSchema.index({ 'profile.location.city': 1 });
candidateSchema.index({ 'profile.location.country': 1 });

module.exports = mongoose.model('Candidate', candidateSchema);