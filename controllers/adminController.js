const Recruiter = require('../models/Recruiter');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const Course = require('../models/Course');
const College = require('../models/College');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// @desc    Get all colleges
// @route   GET /api/admin/colleges
// @access  Private/Admin
const getColleges = async (req, res, next) => {
  try {
    const colleges = await College.find()
      .select('name email address isVerified verificationStatus students createdAt')
      .sort({ createdAt: -1 });

    const formattedColleges = colleges.map(college => ({
      id: college._id,
      name: college.name,
      email: college.email,
      location: college.address ?
        `${college.address.city || ''}, ${college.address.state || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || 'Not specified'
        : 'Not specified',
      studentsCount: college.students ? college.students.length : 0,
      status: college.isVerified ? 'verified' : (college.verificationStatus || 'unverified'),
      joinDate: college.createdAt ? new Date(college.createdAt).toISOString().split('T')[0] : 'N/A'
    }));

    res.status(200).json({
      success: true,
      count: colleges.length,
      data: formattedColleges
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending recruiters
// @route   GET /api/admin/recruiters/pending
// @access  Private/Admin
const getPendingRecruiters = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    let query = Recruiter.find({
      'approvalStatus': 'pending',
      'isApproved': false,
      'isVerified': true // Only show verified emails
    }).select('-password').sort({ createdAt: -1 });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const recruiters = await query;

    res.status(200).json({
      success: true,
      count: recruiters.length,
      data: recruiters
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a recruiter
// @route   PUT /api/admin/recruiters/:id/approve
// @access  Private/Admin
const approveRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    if (recruiter.isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Recruiter is already approved'
      });
    }

    recruiter.isApproved = true;
    recruiter.approvalStatus = 'approved';
    recruiter.approvedBy = req.user._id;
    recruiter.approvalDate = Date.now();
    recruiter.rejectionReason = undefined;

    await recruiter.save();

    // Send Approval Email
    try {
      // You might want to add a specific template for this
      const emailContent = {
        subject: 'Account Approved - Hire In Minutes',
        text: `Hello ${recruiter.fullName},\n\nYour recruiter account has been approved by our admin team. You can now log in and start posting jobs.\n\nLogin here: ${process.env.CLIENT_URL}/login\n\nBest regards,\nHire In Minutes Team`,
        html: `<p>Hello ${recruiter.fullName},</p><p>Your recruiter account has been approved by our admin team. You can now log in and start posting jobs.</p><p><a href="${process.env.CLIENT_URL}/login">Login here</a></p><p>Best regards,<br>Hire In Minutes Team</p>`
      };

      await sendEmail({
        email: recruiter.email,
        subject: emailContent.subject,
        message: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      console.error('Approval email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a recruiter
// @route   PUT /api/admin/recruiters/:id/reject
// @access  Private/Admin
const rejectRecruiter = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection reason'
      });
    }

    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: 'Recruiter not found'
      });
    }

    recruiter.isApproved = false;
    recruiter.approvalStatus = 'rejected';
    recruiter.approvedBy = req.user._id; // Admin who rejected
    recruiter.rejectionReason = reason;

    await recruiter.save();

    // Send Rejection Email
    try {
      const emailContent = {
        subject: 'Account Update - Hire In Minutes',
        text: `Hello ${recruiter.fullName},\n\nYour recruiter account application has been reviewed and unfortunately rejected.\n\nReason: ${reason}\n\nIf you believe this is a mistake, please contact support.\n\nBest regards,\nHire In Minutes Team`,
        html: `<p>Hello ${recruiter.fullName},</p><p>Your recruiter account application has been reviewed and unfortunately rejected.</p><p><strong>Reason:</strong> ${reason}</p><p>If you believe this is a mistake, please contact support.</p><p>Best regards,<br>Hire In Minutes Team</p>`
      };

      await sendEmail({
        email: recruiter.email,
        subject: emailContent.subject,
        message: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      console.error('Rejection email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      data: recruiter
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [candidatesCount, recruitersCount, pendingApprovalsCount, jobsCount, coursesCount] = await Promise.all([
      Candidate.countDocuments(),
      Recruiter.countDocuments(),
      Recruiter.countDocuments({ approvalStatus: 'pending', isApproved: false, isVerified: true }),
      Job.countDocuments(),
      Course.countDocuments()
    ]);

    // Calculate revenue (mock for now as we don't have Payments model integrated here yet)
    // In a real scenario, we would aggregate Payment documents
    const totalRevenue = 499 * candidatesCount * 0.1; // Mock revenue: 10% of candidates paid

    res.status(200).json({
      success: true,
      data: {
        totalCandidates: candidatesCount,
        totalRecruiters: recruitersCount,
        pendingApprovals: pendingApprovalsCount,
        totalJobs: jobsCount,
        activeCourses: coursesCount,
        totalRevenue,
        candidatesGrowth: 15, // Mock growth
        recruitersGrowth: 8,
        jobsGrowth: 12,
        approvalsGrowth: 5,
        revenueGrowth: 10,
        coursesGrowth: 2
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk email to candidates
// @route   POST /api/admin/candidates/email
// @access  Private/Admin
const sendBulkEmailToCandidates = async (req, res, next) => {
  try {
    const { userType, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subject and message'
      });
    }

    let query = {};
    if (userType && userType !== 'All') {
      query.plan = userType.toLowerCase();
    }

    // Only active candidates
    query.isActive = { $ne: false };

    const candidates = await Candidate.find(query).select('email fullName');

    if (candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No candidates found with the selected criteria'
      });
    }

    // Send emails in parallel (consider using a queue for large numbers in production)
    const emailPromises = candidates.map(candidate => {
      const emailTemplate = emailTemplates.bulkAdminMessage(candidate.fullName || 'User', subject, message);

      return sendEmail({
        email: candidate.email,
        subject: emailTemplate.subject,
        message: emailTemplate.text,
        html: emailTemplate.html
      }).catch(err => {
        console.error(`Failed to send email to ${candidate.email}:`, err);
        return null; // Continue with others even if one fails
      });
    });

    await Promise.all(emailPromises);

    res.status(200).json({
      success: true,
      count: candidates.length,
      message: `Emails sent successfully to ${candidates.length} candidates`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all jobs for admin
// @route   GET /api/admin/jobs
// @access  Private/Admin
const getAllJobs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    const search = req.query.search;

    let query = Job.find();

    // Search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query = Job.find({
        $or: [
          { 'jobDetails.basicInfo.jobTitle': searchRegex },
          { 'jobDetails.companyInfo.companyName': searchRegex },
          { 'companyInfo.name': searchRegex }
        ]
      });
    }

    // Sort by newest first
    query = query.sort({ createdAt: -1 });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const jobs = await query
      .populate('postedBy', 'fullName email profile.company.name profile.company.logo')
      .lean();

    // Ensure applicationCount and views are present (should be in schema default, but good to double check)
    // Also ensuring we return specific fields expected by frontend if needed, 
    // but the schema already has applicationCount and views at root level.

    res.status(200).json({
      success: true,
      count: jobs.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve a college
// @route   PUT /api/admin/colleges/:id/approve
// @access  Private/Admin
const approveCollege = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    if (college.verificationStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'College is already approved'
      });
    }

    college.verificationStatus = 'approved';
    await college.save();

    // Send Approval Email
    try {
      const emailContent = {
        subject: 'College Account Approved - Hire In Minutes',
        text: `Hello ${college.name},\n\nYour college account has been approved by our admin team. You can now log in and manage your students.\n\nLogin here: ${process.env.CLIENT_URL}/college/login\n\nBest regards,\nHire In Minutes Team`,
        html: `<p>Hello ${college.name},</p><p>Your college account has been approved by our admin team. You can now log in and manage your students.</p><p><a href="${process.env.CLIENT_URL}/college/login">Login here</a></p><p>Best regards,<br>Hire In Minutes Team</p>`
      };

      await sendEmail({
        email: college.email,
        subject: emailContent.subject,
        message: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      console.error('College approval email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'College approved successfully',
      data: {
        id: college._id,
        name: college.name,
        status: college.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a college
// @route   PUT /api/admin/colleges/:id/reject
// @access  Private/Admin
const rejectCollege = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const college = await College.findById(req.params.id);

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    college.verificationStatus = 'rejected';
    // We optionally save the rejection reason if the schema supports it, 
    // or just log it. The College model currently doesn't have rejectionReason, 
    // so we'll just update status.
    await college.save();

    // Send Rejection Email
    try {
      const emailContent = {
        subject: 'College Account Status - Hire In Minutes',
        text: `Hello ${college.name},\n\nYour college account application has been reviewed and unfortunately rejected.\n\nReason: ${reason || 'Does not meet our criteria'}\n\nIf you believe this is a mistake, please contact support.\n\nBest regards,\nHire In Minutes Team`,
        html: `<p>Hello ${college.name},</p><p>Your college account application has been reviewed and unfortunately rejected.</p><p><strong>Reason:</strong> ${reason || 'Does not meet our criteria'}</p><p>If you believe this is a mistake, please contact support.</p><p>Best regards,<br>Hire In Minutes Team</p>`
      };

      await sendEmail({
        email: college.email,
        subject: emailContent.subject,
        message: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      console.error('College rejection email failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'College rejected successfully',
      data: {
        id: college._id,
        name: college.name,
        status: college.verificationStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get students for a specific college
// @route   GET /api/admin/colleges/:id/students
// @access  Private/Admin
const getCollegeStudents = async (req, res, next) => {
  try {
    const college = await College.findById(req.params.id)
      .populate({
        path: 'students',
        select: 'fullName email profile isVerified plan profilePicture createdAt'
      });

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College not found'
      });
    }

    // Return the students array
    res.status(200).json({
      success: true,
      count: college.students ? college.students.length : 0,
      data: college.students || []
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
