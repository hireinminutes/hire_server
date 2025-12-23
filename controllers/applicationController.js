const Application = require('../models/Application');
const Job = require('../models/Job');

// @desc    Get all applications for recruiter's jobs
// @route   GET /api/applications/recruiter/all
// @access  Private (Recruiter only)
const getRecruiterApplications = async (req, res, next) => {
  try {
    // Find all jobs posted by this recruiter
    // Optimization: Only select _id, we don't need the full job documents here
    const jobs = await Job.find({ postedBy: req.user.id }).select('_id').lean();
    const jobIds = jobs.map(job => job._id);

    // Get all applications for these jobs
    const limit = parseInt(req.query.limit, 10);

    // Optimization: Restricted field selection for populated job
    let query = Application.find({ job: { $in: jobIds } })
      .populate({
        path: 'job',
        select: 'jobDetails.basicInfo.jobTitle createdAt', // Only fetch what's displayed (Title)
        populate: {
          path: 'postedBy',
          select: 'companyName'
        }
      })
      .populate({
        path: 'applicant',
        select: 'fullName email profilePicture isVerified profile'
      })
      .sort({ createdAt: -1 })
      .lean(); // Return plain JS objects for performance

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const applications = await query;

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all applications for a job (Employer only)
// @route   GET /api/applications/job/:jobId
// @access  Private (Employer only)
const getApplicationsByJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user is the employer
    if (job.employer.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view applications for this job'
      });
    }

    const applications = await Application.find({ job: req.params.jobId })
      .populate('applicant', 'fullName email profile')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
const getApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title employer')
      .populate('applicant', 'fullName email profile');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is the employer or applicant
    const job = await Job.findById(application.job);
    const isEmployer = job.employer.toString() === req.user.id;
    const isApplicant = application.applicant.toString() === req.user.id;

    if (!isEmployer && !isApplicant) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to view this application'
      });
    }

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create application
// @route   POST /api/applications
// @access  Private (Job Seeker only)
const createApplication = async (req, res, next) => {
  try {
    const { jobId, coverLetter, expectedSalary, availability, portfolioLink, resumeLink } = req.body;

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job || job.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Job not found or not active'
      });
    }

    // Check user plan (Free users cannot apply)
    if (req.user.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Free plan users cannot apply for jobs. Please upgrade to Starter, Premium, or Pro.'
      });
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user.id
    });

    if (existingApplication) {
      // Allow reapplication only if previous application was rejected
      if (existingApplication.status === 'rejected') {
        // Delete the old rejected application
        await Application.findByIdAndDelete(existingApplication._id);
        // Decrement application count
        job.applicationCount = Math.max(0, job.applicationCount - 1);
      } else {
        return res.status(400).json({
          success: false,
          message: 'You have already applied for this job'
        });
      }
    }

    // Handle resume upload
    let resume = null;
    if (req.file) {
      resume = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      };
    }

    const application = await Application.create({
      job: jobId,
      applicant: req.user.id,
      coverLetter,
      resume,
      expectedSalary,
      availability,
      portfolioLink,
      resumeLink
    });

    // Increment application count on job
    job.applicationCount += 1;
    await job.save();

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status (Employer only)
// @route   PUT /api/applications/:id/status
// @access  Private (Employer only)
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, feedback, interviewScheduled } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is the employer
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    // Update application
    application.status = status;
    if (feedback) application.feedback = feedback;
    if (interviewScheduled) application.interviewScheduled = interviewScheduled;

    await application.save();

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add note to application (Employer only)
// @route   POST /api/applications/:id/notes
// @access  Private (Employer only)
const addApplicationNote = async (req, res, next) => {
  try {
    const { content } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is the employer
    if (application.job.employer.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to add notes to this application'
      });
    }

    application.notes.push({
      content,
      createdBy: req.user.id
    });

    await application.save();

    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my applications (Job Seeker)
// @route   GET /api/applications/my-applications
// @access  Private (Job Seeker only)
const getMyApplications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    let query = Application.find({ applicant: req.user.id })
      .populate({
        path: 'job',
        populate: {
          path: 'postedBy',
          select: 'profile.company.name profile.company.logo email'
        }
      })
      .sort({ createdAt: -1 });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const applications = await query;

    res.json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw application (Job Seeker)
// @route   DELETE /api/applications/:id
// @access  Private (Job Seeker only)
const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Check if user is the applicant
    if (application.applicant.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to withdraw this application'
      });
    }

    // Check if application can be withdrawn (not accepted/rejected)
    if (['accepted', 'rejected'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw application that has been accepted or rejected'
      });
    }

    await application.deleteOne();

    // Decrement application count on job
    await Job.findByIdAndUpdate(application.job, { $inc: { applicationCount: -1 } });

    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application status with message
// @route   PUT /api/applications/:id/status
// @access  Private (Recruiter only)
const updateApplicationStatusWithMessage = async (req, res, next) => {
  try {
    const { status, message, title, meetingLink } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('applicant');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify the recruiter owns this job
    const job = await Job.findById(application.job._id);
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this application'
      });
    }

    // Update application status
    application.status = status;
    await application.save();

    console.log(`Application ${application._id} status updated to ${status}. Creating notification...`);

    // Create notification for applicant
    const Notification = require('../models/Notification');

    // Safely get job details
    const jobTitle = job.jobDetails?.basicInfo?.jobTitle || 'Position';
    const companyName = job.jobDetails?.companyInfo?.companyName || 'Company';
    const locationObj = job.jobDetails?.basicInfo?.location;
    const location = (locationObj?.city && locationObj?.state)
      ? `${locationObj.city}, ${locationObj.state}`
      : (locationObj?.city || locationObj?.state || '');

    const notificationData = {
      recipient: application.applicant._id,
      recipientModel: 'Candidate',
      type: status === 'accepted' ? 'application_accepted' : 'application_rejected',
      title: title || (status === 'accepted' ? 'Application Accepted!' : 'Application Update'),
      message: message || `Your application for ${jobTitle} has been ${status}.`,
      data: {
        applicationId: application._id,
        jobId: job._id,
        status,
        customMessage: message,
        meetingLink: meetingLink,
        jobTitle,
        companyName,
        location: location || undefined
      }
    };

    const notification = await Notification.create(notificationData);
    console.log('Notification created:', notification._id);

    res.json({
      success: true,
      data: application,
      message: `Application ${status} successfully`
    });
  } catch (error) {
    console.error('Error in updateApplicationStatusWithMessage:', error);
    next(error);
  }
};

// @desc    Get recruiter application stats
// @route   GET /api/applications/stats/recruiter
// @access  Private (Recruiter only)
const getRecruiterApplicationStats = async (req, res, next) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).select('_id');
    const jobIds = jobs.map(job => job._id);

    const [total, pending, shortlisted, rejected, accepted] = await Promise.all([
      Application.countDocuments({ job: { $in: jobIds } }),
      Application.countDocuments({ job: { $in: jobIds }, status: 'pending' }),
      Application.countDocuments({ job: { $in: jobIds }, status: 'shortlisted' }),
      Application.countDocuments({ job: { $in: jobIds }, status: 'rejected' }),
      Application.countDocuments({ job: { $in: jobIds }, status: 'accepted' })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        shortlisted,
        rejected,
        accepted
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check application status for a specific job (Job Seeker)
// @route   GET /api/applications/check-status/:jobId
// @access  Private (Job Seeker only)
const checkApplicationStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const applicantId = req.user.id;

    // Use specific index for fast lookup
    const application = await Application.findOne(
      { job: jobId, applicant: applicantId }
    ).select('status createdAt');

    if (!application) {
      return res.json({
        success: true,
        hasApplied: false,
        status: null
      });
    }

    res.json({
      success: true,
      hasApplied: true,
      status: application.status,
      appliedAt: application.createdAt
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApplicationsByJob,
  getApplication,
  createApplication,
  updateApplicationStatus,
  addApplicationNote,
  getMyApplications,
  withdrawApplication,
  getRecruiterApplications,
  updateApplicationStatusWithMessage,
  getRecruiterApplicationStats,
  checkApplicationStatus
};