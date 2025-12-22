const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// Public route - Submit contact form
router.post('/submit', contactController.submitContact);

// Admin routes - Protected
router.get('/all', protect, adminOnly, contactController.getAllContacts);
router.get('/stats', protect, adminOnly, contactController.getContactStats);
router.get('/:id', protect, adminOnly, contactController.getContact);
router.put('/:id/status', protect, adminOnly, contactController.updateContactStatus);
router.put('/:id/read', protect, adminOnly, contactController.markAsRead);
router.delete('/:id', protect, adminOnly, contactController.deleteContact);

module.exports = router;
