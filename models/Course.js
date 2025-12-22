const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  // Core Info
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  shortDescription: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  fullDescription: {
    type: String,
    required: [true, 'Full description is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    enum: ['Programming', 'Design', 'Business', 'Marketing', 'Data Science', 'IT & Software', 'Personal Development', 'Other']
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters']
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },

  // Media
  thumbnail: {
    type: String, // URL or base64
    default: null
  },
  promoVideo: {
    type: String, // URL
    default: null
  },

  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    default: null
  },
  accessType: {
    type: String,
    required: [true, 'Access type is required'],
    enum: ['Lifetime', 'Subscription', 'Limited Period'],
    default: 'Lifetime'
  },

  // Course Logistics
  estimatedDuration: {
    type: String,
    required: [true, 'Estimated duration is required'],
    trim: true,
    maxlength: [100, 'Duration cannot exceed 100 characters']
  },
  totalLessons: {
    type: Number,
    required: [true, 'Total number of lessons is required'],
    min: [1, 'Must have at least 1 lesson'],
    default: 1
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    trim: true,
    default: 'English'
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Learning Outcomes
  whatYouWillLearn: [{
    type: String,
    trim: true
  }],

  // Certificate
  certificateAvailable: {
    type: Boolean,
    default: false
  },

  // Course Content/Syllabus
  courseContent: [{
    moduleTitle: {
      type: String,
      trim: true,
      required: [true, 'Module title is required']
    },
    moduleDuration: {
      type: String,
      trim: true
    },
    lessons: [{
      lessonTitle: {
        type: String,
        trim: true
      },
      lessonDuration: {
        type: String,
        trim: true
      }
    }]
  }],

  // Instructor Info (from Admin profile)
  instructorName: {
    type: String,
    trim: true,
    required: [true, 'Instructor name is required']
  },
  instructorBio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Instructor bio cannot exceed 1000 characters']
  },

  // Rating Stats (stored for performance)
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: [true, 'Created by admin is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating average rating from reviews (for display)
courseSchema.virtual('courseRating').get(function () {
  return this.averageRating || 0;
});

// Virtual for getting number of reviews (for display)
courseSchema.virtual('courseTrainee').get(function () {
  return this.reviewCount || 0;
});

// Index for search and filtering
courseSchema.index({ title: 'text', shortDescription: 'text', tags: 'text' });
courseSchema.index({ category: 1, level: 1 });

// Method to calculate and update rating stats
courseSchema.methods.updateRatingStats = async function () {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { course: this._id, isActive: true } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.averageRating = Math.round(stats[0].averageRating * 10) / 10; // Round to 1 decimal
    this.reviewCount = stats[0].reviewCount;
  } else {
    this.averageRating = 0;
    this.reviewCount = 0;
  }

  return this.save();
};

// Indexes
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ 'instructor.name': 1 });
courseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);