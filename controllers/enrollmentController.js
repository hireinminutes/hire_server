const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Get all enrollments for a candidate
exports.getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      candidate: req.user.id,
      status: { $in: ['active', 'completed'] }
    })
      .populate({
        path: 'course',
        select: 'title shortDescription thumbnail instructorName estimatedDuration totalLessons category level averageRating reviewCount certificateAvailable'
      })
      .sort({ enrolledAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments
    });
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error: error.message
    });
  }
};

// Enroll in a course
exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      candidate: req.user.id,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      candidate: req.user.id,
      course: courseId
    });

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate({
        path: 'course',
        select: 'title shortDescription thumbnail instructorName estimatedDuration totalLessons category level averageRating reviewCount certificateAvailable'
      });

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in course',
      data: populatedEnrollment
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling in course',
      error: error.message
    });
  }
};

// Update enrollment progress
exports.updateProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { moduleIndex, lessonIndex } = req.body;

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      candidate: req.user.id
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Add completed lesson
    const alreadyCompleted = enrollment.completedLessons.some(
      lesson => lesson.moduleIndex === moduleIndex && lesson.lessonIndex === lessonIndex
    );

    if (!alreadyCompleted) {
      enrollment.completedLessons.push({
        moduleIndex,
        lessonIndex,
        completedAt: new Date()
      });

      // Calculate progress
      const course = await Course.findById(enrollment.course);
      if (course && course.courseContent.length > 0) {
        const totalLessons = course.courseContent.reduce((sum, module) => 
          sum + (module.lessons ? module.lessons.length : 0), 0
        );
        enrollment.progress = Math.round((enrollment.completedLessons.length / totalLessons) * 100);

        // Mark as completed if 100%
        if (enrollment.progress === 100) {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
        }
      }

      await enrollment.save();
    }

    res.status(200).json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

// Check enrollment status
exports.checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      candidate: req.user.id,
      course: courseId
    });

    res.status(200).json({
      success: true,
      isEnrolled: !!enrollment,
      enrollment: enrollment || null
    });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking enrollment',
      error: error.message
    });
  }
};
