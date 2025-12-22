const express = require('express');
const {
  registerCollege,
  loginCollege,
  getCollegeProfile,
  updateCollegeProfile,
  checkCollegeDiscount,
  getCollegeStudents,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/collegeController');
const { protect, collegeOnly } = require('../middlewares/authMiddleware');

const router = express.Router();

// College authentication routes
router.post('/register', registerCollege);
router.post('/login', loginCollege);

// Protected college routes
router.get('/profile', protect, collegeOnly, getCollegeProfile);
router.put('/profile', protect, collegeOnly, updateCollegeProfile);

// Discount check route (for any authenticated user)
router.get('/check-discount', protect, checkCollegeDiscount);

// Student management routes
router.get('/students', protect, collegeOnly, getCollegeStudents);
router.post('/students', protect, collegeOnly, createStudent);
router.put('/students/:id', protect, collegeOnly, updateStudent);
router.delete('/students/:id', protect, collegeOnly, deleteStudent);

module.exports = router;