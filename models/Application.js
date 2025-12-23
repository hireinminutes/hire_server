const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job is required']
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'Applicant is required']
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected'],
    default: 'pending'
  },
  coverLetter: {
    type: String,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  portfolioLink: {
    type: String,
    trim: true
  },
  resumeLink: {
    type: String,
    trim: true
  },
  resume: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  },
  expectedSalary: Number,
  availability: {
    type: String,
    enum: ['immediately', '2-weeks', '1-month', '3-months'],
    default: 'immediately'
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  interviewScheduled: Date,
  feedback: String
}, {
  timestamps: true
});

// Compound index to prevent duplicate applications
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdAt: -1 });

// Virtual for job details
applicationSchema.virtual('jobDetails', {
  ref: 'Job',
  localField: 'job',
  foreignField: '_id',
  justOne: true
});

// Virtual for applicant details
applicationSchema.virtual('applicantDetails', {
  ref: 'User',
  localField: 'applicant',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);