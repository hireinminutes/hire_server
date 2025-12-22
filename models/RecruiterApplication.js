const mongoose = require('mongoose');

const recruiterApplicationSchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: true
  },
  // Application data from onboarding
  personalInfo: {
    fullName: String,
    phone: String,
    phoneVerified: Boolean
  },
  companyInfo: {
    name: String,
    website: String,
    logo: String, // base64 encoded
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    address: String,
    images: [String], // base64 encoded images
    socialLinks: {
      facebook: String,
      linkedin: String,
      twitter: String,
      instagram: String
    }
  },
  authorityInfo: {
    jobTitle: {
      type: String,
      enum: ['HR', 'Talent Acquisition', 'Hiring Manager', 'Recruitment Manager', 'HR Manager', 'CEO', 'CTO', 'COO', 'Founder', 'Other']
    },
    employmentProof: String // base64 encoded document
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewNotes: String,
  rejectionReason: String
}, {
  timestamps: true
});

// Index for efficient queries
recruiterApplicationSchema.index({ status: 1, submittedAt: -1 });
recruiterApplicationSchema.index({ recruiter: 1 });

module.exports = mongoose.model('RecruiterApplication', recruiterApplicationSchema);