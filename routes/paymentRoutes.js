const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// Create payment order
router.post('/create-order', protect, paymentController.createOrder);

// Verify payment
router.post('/verify', protect, paymentController.verifyPayment);

// Get payment history
router.get('/history', protect, paymentController.getPaymentHistory);

// Cancel subscription
router.post('/cancel', protect, paymentController.cancelSubscription);

module.exports = router;