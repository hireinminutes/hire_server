const Course = require('../models/Course');
const mongoose = require('mongoose');

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    let query = { isActive: true };

    // Search by course title or text search
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { shortDescription: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by level
    if (req.query.level) {
      query.level = req.query.level;
    }

    // Filter by language
    if (req.query.language) {
      query.language = req.query.language;
    }

    // Filter by certificate availability
    if (req.query.certificate === 'true') {
      query.certificateAvailable = true;
    }

    // Filter by price range
    if (req.query.priceMin || req.query.priceMax) {
      query.price = {};
      if (req.query.priceMin) {
        query.price.$gte = parseInt(req.query.priceMin);
      }
      if (req.query.priceMax) {
        query.price.$lte = parseInt(req.query.priceMax);
      }
    }

    // Filter by rating - need to use aggregation for virtual fields
    let coursesQuery = Course.find(query).populate('createdBy', 'fullName email');

    if (req.query.ratingMin) {
      // For rating filtering, we need to join with reviews
      const ratingMin = parseFloat(req.query.ratingMin);
      const courseIdsWithRating = await mongoose.connection.db.collection('reviews').aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$course',
            averageRating: { $avg: '$rating' }
          }
        },
        {
          $match: { averageRating: { $gte: ratingMin } }
        },
        {
          $project: { _id: 1 }
        }
      ]).toArray();

      const courseIds = courseIdsWithRating.map(item => item._id);
      coursesQuery = coursesQuery.where('_id').in(courseIds);
    }

    const total = await Course.countDocuments(query);
    const courses = await coursesQuery
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .lean(); // Use lean for faster queries

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      data: courses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
const getCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .lean(); // Use lean for faster query

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
const createCourse = async (req, res, next) => {
  try {
    // Add admin ID to req.body
    req.body.createdBy = req.user.id;

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
const deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Soft delete by setting isActive to false
    course.isActive = false;
    await course.save();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse
};