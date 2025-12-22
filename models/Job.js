const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruiter',
    required: [true, 'Posted by is required']
  },
  jobDetails: {
    // 1. Basic Job Info
    basicInfo: {
      jobTitle: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        maxlength: [100, 'Job title cannot exceed 100 characters']
      },
      department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
      },
      numberOfOpenings: {
        type: Number,
        required: [true, 'Number of openings is required'],
        min: [1, 'At least 1 opening is required'],
        max: [100, 'Cannot have more than 100 openings']
      },
      employmentType: {
        type: String,
        required: [true, 'Employment type is required'],
        enum: ['full-time', 'part-time', 'internship', 'contract', 'freelance'],
        default: 'full-time'
      },
      workMode: {
        type: String,
        required: [true, 'Work mode is required'],
        enum: ['onsite', 'hybrid', 'remote'],
        default: 'onsite'
      },
      jobLevel: {
        type: String,
        required: [true, 'Job level is required'],
        enum: ['fresher', 'junior', 'mid-level', 'senior', 'lead', 'director'],
        default: 'fresher'
      }
    },

    // 2. Location Details
    location: {
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
      },
      officeAddress: {
        type: String,
        trim: true
      }
    },

    // 3. Salary & Compensation
    compensation: {
      salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [0, 'Salary cannot be negative']
      },
      salaryType: {
        type: String,
        required: [true, 'Salary type is required'],
        enum: ['annual', 'monthly', 'hourly'],
        default: 'annual'
      }
    },

    // 4. Job Description
    description: {
      roleSummary: {
        type: String,
        required: [true, 'Role summary is required'],
        maxlength: [1000, 'Role summary cannot exceed 1000 characters']
      },
      responsibilities: [{
        type: String,
        required: [true, 'At least one responsibility is required'],
        trim: true
      }],
      requiredSkills: [{
        type: String,
        required: [true, 'At least one required skill is required'],
        trim: true
      }]
    },

    // 5. Required Qualifications
    qualifications: {
      minimumEducation: {
        type: String,
        required: [true, 'Minimum education is required'],
        enum: ['high-school', 'diploma', 'bachelors', 'masters', 'phd', 'other'],
        default: 'bachelors'
      },
      preferredEducation: {
        type: String,
        enum: ['high-school', 'diploma', 'bachelors', 'masters', 'phd', 'other']
      },
      yearsOfExperience: {
        type: Number,
        required: [true, 'Years of experience is required'],
        min: [0, 'Experience cannot be negative'],
        max: [50, 'Experience cannot exceed 50 years']
      }
    }
  },

  // Additional job fields
  status: {
    type: String,
    enum: ['active', 'inactive', 'filled', 'expired', 'draft'],
    default: 'active'
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [String],
  benefits: [String],
  applicationDeadline: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
jobSchema.index({ 'jobDetails.basicInfo.jobTitle': 'text', 'jobDetails.description.roleSummary': 'text', 'jobDetails.description.responsibilities': 'text', 'jobDetails.description.requiredSkills': 'text' });
jobSchema.index({ 'jobDetails.basicInfo.department': 1, 'jobDetails.location.city': 1, 'jobDetails.location.state': 1, 'jobDetails.location.country': 1, 'jobDetails.basicInfo.employmentType': 1, 'jobDetails.basicInfo.workMode': 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ 'jobDetails.basicInfo.jobLevel': 1, 'jobDetails.qualifications.yearsOfExperience': 1 });

// Virtual for applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'job'
});

// Virtual for postedBy recruiter
jobSchema.virtual('recruiter', {
  ref: 'Recruiter',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);