const express = require('express');
const {
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
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { uploadSingle } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Protected routes
router.get('/job/:jobId', protect, authorize('employer'), getApplicationsByJob);
router.get('/recruiter/all', protect, authorize('employer'), getRecruiterApplications);
router.get('/stats/recruiter', protect, authorize('employer'), getRecruiterApplicationStats);
router.get('/:id', protect, getApplication);
router.post('/', protect, authorize('job_seeker'), uploadSingle('resume'), createApplication);
router.put('/:id/status', protect, authorize('employer'), updateApplicationStatusWithMessage);
router.post('/:id/notes', protect, authorize('employer'), addApplicationNote);
router.get('/my/my-applications', protect, authorize('job_seeker'), getMyApplications);
router.get('/check-status/:jobId', protect, authorize('job_seeker'), checkApplicationStatus);
router.delete('/:id', protect, authorize('job_seeker'), withdrawApplication);

module.exports = router;