const express = require('express');
const {
  getMyEnrollments,
  enrollInCourse,
  updateProgress,
  checkEnrollment
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication as candidate
router.use(protect);

// Get my enrollments
router.get('/my-enrollments', getMyEnrollments);

// Check enrollment status for a course
router.get('/check/:courseId', checkEnrollment);

// Enroll in a course
router.post('/enroll/:courseId', enrollInCourse);

// Update progress
router.put('/progress/:enrollmentId', updateProgress);

module.exports = router;
