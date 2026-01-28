const express = require('express');
const Candidate = require('../models/Candidate');

const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');

// Subscribe to plan
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['free', 'starter', 'premium', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const candidate = await Candidate.findById(req.user.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Update plan details
    candidate.plan = plan;
    candidate.planActivatedAt = Date.now();

    // Set interview count based on plan
    if (plan === 'premium') candidate.interviewCount = 1;
    else if (plan === 'pro') candidate.interviewCount = 3;
    else candidate.interviewCount = 0;

    await candidate.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      data: {
        plan: candidate.plan,
        interviewCount: candidate.interviewCount
      }
    });
  } catch (error) {
    console.error('Error subscribing to plan:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public route to get candidate profile by slug or ID
router.get('/profile/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    let query;
    // Check if identifier looks like a valid MongoDB ObjectId
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ slug: identifier }, { _id: identifier }] };
    } else {
      query = { slug: identifier };
    }

    const candidate = await Candidate.findOne(query).select('-password -resetPasswordToken -resetPasswordExpire -verificationToken');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    // Get public profile data (exclude sensitive information)
    const publicProfile = {
      _id: candidate._id,
      fullName: candidate.fullName,
      slug: candidate.slug,
      profilePicture: candidate.profilePicture,
      profile: {
        profilePhoto: candidate.profile?.profilePhoto,
        location: candidate.profile?.location,
        professionalSummary: candidate.profile?.professionalSummary,
        skills: candidate.profile?.skills?.map(skill => ({
          name: skill.name || skill,
          isVerified: skill.isVerified || false
        })),
        experience: candidate.profile?.experience,
        education: candidate.profile?.education,
        projects: candidate.profile?.projects,
        certifications: candidate.profile?.certifications,
        socialProfiles: candidate.profile?.socialProfiles,
        codingProfiles: candidate.profile?.codingProfiles
      },
      email: candidate.email, // Include email if it's public/allowed, usually needed for contact
      isVerified: candidate.isVerified || false,
      profileCompletion: candidate.profileCompletion || { overall: 0 },
      createdAt: candidate.createdAt
    };

    res.json({
      success: true,
      data: publicProfile
    });
  } catch (error) {
    console.error('Error fetching candidate profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

const Notification = require('../models/Notification');

// Send interview invitation (Admin/Recruiter only)
router.post('/invite', protect, async (req, res) => {
  try {
    const { candidateId, link, message } = req.body;

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Create notification
    const notification = await Notification.create({
      recipient: candidateId,
      recipientModel: 'Candidate',
      type: 'meeting_scheduled',
      title: 'Interview Invitation',
      message: message || `You have been invited to an interview! Click here to join: ${link}`,
      data: { link }
    });

    // Decrement interview count if applicable (optional logic based on business rules)
    if (candidate.interviewCount > 0) {
      candidate.interviewCount -= 1;
      await candidate.save();
    }

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update interview credits (Admin/Recruiter only)
router.put('/credits', protect, async (req, res) => {
  try {
    const { candidateId, count } = req.body;
    console.log('Update Credits Request:', { candidateId, count });

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (count < 0) {
      return res.status(400).json({ success: false, message: 'Count cannot be negative' });
    }

    candidate.interviewCount = count;
    await candidate.save();

    res.json({
      success: true,
      message: 'Interview credits updated successfully',
      data: {
        interviewCount: candidate.interviewCount
      }
    });
  } catch (error) {
    console.error('Error updating credits:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Request guaranteed interview (Job Seeker only) - General request to Admin
router.post('/request-interview', protect, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (candidate.interviewCount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'You have no interview credits left. Please upgrade your plan.'
      });
    }

    // Decrement credit
    candidate.interviewCount -= 1;
    await candidate.save();

    // Notify all Admins
    const Admin = require('../models/Admin');
    const Notification = require('../models/Notification');
    const admins = await Admin.find({ isActive: true });

    const notificationPromises = admins.map(admin => {
      return Notification.create({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'interview_invite',
        title: 'New Interview Request!',
        message: `${candidate.fullName} (${candidate.email}) has requested a guaranteed interview.`,
        data: {
          candidateId: candidate._id,
          candidateName: candidate.fullName
        }
      });
    });

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: 'Interview requested successfully! Our team will contact you soon.',
      data: {
        interviewCount: candidate.interviewCount
      }
    });
  } catch (error) {
    console.error('Error requesting interview:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;