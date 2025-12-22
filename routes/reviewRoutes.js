const express = require('express');
const {
  getCourseReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Routes that include course ID
router.route('/courses/:courseId/reviews')
  .get(getCourseReviews)
  .post(protect, createReview);

// Routes for individual reviews
router.route('/:id')
  .get(getReview)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;