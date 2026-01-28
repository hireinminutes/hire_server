const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const Candidate = require('../models/Candidate');
const Recruiter = require('../models/Recruiter');
const VerificationApplication = require('../models/VerificationApplication');
const Notification = require('../models/Notification');
const Ad = require('../models/Ad');

// Get all candidates
router.get('/candidates', protect, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    let query = Candidate.find()
      .select('fullName email profile.phone profile.location isVerified isProfileVerified skills experience plan interviewLinks interviewCount skillPassport createdAt')
      .sort({ createdAt: -1 });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const candidates = await query;

    // Format the data for frontend
    const formattedCandidates = candidates.map(candidate => ({
      id: candidate._id,
      name: candidate.fullName,
      email: candidate.email,
      phone: candidate.profile?.phone || 'N/A',
      location: candidate.profile?.location ?
        `${candidate.profile.location.city || ''}, ${candidate.profile.location.state || ''}, ${candidate.profile.location.country || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Not specified'
        : 'Not specified',
      skills: Array.isArray(candidate.profile?.skills) ?
        candidate.profile.skills.map(skill => typeof skill === 'string' ? skill : skill.name).filter(Boolean).slice(0, 5)
        : [],
      experience: candidate.profile?.experience && candidate.profile.experience.length > 0 ?
        `${candidate.profile.experience.length} position${candidate.profile.experience.length > 1 ? 's' : ''}`
        : 'No experience',
      status: candidate.isProfileVerified ? 'verified' : 'unverified',
      plan: (candidate.plan === 'basic' ? 'free' : candidate.plan) || 'free',
      interviewCount: candidate.interviewCount !== undefined ? candidate.interviewCount : (candidate.plan === 'premium' ? 1 : (candidate.plan === 'pro' ? 3 : 0)),
      joinDate: candidate.createdAt ? new Date(candidate.createdAt).toISOString().split('T')[0] : 'N/A',
      skillPassport: candidate.skillPassport,
      appliedJobs: 0 // This would need to be calculated from applications
    }));

    res.status(200).json({
      success: true,
      data: formattedCandidates
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
});

// Update candidate score (Admin only)
router.put('/candidates/:id/score', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, level, verifiedSkills, isVerified } = req.body;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (!candidate.skillPassport) {
      candidate.skillPassport = {};
    }

    candidate.skillPassport.score = score;
    candidate.skillPassport.level = level;
    candidate.skillPassport.verifiedSkills = verifiedSkills || [];
    candidate.skillPassport.verifiedAt = new Date();
    candidate.skillPassport.badgeId = `SP-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear().toString().substr(-2)}`;

    // Update verification status if provided
    if (isVerified !== undefined) {
      candidate.isProfileVerified = isVerified;
      if (isVerified) {
        candidate.verificationDate = new Date();
      }
    }

    await candidate.save();

    res.json({ success: true, message: 'Score updated', data: candidate.skillPassport });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ success: false, message: 'Failed to update score' });
  }
});

// Send interview link to candidate
router.post('/candidates/:id/interview', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { interviewLink } = req.body;

    if (!interviewLink) {
      return res.status(400).json({ success: false, message: 'Interview link is required' });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const plan = candidate.plan || 'starter';
    const currentCount = candidate.interviewLinks?.length || 0;

    // Check limits
    let limit = 0;
    if (plan === 'premium') limit = 1;
    else if (plan === 'pro') limit = 3;

    if (plan === 'starter' || plan === 'free') {
      return res.status(403).json({ success: false, message: 'Free and Starter plans do not include interview access.' });
    }

    if (currentCount >= limit) {
      return res.status(403).json({ success: false, message: `Interview limit reached for ${plan} plan (Max: ${limit}).` });
    }

    // Add link
    candidate.interviewLinks.push({
      link: interviewLink,
      sharedBy: req.user._id,
      sharedAt: new Date()
    });

    // Update count (optional if we trust array length, but good for quick access if schema has it)
    candidate.interviewCount = candidate.interviewLinks.length;

    await candidate.save();

    // Send notification
    await Notification.create({
      recipient: candidate._id,
      recipientModel: 'Candidate',
      type: 'interview_invite',
      title: 'New Interview Invitation',
      message: `You have received a new interview invitation! Link: ${interviewLink}`,
      data: { link: interviewLink }
    });

    res.status(200).json({
      success: true,
      message: 'Interview link sent successfully',
      data: {
        interviewCount: candidate.interviewLinks.length,
        remaining: limit - candidate.interviewLinks.length
      }
    });

  } catch (error) {
    console.error('Error sending interview link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send interview link',
      error: error.message
    });
  }
});

// Get verified candidates (accessible by recruiters)
router.get('/verified-candidates', protect, async (req, res) => {
  try {
    // Only allow recruiters and admins to access this endpoint
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only recruiters and admins can view verified candidates.'
      });
    }

    // Build query
    let query = {};

    // Check if filtering by specific plan
    if (req.query.plan && req.query.plan !== 'all') {
      query.plan = req.query.plan;
    } else {
      // Default: Show verified candidates OR any Paid users (Premium/Pro)
      // This ensures recruiters see all potential high-quality candidates
      query = {
        $or: [
          { isProfileVerified: true },
          { plan: { $in: ['premium', 'pro'] } }
        ]
      };
    }

    const verifiedCandidates = await Candidate.find(query)
      .select('fullName email isVerified isProfileVerified createdAt profile.phone profile.location profile.experience profile.skills profile.education profile.socialProfiles profile.projects plan')
      .sort({ createdAt: -1 })
      .lean();

    // Format the data for frontend
    const formattedCandidates = verifiedCandidates.map(candidate => {
      try {
        return {
          _id: candidate._id,
          profile: {
            fullName: candidate.fullName,
            email: candidate.email,
            phone: candidate.profile?.phone || '',
            location: (candidate.profile?.location && typeof candidate.profile.location === 'object') ?
              `${candidate.profile.location.city || ''}, ${candidate.profile.location.state || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Not specified'
              : 'Not specified',
            currentRole: (candidate.profile?.experience?.length > 0 && candidate.profile.experience[candidate.profile.experience.length - 1]) ?
              (candidate.profile.experience[candidate.profile.experience.length - 1].jobTitle || 'Professional')
              : 'Not specified',
            experience: candidate.profile?.experience?.length || 0,
            skills: Array.isArray(candidate.profile?.skills) ?
              candidate.profile.skills.map(skill => (skill && typeof skill === 'object') ? skill.name : skill).filter(Boolean)
              : [],
            education: (candidate.profile?.education?.length > 0 && candidate.profile.education[0]) ?
              (candidate.profile.education[0].degreeName || '') + ' from ' + (candidate.profile.education[0].institution || '')
              : 'Not specified',
            linkedin: candidate.profile?.socialProfiles?.linkedin || '',
            portfolio: (candidate.profile?.projects?.length > 0 && candidate.profile.projects[0]) ?
              (candidate.profile.projects[0].demoLink || '') : ''
          },
          verified: candidate.isProfileVerified,
          verifiedAt: candidate.createdAt,
          plan: candidate.plan || 'free'
        };
      } catch (err) {
        console.error('Error processing candidate:', candidate._id, err);
        return null;
      }
    }).filter(candidate => candidate !== null);

    res.status(200).json({
      success: true,
      data: formattedCandidates
    });
  } catch (error) {
    console.error('Error fetching verified candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verified candidates',
      error: error.message
    });
  }
});

// Get all recruiters (including unverified ones for approvals)
router.get('/recruiters', protect, adminOnly, async (req, res) => {
  try {
    const recruiters = await Recruiter.find()
      .select('fullName email profile.company.name profile.location isVerified createdAt approvalStatus approvalDate updatedAt')
      .sort({ createdAt: -1 });

    const formattedRecruiters = recruiters.map(recruiter => ({
      id: recruiter._id,
      name: recruiter.fullName,
      email: recruiter.email,
      company: recruiter.profile?.company?.name || 'Not specified',
      location: recruiter.profile?.location ?
        `${recruiter.profile.location.city || ''}, ${recruiter.profile.location.state || ''}, ${recruiter.profile.location.country || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Not specified'
        : 'Not specified',
      joinDate: recruiter.createdAt ? new Date(recruiter.createdAt).toISOString().split('T')[0] : 'N/A',
      status: recruiter.isVerified ? 'verified' : 'unverified',
      approvalStatus: recruiter.approvalStatus || 'pending',
      approvalDate: recruiter.approvalDate,
      updatedAt: recruiter.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedRecruiters
    });
  } catch (error) {
    console.error('Error fetching recruiters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recruiters',
      error: error.message
    });
  }
});

const {
  getPendingRecruiters,
  approveRecruiter,
  rejectRecruiter,
  getDashboardStats,
  sendBulkEmailToCandidates,
  getAllJobs,
  getColleges,
  approveCollege,
  rejectCollege,
  getCollegeStudents
} = require('../controllers/adminController');

// New Admin Controller Routes
router.get('/stats', protect, adminOnly, getDashboardStats);
router.get('/jobs', protect, adminOnly, getAllJobs);
router.get('/colleges', protect, adminOnly, getColleges);
router.put('/colleges/:id/approve', protect, adminOnly, approveCollege);
router.put('/colleges/:id/reject', protect, adminOnly, rejectCollege);
router.get('/colleges/:id/students', protect, adminOnly, getCollegeStudents);
router.post('/candidates/email', protect, adminOnly, sendBulkEmailToCandidates);
router.get('/recruiters/pending', protect, adminOnly, getPendingRecruiters);
router.put('/recruiters/:id/approve', protect, adminOnly, approveRecruiter);
router.put('/recruiters/:id/reject', protect, adminOnly, rejectRecruiter);

const contactController = require('../controllers/contactController');
router.get('/messages', protect, adminOnly, contactController.getAllContacts);

// Admin Notifications
router.get('/notifications', protect, adminOnly, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
      recipientModel: 'Admin'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/notifications/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Keep existing routes but ensuring no conflict.
// The previous "recruiter-approvals" routes used RecruiterApplication which seems unused by current Auth flow.
// We will keep them just in case but the UI will likely use the new endpoints.

// Get full recruiter profile
router.get('/recruiters/:recruiterId/profile', protect, adminOnly, async (req, res) => {
  try {
    const { recruiterId } = req.params;
    console.log('Fetching profile for recruiter ID:', recruiterId);

    const recruiter = await Recruiter.findById(recruiterId);

    if (!recruiter) {
      console.error('Recruiter not found:', recruiterId);
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    console.log('Recruiter found:', recruiter.fullName);

    // Try to get the latest application for this recruiter
    let application = null;
    try {
      const RecruiterApplication = require('../models/RecruiterApplication');
      application = await RecruiterApplication.findOne({
        recruiter: recruiterId
      }).sort({ createdAt: -1 });
      if (application) {
        console.log('Found RecruiterApplication');
      }
    } catch (err) {
      console.log('No RecruiterApplication model or no application found');
    }

    // Format response with application details or recruiter's own data
    const onboarding = recruiter.recruiterOnboardingDetails || {};
    const profile = recruiter.profile || {};
    const personalInfo = application?.personalInfo || {};
    const companyInfo = application?.companyInfo || {};
    const authorityInfo = application?.authorityInfo || {};

    const formattedProfile = {
      _id: recruiter._id,
      fullName: recruiter.fullName || 'N/A',
      email: recruiter.email || 'N/A',
      isVerified: recruiter.isVerified || false,
      createdAt: recruiter.createdAt,
      recruiterOnboardingDetails: {
        phone: onboarding.phone || personalInfo.phone || profile.phone || profile.workPhone || 'Not specified',
        phoneVerified: onboarding.phoneVerified || personalInfo.phoneVerified || false,
        jobTitle: onboarding.jobTitle || authorityInfo.jobTitle || profile.jobTitle || 'Not specified',
        employmentProof: onboarding.employmentProof || authorityInfo.employmentProof || profile.employmentProof || null,
        company: {
          name: onboarding.company?.name || companyInfo.name || profile.company?.name || 'Not specified',
          website: onboarding.company?.website || companyInfo.website || profile.company?.website || 'Not specified',
          logo: onboarding.company?.logo || companyInfo.logo || profile.company?.logo || null,
          size: onboarding.company?.size || companyInfo.size || profile.company?.size || 'Not specified',
          address: onboarding.company?.address || companyInfo.address || profile.company?.headOfficeLocation?.address || profile.location ? `${profile.location.city || ''}, ${profile.location.state || ''}, ${profile.location.country || ''}`.trim() : 'Not specified',
          images: onboarding.company?.images || companyInfo.images || profile.company?.images || [],
          socialLinks: {
            facebook: onboarding.company?.socialLinks?.facebook || companyInfo.socialLinks?.facebook || profile.company?.socialLinks?.facebook || '',
            linkedin: onboarding.company?.socialLinks?.linkedin || companyInfo.socialLinks?.linkedin || profile.company?.socialLinks?.linkedin || '',
            twitter: onboarding.company?.socialLinks?.twitter || companyInfo.socialLinks?.twitter || profile.company?.socialLinks?.twitter || '',
            instagram: onboarding.company?.socialLinks?.instagram || companyInfo.socialLinks?.instagram || profile.company?.socialLinks?.instagram || ''
          }
        },
        isComplete: onboarding.isComplete || !!application || !!profile.company,
        submittedAt: onboarding.submittedAt || application?.submittedAt || recruiter.createdAt
      }
    };

    console.log('Returning formatted profile for:', recruiter.fullName);
    res.status(200).json({
      success: true,
      data: formattedProfile
    });
  } catch (error) {
    console.error('Error fetching recruiter profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recruiter profile',
      error: error.message
    });
  }
});

// Delete user (candidate or recruiter)
router.delete('/users/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.body; // 'candidate' or 'recruiter'

    let Model;
    if (userType === 'candidate') {
      Model = Candidate;
    } else if (userType === 'recruiter') {
      Model = Recruiter;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be "candidate" or "recruiter"'
      });
    }

    const user = await Model.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} deleted successfully`,
      data: { deletedUser: user.fullName }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// Verify candidate
router.put('/candidates/:candidateId/verify', protect, adminOnly, async (req, res) => {
  try {
    const { candidateId } = req.params;

    // First, find the candidate to update skills
    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Verify all skills
    if (candidate.profile && candidate.profile.skills && candidate.profile.skills.length > 0) {
      candidate.profile.skills = candidate.profile.skills.map(skill => {
        // Handle both string and object formats
        if (typeof skill === 'string') {
          return {
            name: skill,
            isVerified: true,
            verifiedBy: req.user._id,
            verifiedAt: new Date()
          };
        }
        return {
          ...skill,
          isVerified: true,
          verifiedBy: req.user._id,
          verifiedAt: new Date()
        };
      });
    }

    // Verify all certifications
    if (candidate.profile && candidate.profile.certifications && candidate.profile.certifications.length > 0) {
      candidate.profile.certifications = candidate.profile.certifications.map(cert => ({
        ...cert,
        isVerified: true
      }));
    }

    // Set candidate as verified
    candidate.isProfileVerified = true;
    candidate.lastLogin = new Date();

    // Clean up any old incorrect fields
    if (candidate.profile && candidate.profile.isVerified !== undefined) {
      candidate.profile.isVerified = undefined;
    }

    // Save the updated candidate
    await candidate.save();

    res.status(200).json({
      success: true,
      message: 'Candidate verified successfully',
      data: {
        verifiedCandidate: candidate.fullName,
        isVerified: candidate.isVerified,
        verifiedSkillsCount: candidate.profile?.skills?.length || 0,
        verifiedCertificationsCount: candidate.profile?.certifications?.length || 0
      }
    });
  } catch (error) {
    console.error('Error verifying candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify candidate',
      error: error.message
    });
  }
});

// Get full candidate profile
router.get('/candidates/:candidateId/profile', protect, adminOnly, async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findById(candidateId)
      .select('-password');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: candidate
    });
  } catch (error) {
    console.error('Error fetching candidate profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidate profile',
      error: error.message
    });
  }
});

// Get all verification applications
router.get('/verification-applications', protect, adminOnly, async (req, res) => {
  try {
    const applications = await VerificationApplication.find()
      .populate('candidate', 'fullName email profile')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching verification applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch verification applications',
      error: error.message
    });
  }
});

// Approve verification application (Schedule meeting, but does NOT verify the candidate)
router.put('/verification-applications/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingDate, meetingTime, meetingLocation, meetingNotes } = req.body;

    // Validate required fields
    if (!meetingDate || !meetingTime || !meetingLocation) {
      return res.status(400).json({
        success: false,
        message: 'Meeting date, time, and location are required'
      });
    }

    const meetingDateObj = new Date(meetingDate);
    if (isNaN(meetingDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meeting date format'
      });
    }

    const application = await VerificationApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Verification application not found'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application has already been processed. Current status: ${application.status}`
      });
    }

    // Update application status
    application.status = 'approved';
    application.meetingDetails = {
      date: new Date(meetingDate),
      time: meetingTime,
      location: meetingLocation,
      notes: meetingNotes
    };
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    // Create notification for candidate
    await Notification.create({
      recipient: application.candidate,
      recipientModel: 'Candidate',
      type: 'verification_approved',
      title: 'Verification Meeting Scheduled',
      message: `Your verification application has been approved! A meeting has been scheduled for your verification process.\n\n📅 Date: ${meetingDate}\n🕐 Time: ${meetingTime}\n📍 Location: ${meetingLocation}${meetingNotes ? `\n📝 Notes: ${meetingNotes}` : ''}\n\nPlease be on time for your verification meeting. Bring any required documents.`,
      data: {
        applicationId: application._id,
        meetingDetails: application.meetingDetails
      }
    });

    res.status(200).json({
      success: true,
      message: 'Verification application approved successfully',
      data: application
    });
  } catch (error) {
    console.error('Error approving verification application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve verification application',
      error: error.message
    });
  }
});

// Verify candidate after successful meeting completion
router.put('/verification-applications/:id/verify-candidate', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationNotes } = req.body;

    const application = await VerificationApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Verification application not found'
      });
    }

    if (application.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved applications with scheduled meetings can proceed to verification'
      });
    }

    // Mark candidate as verified
    const candidate = await Candidate.findByIdAndUpdate(
      application.candidate,
      {
        isVerified: true,
        verificationDate: new Date()
      },
      { new: true }
    );

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Update application with verification notes
    application.reviewNotes = verificationNotes || 'Candidate successfully verified after meeting';
    await application.save();

    // Create notification for candidate
    await Notification.create({
      recipient: application.candidate,
      recipientModel: 'Candidate',
      type: 'verification_completed',
      title: '🎉 Verification Completed!',
      message: 'Congratulations! You have been successfully verified. Your profile now has a verified badge, which will increase your credibility with recruiters.',
      data: {
        applicationId: application._id,
        verifiedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Candidate verified successfully',
      data: {
        candidate: candidate.fullName,
        verifiedAt: candidate.verificationDate
      }
    });
  } catch (error) {
    console.error('Error verifying candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify candidate',
      error: error.message
    });
  }
});

// Reject verification application
router.put('/verification-applications/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const application = await VerificationApplication.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Verification application not found'
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application has already been processed. Current status: ${application.status}`
      });
    }

    // Update application status
    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    // Create notification for candidate
    await Notification.create({
      recipient: application.candidate,
      recipientModel: 'Candidate',
      type: 'verification_rejected',
      title: 'Verification Rejected',
      message: `Your verification application has been rejected. Reason: ${rejectionReason}`,
      data: {
        applicationId: application._id,
        rejectionReason: rejectionReason
      }
    });

    res.status(200).json({
      success: true,
      message: 'Verification application rejected successfully',
      data: application
    });
  } catch (error) {
    console.error('Error rejecting verification application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject verification application',
      error: error.message
    });
  }
});

// Alert Management Routes

const Alert = require('../models/Alert');

// Get all alerts
router.get('/alerts', protect, adminOnly, async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message
    });
  }
});

// Get active alerts (public endpoint for users)
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching active alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active alerts',
      error: error.message
    });
  }
});

// Create alert
router.post('/alerts', protect, adminOnly, async (req, res) => {
  try {
    const { name, message, images, video, showFor, links, isActive } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name and message are required'
      });
    }

    const alert = new Alert({
      name,
      message,
      images: images || [],
      video: video || '',
      showFor: showFor || 'both',
      links: links || [],
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create alert',
      error: error.message
    });
  }
});

// Update alert
router.put('/alerts/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, message, images, video, showFor, links, isActive } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (name) alert.name = name;
    if (message) alert.message = message;
    if (images !== undefined) alert.images = images;
    if (video !== undefined) alert.video = video;
    if (showFor) alert.showFor = showFor;
    if (links !== undefined) alert.links = links;
    if (isActive !== undefined) alert.isActive = isActive;

    await alert.save();

    res.status(200).json({
      success: true,
      message: 'Alert updated successfully',
      data: alert
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update alert',
      error: error.message
    });
  }
});

// Delete alert
router.delete('/alerts/:id', protect, adminOnly, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete alert',
      error: error.message
    });
  }
});

// ==================== ADS MANAGEMENT ====================

// Get all ads
// Get all ads with pagination
router.get('/ads', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const total = await Ad.countDocuments();

    const ads = await Ad.find()
      .select('title description ctaUrl ctaText isActive isPaused startDate endDate priority placement adType impressions clicks conversions createdBy displayDuration unskippableDuration frequency')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .populate('createdBy', 'fullName email')
      .lean();

    res.status(200).json({
      success: true,
      count: ads.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: ads
    });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ads',
      error: error.message
    });
  }
});

// Get active ads for users (public endpoint)
router.get('/ads/active', async (req, res) => {
  try {
    const now = new Date();
    const ads = await Ad.find({
      isActive: true,
      isPaused: { $ne: true }, // Exclude paused ads
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .sort({ priority: -1, createdAt: -1 })
      .select('-createdBy');

    res.status(200).json({
      success: true,
      data: ads
    });
  } catch (error) {
    console.error('Error fetching active ads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active ads',
      error: error.message
    });
  }
});

// Create ad
router.post('/ads', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, image, imageUrl, ctaText, ctaUrl, displayDuration, unskippableDuration, targetAudience, adType, placement, priority, startDate, endDate, isActive } = req.body;

    // Handle mapping from frontend fields to backend schema
    // Frontend sends 'placement' and 'imageUrl', backend expects 'adType' and 'image'
    const finalAdType = placement || adType || 'popup';
    const finalImage = imageUrl || image;

    if (!description) {
      throw new Error('Description is required');
    }

    if (!finalImage) {
      throw new Error('Image URL is required');
    }

    const ad = await Ad.create({
      title,
      description,
      image: finalImage,
      ctaText: ctaText || 'Learn More',
      ctaUrl,
      displayDuration: displayDuration || 10,
      unskippableDuration: unskippableDuration || 0,
      targetAudience: targetAudience || 'candidates',
      adType: finalAdType,
      priority: priority || 1,
      startDate: startDate || Date.now(),
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Ad created successfully',
      data: ad
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create ad',
      error: error.message
    });
  }
});

// Update ad
router.put('/ads/:id', protect, adminOnly, async (req, res) => {
  try {
    const { title, description, image, imageUrl, ctaText, ctaUrl, displayDuration, unskippableDuration, frequency, targetAudience, adType, placement, priority, startDate, endDate, isActive } = req.body;

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Handle mapping
    const finalAdType = placement || adType;
    const finalImage = imageUrl || image;

    // Update fields
    if (title) ad.title = title;
    if (description) ad.description = description;
    if (finalImage) ad.image = finalImage;
    if (ctaText) ad.ctaText = ctaText;
    if (ctaUrl) ad.ctaUrl = ctaUrl;
    if (displayDuration) ad.displayDuration = displayDuration;
    if (unskippableDuration !== undefined) ad.unskippableDuration = unskippableDuration;
    if (frequency !== undefined) ad.frequency = frequency;
    if (targetAudience) ad.targetAudience = targetAudience;
    if (finalAdType) ad.adType = finalAdType;
    if (priority) ad.priority = priority;
    if (startDate) ad.startDate = startDate;
    if (endDate) ad.endDate = endDate;
    if (isActive !== undefined) ad.isActive = isActive;

    await ad.save();

    res.status(200).json({
      success: true,
      message: 'Ad updated successfully',
      data: ad
    });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ad',
      error: error.message
    });
  }
});

// Pause/Resume ad
router.patch('/ads/:id/toggle-pause', protect, adminOnly, async (req, res) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Toggle pause status
    ad.isPaused = !ad.isPaused;
    await ad.save();

    res.status(200).json({
      success: true,
      message: `Ad ${ad.isPaused ? 'paused' : 'resumed'} successfully`,
      data: ad
    });
  } catch (error) {
    console.error('Error toggling ad pause status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle ad pause status',
      error: error.message
    });
  }
});

// Delete ad
router.delete('/ads/:id', protect, adminOnly, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete ad',
      error: error.message
    });
  }
});

// Track ad impression
router.post('/ads/:id/impression', async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, {
      $inc: { impressions: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Impression tracked'
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track impression'
    });
  }
});

// Track ad click
router.post('/ads/:id/click', async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, {
      $inc: { clicks: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Click tracked'
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track click'
    });
  }
});

// Get companies list for admin job posting
router.get('/companies', protect, adminOnly, async (req, res) => {
  try {
    const recruiters = await Recruiter.find({
      approvalStatus: 'approved',
      'profile.company.name': { $exists: true, $ne: '' }
    })
      .select('_id fullName profile.company email')
      .sort({ 'profile.company.name': 1 });

    const companies = recruiters.map(recruiter => ({
      id: recruiter._id,
      name: recruiter.profile?.company?.name || 'Unknown Company',
      logo: recruiter.profile?.company?.logo || null,
      recruiterName: recruiter.fullName,
      recruiterEmail: recruiter.email
    }));

    res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
});

// Post job as admin
router.post('/jobs', protect, adminOnly, async (req, res) => {
  try {
    const { companyId, customCompany, jobDetails } = req.body;

    if (!jobDetails) {
      return res.status(400).json({
        success: false,
        message: 'Job details are required'
      });
    }

    // Check if using existing company or custom company
    if (!companyId && !customCompany) {
      return res.status(400).json({
        success: false,
        message: 'Either company ID or custom company details are required'
      });
    }

    const Job = require('../models/Job');
    let companyInfo;

    if (customCompany && customCompany.name) {
      // Use custom company details
      companyInfo = {
        id: null,
        name: customCompany.name,
        logo: customCompany.logo || null,
        recruiterName: 'Admin',
        recruiterEmail: req.user.email
      };
    } else {
      // Verify existing company exists
      const recruiter = await Recruiter.findById(companyId);
      if (!recruiter) {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      companyInfo = {
        id: recruiter._id,
        name: recruiter.profile?.company?.name || 'Unknown Company',
        logo: recruiter.profile?.company?.logo || null,
        recruiterName: recruiter.fullName,
        recruiterEmail: recruiter.email
      };
    }

    // Extract fields that need to be at the root level of Job schema
    const { benefits, applicationDeadline, ...restJobDetails } = jobDetails;

    // Process benefits (convert string to array if needed)
    let processedBenefits = [];
    if (typeof benefits === 'string') {
      processedBenefits = benefits
        .split(/[,\n]/) // Split by comma or newline
        .map(b => b.trim())
        .filter(b => b.length > 0);
    } else if (Array.isArray(benefits)) {
      processedBenefits = benefits;
    }

    // Process applicationDeadline (handle empty string)
    const finalApplicationDeadline = applicationDeadline ? applicationDeadline : undefined;

    // --- Data Normalization ---
    // Fix Enum Case Mismatches
    if (restJobDetails.basicInfo) {
      // 1. Employment Type: lowercase
      if (restJobDetails.basicInfo.employmentType) {
        restJobDetails.basicInfo.employmentType = restJobDetails.basicInfo.employmentType.toLowerCase();
      }

      // 2. Work Mode: lowercase
      if (restJobDetails.basicInfo.workMode) {
        restJobDetails.basicInfo.workMode = restJobDetails.basicInfo.workMode.toLowerCase();
      }

      // 3. Job Level: Map Frontend Labels to Backend Enums
      // Frontend: Entry-level, Mid-level, Senior-level, Lead, Executive
      // Backend: fresher, junior, mid-level, senior, lead, director
      const jobLevelMap = {
        'entry-level': 'fresher',
        'mid-level': 'mid-level',
        'senior-level': 'senior',
        'lead': 'lead',
        'executive': 'director'
      };
      if (restJobDetails.basicInfo.jobLevel) {
        const key = restJobDetails.basicInfo.jobLevel.toLowerCase();
        // Default to 'fresher' if map fails, or keep if it already matches valid enums
        restJobDetails.basicInfo.jobLevel = jobLevelMap[key] || restJobDetails.basicInfo.jobLevel.toLowerCase();
      }
    }

    if (restJobDetails.compensation) {
      // Salary Type: lowercase
      if (restJobDetails.compensation.salaryType) {
        restJobDetails.compensation.salaryType = restJobDetails.compensation.salaryType.toLowerCase();
      }
    }

    if (restJobDetails.qualifications) {
      // Preferred Education: handle empty string
      if (restJobDetails.qualifications.preferredEducation === '') {
        restJobDetails.qualifications.preferredEducation = undefined;
      }
      // Minimum Education: lowercase (if needed, though usually standard)
      if (restJobDetails.qualifications.minimumEducation) {
        restJobDetails.qualifications.minimumEducation = restJobDetails.qualifications.minimumEducation.toLowerCase();
      }
    }

    if (restJobDetails.location && restJobDetails.location.workplaceType) {
      // Map 'On-site' -> 'onsite'
      if (restJobDetails.location.workplaceType === 'On-site') {
        restJobDetails.basicInfo = { ...restJobDetails.basicInfo, workMode: 'onsite' }; // Sync workMode
        // Remove workplaceType from location if not in schema, 
        // but 'location.officeAddress' is there. 'workplaceType' is likely 'basicInfo.workMode' in schema.
        // Looking at schema: basicInfo.workMode exists. location.workplaceType DOES NOT exist in schema.
        // So we should map location.workplaceType to basicInfo.workMode if not already set.
      } else if (restJobDetails.location.workplaceType) {
        restJobDetails.basicInfo.workMode = restJobDetails.location.workplaceType.toLowerCase();
      }
      // Remove the extra field to avoid strict mode warning if enabled (though not causing 500)
      delete restJobDetails.location.workplaceType;
    }
    // ---------------------------

    // Create job with admin as poster
    const job = await Job.create({
      jobDetails: restJobDetails, // Nest the rest under jobDetails
      benefits: processedBenefits, // Root level
      applicationDeadline: finalApplicationDeadline, // Root level
      postedBy: req.user._id,
      postedByAdmin: true,
      companyInfo,
      status: 'active',
      createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      data: job
    });
  } catch (error) {
    console.error('Error posting job as admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post job',
      error: error.message
    });
  }
});

// Delete job as admin
router.delete('/jobs/:id', protect, adminOnly, async (req, res) => {
  try {
    const Job = require('../models/Job');
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    console.error('Error deleting job as admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
});

// Get activity logs
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const { action, startDate, endDate, search, limit = 50, page = 1 } = req.query;
    const ActivityLog = require('../models/ActivityLog');
    const Candidate = require('../models/Candidate');
    const Recruiter = require('../models/Recruiter');

    let query = {};

    // Filter by Action
    if (action) {
      query.action = action;
    }

    // Filter by Date Range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filter by Search (User Name)
    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // Find users matching the name
      const [candidates, recruiters] = await Promise.all([
        Candidate.find({ fullName: searchRegex }).select('_id'),
        Recruiter.find({ fullName: searchRegex }).select('_id')
      ]);

      const userIds = [
        ...candidates.map(c => c._id),
        ...recruiters.map(r => r._id)
      ];

      if (userIds.length > 0) {
        query.user = { $in: userIds };
      } else {
        // If search provided but no users found, return empty result strictly
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          total: 0,
          pages: 0
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute Query
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'fullName email profilePicture profile.company.name'); // Populate common fields

    const total = await ActivityLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
      error: error.message
    });
  }
});

module.exports = router;
