const jwt = require('jsonwebtoken');
const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const Admin = require('../models/Admin');
const College = require('../models/College');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Check if token exists and is not empty
      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from appropriate model based on role
      let Model;
      if (decoded.role === 'employer') {
        Model = Recruiter;
      } else if (decoded.role === 'job_seeker' || decoded.role === 'college_student') {
        Model = Candidate;
      } else if (decoded.role === 'admin') {
        Model = Admin;
      } else if (decoded.role === 'college') {
        Model = College;
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid user role'
        });
      }

      // Optimize: Exclude heavy Base64 fields from default auth check
      req.user = await Model.findById(decoded.id).select('-password -profile.company.images -recruiterOnboardingDetails.employmentProof -recruiterOnboardingDetails.company.images');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Add role to req.user for convenience
      req.user.role = decoded.role;

      // Ensure profile object is properly initialized for job seekers
      if (decoded.role === 'job_seeker' && req.user.profile) {
        if (!req.user.profile.location) req.user.profile.location = {};
        if (!req.user.profile.socialProfiles) req.user.profile.socialProfiles = {};
        if (!req.user.profile.codingProfiles) req.user.profile.codingProfiles = {};
        if (!req.user.profile.documents) req.user.profile.documents = {};
        if (!req.user.profile.skills) req.user.profile.skills = [];
        if (!req.user.profile.experience) req.user.profile.experience = [];
        if (!req.user.profile.education) req.user.profile.education = [];
        if (!req.user.profile.projects) req.user.profile.projects = [];
        if (!req.user.profile.certifications) req.user.profile.certifications = [];
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);

      let message = 'Not authorized, token failed';

      if (error.name === 'JsonWebTokenError') {
        if (error.message === 'jwt malformed') {
          message = 'Invalid token format';
        } else if (error.message === 'invalid signature') {
          message = 'Invalid token signature';
        } else {
          message = 'Invalid token';
        }
      } else if (error.name === 'TokenExpiredError') {
        message = 'Token expired';
      }

      return res.status(401).json({
        success: false,
        message
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

const collegeOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  if (req.user.role !== 'college') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. College privileges required.'
    });
  }

  // Set req.college for convenience in college routes
  req.college = req.user;

  next();
};

module.exports = { protect, authorize, adminOnly, collegeOnly };