const Razorpay = require('razorpay');
const crypto = require('crypto');
const Candidate = require('../models/Candidate');
const College = require('../models/College');


// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// Create payment order
const createOrder = async (req, res) => {
  try {
    console.log('Create order request:', req.body);
    console.log('User:', req.user);

    const { amount, currency = 'INR', planType } = req.body;

    // Validate amount (minimum ₹1)
    if (!amount || amount < 100) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Invalid amount. Minimum amount is ₹1.'
      });
    }

    let finalAmount = amount;
    let discountApplied = false;
    let discountMessage = '';

    // Check if user is a candidate and has a college that exists in our system
    if (req.user.role === 'job_seeker') {
      let collegeFound = false;

      // First check if college field is set
      if (req.user.college) {
        try {
          const collegeExists = await College.findById(req.user.college);
          if (collegeExists) {
            collegeFound = true;
          }
        } catch (error) {
          console.error('Error checking college by ID:', error);
        }
      }

      // If not found, check education institutions
      if (!collegeFound && req.user.profile && req.user.profile.education) {
        for (const edu of req.user.profile.education) {
          if (edu.institution) {
            try {
              const college = await College.findOne({
                name: { $regex: new RegExp(edu.institution.trim(), 'i') }
              });
              if (college) {
                collegeFound = true;
                // Optionally update the user's college field
                try {
                  await Candidate.findByIdAndUpdate(req.user.id, { college: college._id });
                } catch (updateError) {
                  console.error('Error updating user college field:', updateError);
                }
                break;
              }
            } catch (error) {
              console.error('Error checking college by education:', error);
            }
          }
        }
      }

      if (collegeFound) {
        // Apply 20% discount
        const discount = Math.round(amount * 0.20); // 20% discount
        finalAmount = amount - discount;
        discountApplied = true;
        discountMessage = 'Your college is our partner, so enjoy 20% discount on payments!';

        console.log('College discount applied:', {
          originalAmount: amount,
          discount: discount,
          finalAmount: finalAmount,
          userId: req.user.id
        });
      }
    }

    // Prepare Razorpay order request
    const options = {
      amount: finalAmount, // amount in paise (already in paise from frontend)
      currency: currency,
      receipt: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        planType: planType || 'premium',
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.fullName || 'User'
      }
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order);

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        discountApplied,
        discountMessage,
        originalAmount: amount,
        finalAmount,
        discountAmount: amount - finalAmount
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    const errorMessage = error.message || 'Server Error';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error
    });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    console.log('Verify payment request:', req.body);

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification parameters'
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.log('Signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - invalid signature'
      });
    }

    // Fetch order details to get notes (metadata)
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const planType = order.notes?.planType || 'premium';

    console.log('Order details:', order);
    console.log(`Updating user plan to ${planType} for user:`, req.user.id);

    // Update user plan
    const updateData = {
      planActivatedAt: new Date(),
    };

    if (['starter', 'premium', 'pro'].includes(planType)) {
      updateData.plan = planType;

      // Set interview count
      if (planType === 'premium') updateData.interviewCount = 1;
      else if (planType === 'pro') updateData.interviewCount = 3;
      else updateData.interviewCount = 0; // starter

      await Candidate.findByIdAndUpdate(req.user.id, updateData);
      console.log(`User plan updated to ${planType} successfully`);

    } else if (planType === 'job_access') {
      await Candidate.findByIdAndUpdate(req.user.id, {
        hasPaidJobAccess: true
      });
      console.log('User job access unlocked successfully');
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id).select('plan planActivatedAt planExpiresAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: {
          currentPlan: 'basic',
          planActivatedAt: null,
          planExpiresAt: null,
          payments: []
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        currentPlan: user.plan || 'basic',
        planActivatedAt: user.planActivatedAt,
        planExpiresAt: user.planExpiresAt,
        payments: []
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    await Candidate.findByIdAndUpdate(req.user.id, {
      plan: 'basic',
      planExpiresAt: null
    });

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription'
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  cancelSubscription
};