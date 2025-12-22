const College = require('../models/College');
const Candidate = require('../models/Candidate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @desc    Register a new college
// @route   POST /api/auth/college/register
// @access  Public
const registerCollege = async (req, res) => {
  try {
    const { name, email, password, contactNumber, address, website, description, accreditation, establishedYear } = req.body;

    // Check if college already exists
    const collegeExists = await College.findOne({ email });
    if (collegeExists) {
      return res.status(400).json({
        success: false,
        message: 'College with this email already exists'
      });
    }

    // Create college (password will be hashed by the model pre-save middleware)
    const college = await College.create({
      name,
      email,
      password,
      contactNumber,
      address,
      website,
      description,
      accreditation,
      establishedYear
    });

    if (college) {
      res.status(201).json({
        success: true,
        message: 'College registered successfully',
        data: {
          _id: college._id,
          name: college.name,
          email: college.email,
          token: generateToken(college._id)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid college data'
      });
    }
  } catch (error) {
    console.error('College registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Authenticate college login
// @route   POST /api/auth/college/login
// @access  Public
const loginCollege = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if college exists
    const college = await College.findOne({ email });
    if (!college) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, college.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: college._id,
        name: college.name,
        email: college.email,
        role: 'college',
        isVerified: college.isVerified,
        verificationStatus: college.verificationStatus,
        token: generateToken(college._id, 'college')
      }
    });
  } catch (error) {
    console.error('College login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get college profile
// @route   GET /api/college/profile
// @access  Private (College only)
const getCollegeProfile = async (req, res) => {
  try {
    const college = await College.findById(req.college._id)
      .populate('students', 'fullName email profile.skills profile.location isVerified')
      .select('-password');

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    res.json({
      success: true,
      data: college
    });
  } catch (error) {
    console.error('Get college profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check if user has college discount
// @route   GET /api/college/check-discount
// @access  Private (Authenticated users)
const checkCollegeDiscount = async (req, res) => {
  try {
    // Check if user is a candidate and has a college that exists in our system
    if (req.user.role === 'job_seeker' && req.user.college) {
      const collegeExists = await College.findById(req.user.college);
      if (collegeExists) {
        return res.json({
          success: true,
          hasDiscount: true,
          collegeName: collegeExists.name,
          message: 'Your college is our partner, so enjoy 20% discount on payments!'
        });
      }
    }

    res.json({
      success: true,
      hasDiscount: false
    });
  } catch (error) {
    console.error('Check college discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update college profile
// @route   PUT /api/college/profile
// @access  Private (College only)
const updateCollegeProfile = async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password; // Don't allow password update through this endpoint
    delete updates.students; // Don't allow students array update through this endpoint

    const college = await College.findByIdAndUpdate(
      req.college._id,
      { ...updates, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: college
    });
  } catch (error) {
    console.error('Update college profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all students/candidates under the college
// @route   GET /api/college/students
// @access  Private (College only)
const getCollegeStudents = async (req, res) => {
  try {
    // Get students who belong to this college
    const students = await Candidate.find({ 
      college: req.college._id,
      role: 'college_student'
    })
    .select('fullName email profile.skills profile.location profile.phone isVerified createdAt')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get college students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create a new student/candidate under the college
// @route   POST /api/college/students
// @access  Private (College only)
const createStudent = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if student with this email already exists
    const existingStudent = await Candidate.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create student with minimal profile
    const student = await Candidate.create({
      fullName,
      email,
      password: hashedPassword,
      role: 'college_student',
      college: req.college._id,
      profile: {} // Empty profile that student can fill later
    });

    // Add student to college's students array (for backward compatibility)
    await College.findByIdAndUpdate(
      req.college._id,
      { $push: { students: student._id } }
    );

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        role: student.role,
        college: student.college
      }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update student information
// @route   PUT /api/college/students/:id
// @access  Private (College only)
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if student belongs to this college
    const college = await College.findById(req.college._id);
    if (!college.students.includes(id)) {
      return res.status(403).json({
        success: false,
        message: 'Student does not belong to this college'
      });
    }

    const student = await Candidate.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/college/students/:id
// @access  Private (College only)
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student belongs to this college
    const college = await College.findById(req.college._id);
    if (!college.students.includes(id)) {
      return res.status(403).json({
        success: false,
        message: 'Student does not belong to this college'
      });
    }

    // Remove student from college's students array
    await College.findByIdAndUpdate(
      req.college._id,
      { $pull: { students: id } }
    );

    // Delete the student
    await Candidate.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  registerCollege,
  loginCollege,
  getCollegeProfile,
  updateCollegeProfile,
  checkCollegeDiscount,
  getCollegeStudents,
  createStudent,
  updateStudent,
  deleteStudent
};