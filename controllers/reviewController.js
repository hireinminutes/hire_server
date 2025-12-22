const Review = require('../models/Review');
const Course = require('../models/Course');

// @desc    Get all reviews for a course
// @route   GET /api/courses/:courseId/reviews
// @access  Public
const getCourseReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const reviews = await Review.find({
      course: req.params.courseId,
      isActive: true
    })
      .populate('user', 'fullName profile.profilePhoto')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Review.countDocuments({
      course: req.params.courseId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
const getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('user', 'fullName profile.profilePhoto')
      .populate('course', 'courseName');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new review
// @route   POST /api/courses/:courseId/reviews
// @access  Private
const createReview = async (req, res, next) => {
  try {
    // Check if course exists
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user already reviewed this course
    const existingReview = await Review.findOne({
      course: req.params.courseId,
      user: req.user.id,
      isActive: true
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this course'
      });
    }

    const reviewData = {
      ...req.body,
      course: req.params.courseId,
      user: req.user.id
    };

    const review = await Review.create(reviewData);

    // Populate the created review
    await review.populate('user', 'fullName profile.profilePhoto');

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Make sure user owns the review
    if (review.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }

    review = await Review.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('user', 'fullName profile.profilePhoto');

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Make sure user owns the review
    if (review.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }

    await review.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourseReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview
};