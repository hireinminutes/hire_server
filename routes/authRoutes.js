const express = require('express');
const {
  register,
  login,
  verifyOTP,
  getMe,
  updateProfile,
  changePassword,
  updateEmailNotifications,
  getUserPreferences,
  updateUserPreferences,
  uploadProfilePicture,
  forgotPassword,
  resetPassword,
  enableTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  sendTwoFactorLoginOTP,
  verifyTwoFactorLoginOTP,
  deleteAccount
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware'); // Import upload middleware
const VerificationApplication = require('../models/VerificationApplication');
const Notification = require('../models/Notification');
const Candidate = require('../models/Candidate');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/update-profile', protect, updateProfile); // Additional endpoint for onboarding
router.post('/upload-profile-picture', protect, upload.single('file'), uploadProfilePicture); // New route
router.put('/change-password', protect, changePassword);
router.put('/email-notifications', protect, updateEmailNotifications);
router.get('/preferences', protect, getUserPreferences);
router.put('/preferences', protect, updateUserPreferences);

// Verification application routes (for candidates)
router.post('/verification-application', protect, async (req, res) => {
  try {
    // Check if user is a candidate
    if (req.user.role !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can submit verification applications'
      });
    }

    // Check if candidate already has a pending application
    const existingApplication = await VerificationApplication.findOne({
      candidate: req.user.id,
      status: 'pending'
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification application'
      });
    }

    // Check if candidate is already verified
    const candidate = await Candidate.findById(req.user.id);
    if (candidate.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'You are already verified'
      });
    }

    // Create verification application
    const application = await VerificationApplication.create({
      candidate: req.user.id
    });

    // Create notification for admin (you might want to notify all admins)
    const Admin = require('../models/Admin');
    const admins = await Admin.find({ isActive: true });

    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'application_submitted',
        title: 'New Verification Application',
        message: `${candidate.fullName} has submitted a verification application`,
        data: {
          candidateId: candidate._id,
          candidateName: candidate.fullName,
          applicationId: application._id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Verification application submitted successfully',
      data: application
    });
  } catch (error) {
    console.error('Error submitting verification application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit verification application',
      error: error.message
    });
  }
});

// Get user's verification application status
router.get('/verification-status', protect, async (req, res) => {
  try {
    if (req.user.role !== 'job_seeker') {
      return res.status(403).json({
        success: false,
        message: 'Only candidates can check verification status'
      });
    }

    const application = await VerificationApplication.findOne({
      candidate: req.user.id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: application || null
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification status',
      error: error.message
    });
  }
});

// Get user notifications
// Get user notifications
router.get('/notifications', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = {
      recipient: req.user.id,
      recipientModel: req.user.role === 'job_seeker' ? 'Candidate' :
        req.user.role === 'employer' ? 'Recruiter' : 'Admin'
    };

    const total = await Notification.countDocuments(query);

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .lean();

    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user.id,
        recipientModel: req.user.role === 'job_seeker' ? 'Candidate' :
          req.user.role === 'employer' ? 'Recruiter' : 'Admin'
      },
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Delete notification
router.delete('/notifications/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
});

// Create recruiter application for admin review
router.post('/recruiter-application', protect, async (req, res) => {
  try {
    // Check if user is a recruiter
    if (req.user.role !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only recruiters can submit applications'
      });
    }

    // Check if recruiter already has a pending application
    const existingApplication = await require('../models/RecruiterApplication').findOne({
      recruiter: req.user.id,
      status: 'pending'
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending application'
      });
    }

    // Check if recruiter is already approved
    const recruiter = await require('../models/Recruiter').findById(req.user.id);
    if (recruiter.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Your account is already approved'
      });
    }

    const applicationData = req.body;

    // Create application
    const application = await require('../models/RecruiterApplication').create({
      recruiter: req.user.id,
      personalInfo: {
        fullName: applicationData.personalInfo?.fullName || recruiter.fullName,
        phone: applicationData.personalInfo?.phone,
        phoneVerified: applicationData.personalInfo?.phoneVerified || false
      },
      companyInfo: {
        name: applicationData.companyInfo?.name,
        website: applicationData.companyInfo?.website,
        logo: applicationData.companyInfo?.logo,
        size: applicationData.companyInfo?.size,
        address: applicationData.companyInfo?.address,
        images: applicationData.companyInfo?.images || [],
        socialLinks: applicationData.companyInfo?.socialLinks || {}
      },
      authorityInfo: {
        jobTitle: applicationData.authorityInfo?.jobTitle,
        employmentProof: applicationData.authorityInfo?.employmentProof
      }
    });

    // Update recruiter onboarding status
    await require('../models/Recruiter').findByIdAndUpdate(req.user.id, {
      'recruiterOnboardingDetails.isComplete': true,
      'recruiterOnboardingDetails.submittedAt': new Date()
    });

    // Create notification for admin
    const Admin = require('../models/Admin');
    const admins = await Admin.find({ isActive: true });

    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'recruiter_application_submitted',
        title: 'New Recruiter Application',
        message: `${recruiter.fullName} has submitted a recruiter verification application`,
        data: {
          recruiterId: recruiter._id,
          recruiterName: recruiter.fullName,
          applicationId: application._id
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Your account is pending admin approval.',
      data: application
    });
  } catch (error) {
    console.error('Error submitting recruiter application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
});

// Delete account
router.post('/delete-account', protect, deleteAccount);

// Two-Factor Authentication routes
router.post('/enable-2fa', protect, enableTwoFactor);
router.post('/verify-2fa-setup', protect, verifyTwoFactorSetup);
router.post('/disable-2fa', protect, disableTwoFactor);
router.post('/send-2fa-login-otp', sendTwoFactorLoginOTP);
router.post('/verify-2fa-login-otp', verifyTwoFactorLoginOTP);

module.exports = router;