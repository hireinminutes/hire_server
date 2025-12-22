const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required for review']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: [true, 'User is required for review']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate reviews from same user for same course
reviewSchema.index({ course: 1, user: 1 }, { unique: true });

// Update course rating when review is saved
reviewSchema.post('save', async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  if (course) {
    await course.updateRatingStats();
  }
});

// Update course rating when review is removed
reviewSchema.post('remove', async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  if (course) {
    await course.updateRatingStats();
  }
});

// Update course rating when review is updated
reviewSchema.post('findOneAndUpdate', async function() {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.getQuery().course);
  if (course) {
    await course.updateRatingStats();
  }
});

module.exports = mongoose.model('Review', reviewSchema);