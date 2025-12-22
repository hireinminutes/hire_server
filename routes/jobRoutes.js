const express = require('express');
const {
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
} = require('../controllers/jobController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getJobs);

// Get jobs by employer (public)
router.get('/employer/:employerId', getJobsByEmployer);

// Protected routes
// Get recruiter job stats
router.get('/stats/recruiter', protect, authorize('employer'), getRecruiterJobStats);

// Get my jobs (employer only) - Moved before /:id to prevent conflict
router.get('/my-jobs', protect, authorize('employer'), getMyJobs);

// Get job company details (must be before generic /:id)
router.get('/:id/company', getJobCompanyDetails);

// Get single job - Generic route should be valid last for GETs
router.get('/:id', getJob);

// Protected routes
router.post('/', protect, authorize('employer'), createJob);
router.put('/:id', protect, authorize('employer'), updateJob);
router.delete('/:id', protect, authorize('employer'), deleteJob);

// Save/unsave jobs (job seeker only)
router.post('/:id/save', protect, authorize('job_seeker'), saveJob);
router.delete('/:id/unsave', protect, authorize('job_seeker'), unsaveJob);
router.get('/saved/my-saved-jobs', protect, authorize('job_seeker'), getSavedJobs);

module.exports = router;