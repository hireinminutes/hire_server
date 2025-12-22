const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'Candidate is required']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required']
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
  completedLessons: [{
    moduleIndex: Number,
    lessonIndex: Number,
    completedAt: Date
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'dropped'],
    default: 'active'
  },
  completedAt: Date,
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateIssuedAt: Date
}, {
  timestamps: true
});

// Prevent duplicate enrollments
enrollmentSchema.index({ candidate: 1, course: 1 }, { unique: true });

// Index for queries
enrollmentSchema.index({ candidate: 1, status: 1 });
enrollmentSchema.index({ course: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
