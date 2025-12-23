const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
const getJobs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Build query
    let query = { status: 'active' };

    // Search (Keywords or Location)
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      query.$or = [
        { 'jobDetails.basicInfo.jobTitle': searchRegex },
        { 'jobDetails.description.roleSummary': searchRegex },
        { 'jobDetails.location.city': searchRegex },
        { 'jobDetails.location.state': searchRegex },
        { 'jobDetails.location.country': searchRegex }
      ];
    }

    // Filters
    if (req.query.department) {
      query['jobDetails.basicInfo.department'] = req.query.department;
    }

    if (req.query.location) {
      query.$or = query.$or || [];
      query.$or.push(
        { 'jobDetails.location.city': { $regex: req.query.location, $options: 'i' } },
        { 'jobDetails.location.state': { $regex: req.query.location, $options: 'i' } },
        { 'jobDetails.location.country': { $regex: req.query.location, $options: 'i' } }
      );
    }

    if (req.query.employmentType) {
      query['jobDetails.basicInfo.employmentType'] = req.query.employmentType;
    }

    if (req.query.workMode) {
      query['jobDetails.basicInfo.workMode'] = req.query.workMode;
    }

    if (req.query.jobLevel) {
      query['jobDetails.basicInfo.jobLevel'] = req.query.jobLevel;
    }

    // Salary range
    if (req.query.salaryMin || req.query.salaryMax) {
      if (req.query.salaryMin) {
        query['jobDetails.compensation.salary'] = { $gte: parseInt(req.query.salaryMin) };
      }
      if (req.query.salaryMax) {
        query['jobDetails.compensation.salary'] = query['jobDetails.compensation.salary'] || {};
        query['jobDetails.compensation.salary'].$lte = parseInt(req.query.salaryMax);
      }
    }

    // Execute query with optimizations
    const jobs = await Job.find(query)
      .select('jobDetails.basicInfo jobDetails.location jobDetails.compensation jobDetails.description.roleSummary postedBy createdAt status') // Only fetch needed fields
      .populate('postedBy', 'fullName profile recruiterOnboardingDetails isVerified')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .lean(); // Faster execution matching plain JS objects

    // Get total count (can be slow on large datasets, consider estimatedDocumentCount if needed, but countDocuments respects filters)
    const total = await Job.countDocuments(query);

    // Transform data slightly to handle missing profiles gracefully if needed, though frontend handles it.
    // We return lean objects now.

    res.json({
      success: true,
      count: jobs.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Public
const getJob = async (req, res, next) => {
  try {
    const basicOnly = req.query.basic === 'true';

    let query = Job.findById(req.params.id);

    if (!basicOnly) {
      query = query.populate('postedBy', 'profile recruiterOnboardingDetails isVerified');
    }

    const job = await query;

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Increment view count only on main load (not just company fetch)
    if (!basicOnly) {
      job.views += 1;
      await job.save();
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job company details
// @route   GET /api/jobs/:id/company
// @access  Public
const getJobCompanyDetails = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id)
      .select('postedBy')
      .populate('postedBy', 'profile recruiterOnboardingDetails');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job.postedBy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new job
// @route   POST /api/jobs
// @access  Private (Employer only)
const createJob = async (req, res, next) => {
  try {
    // Add postedBy to req.body
    req.body.postedBy = req.user.id;

    // Validate required job details structure
    if (!req.body.jobDetails) {
      return res.status(400).json({
        success: false,
        message: 'Job details are required'
      });
    }

    const job = await Job.create(req.body);

    res.status(201).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (Employer only)
const updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Make sure user is job owner
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (Employer only)
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Make sure user is job owner
    if (job.postedBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this job'
      });
    }

    await job.deleteOne();

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get jobs by employer
// @route   GET /api/jobs/employer/:employerId
// @access  Private
const getJobsByEmployer = async (req, res, next) => {
  try {
    const jobs = await Job.find({ postedBy: req.params.employerId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my jobs (for employers)
// @route   GET /api/jobs/my-jobs
// @access  Private (Employer only)
const getMyJobs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    const status = req.query.status;

    let queryObj = { postedBy: req.user.id };
    if (status) {
      queryObj.status = status;
    }

    // Optimized: Only select fields needed for the list view
    let query = Job.find(queryObj)
      .select('jobDetails.basicInfo jobDetails.location jobDetails.compensation status createdAt applicationCount views')
      .sort({ createdAt: -1 });

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const jobs = await query;

    res.json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save a job
// @route   POST /api/jobs/:id/save
// @access  Private (Candidate only)
const saveJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const candidateId = req.user.id;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Find candidate and add job to savedJobs if not already saved
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Check if already saved
    if (candidate.savedJobs.includes(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Job already saved'
      });
    }

    // Add to saved jobs
    candidate.savedJobs.push(jobId);
    await candidate.save();

    res.json({
      success: true,
      message: 'Job saved successfully',
      data: candidate.savedJobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsave a job
// @route   DELETE /api/jobs/:id/unsave
// @access  Private (Candidate only)
const unsaveJob = async (req, res, next) => {
  try {
    const jobId = req.params.id;
    const candidateId = req.user.id;

    // Find candidate and remove job from savedJobs
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // Remove from saved jobs
    candidate.savedJobs = candidate.savedJobs.filter(
      id => id.toString() !== jobId
    );
    await candidate.save();

    res.json({
      success: true,
      message: 'Job removed from saved',
      data: candidate.savedJobs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get saved jobs
// @route   GET /api/jobs/saved/my-saved-jobs
// @access  Private (Candidate only)
const getSavedJobs = async (req, res, next) => {
  try {
    const candidateId = req.user.id;

    const idsOnly = req.query.idsOnly === 'true';

    // If only IDs are requested, we don't need to populate the heavy savedJobs array
    // Optimization: Just select the array, don't fetch entire profile
    let query = Candidate.findById(candidateId);

    if (idsOnly) {
      query = query.select('savedJobs');
    } else {
      query = query.populate({
        path: 'savedJobs',
        select: 'jobDetails.basicInfo jobDetails.location jobDetails.compensation postedBy createdAt status',
        populate: {
          path: 'postedBy',
          select: 'firstName lastName fullName profile.company.name profile.company.logo recruiterOnboardingDetails.company.name recruiterOnboardingDetails.company.logo'
        }
      });
    }

    const candidate = await query;

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    // If idsOnly, simply return the array of ObjectIds (or strings)
    if (idsOnly) {
      return res.json({
        success: true,
        count: candidate.savedJobs.length,
        data: candidate.savedJobs // This will be just the IDs
      });
    }

    res.json({
      success: true,
      count: candidate.savedJobs.length,
      data: candidate.savedJobs
    });
  } catch (error) {
    next(error);
  }
};

const mongoose = require('mongoose');

// @desc    Get recruiter job stats
// @route   GET /api/jobs/stats/recruiter
// @access  Private (Employer only)
const getRecruiterJobStats = async (req, res, next) => {
  try {
    const stats = await Job.aggregate([
      { $match: { postedBy: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          closedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] }
          },
          totalViews: { $sum: '$views' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || { totalJobs: 0, activeJobs: 0, closedJobs: 0, totalViews: 0 }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getJobsByEmployer,
  getMyJobs,
  saveJob,
  unsaveJob,
  getSavedJobs,
  getRecruiterJobStats,
  getJobCompanyDetails
};