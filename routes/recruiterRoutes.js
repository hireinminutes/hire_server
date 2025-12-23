const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
    getCompanyDetails,
    updateCompanyDetails
} = require('../controllers/recruiterController');

const router = express.Router();

// Middleware to ensure user is a recruiter
const isRecruiter = (req, res, next) => {
    if (req.user && req.user.role === 'employer') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Only recruiters can access this resource.'
        });
    }
};

// Middleware to ensure recruiter is approved
const isApproved = (req, res, next) => {
    if (req.user && req.user.isApproved) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Your account is pending admin approval.'
        });
    }
};

router.use(protect); // All routes require login
router.use(isRecruiter); // All routes require recruiter role

// Company Details Routes
router.get('/company', isApproved, getCompanyDetails);
router.put('/company', isApproved, updateCompanyDetails);

module.exports = router;
