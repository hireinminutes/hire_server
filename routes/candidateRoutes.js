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

// Public route to get candidate profile by slug
router.get('/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const candidate = await Candidate.findOne({ slug }).select('-password -resetPasswordToken -resetPasswordExpire -verificationToken');

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

module.exports = router;