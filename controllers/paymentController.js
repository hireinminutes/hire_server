const { Cashfree, CFEnvironment } = require('cashfree-pg');
const Candidate = require('../models/Candidate');
const College = require('../models/College');


// Initialize Cashfree
Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = process.env.CASHFREE_ENV === 'TEST' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
const cashfree = new Cashfree(Cashfree.XEnvironment, Cashfree.XClientId, Cashfree.XClientSecret);


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

    // Prepare Cashfree order request
    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const request = {
      order_amount: (finalAmount / 100).toFixed(2), // Cashfree takes amount in rupees (float)
      order_currency: currency,
      order_id: orderId,
      customer_details: {
        customer_id: req.user.id,
        customer_phone: req.user.profile?.phone || '9999999999',
        customer_name: req.user.fullName || 'User',
        customer_email: req.user.email
      },
      order_meta: {
        return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment/status?order_id={order_id}`
      },
      order_tags: {
        planType: planType || 'premium',
        userId: req.user.id
      }
    };

    console.log('Creating Cashfree order with options:', request);
    const response = await cashfree.PGCreateOrder(request);


    const orderData = response.data;

    res.status(200).json({
      success: true,
      data: {
        ...orderData,
        discountApplied,
        discountMessage,
        originalAmount: amount,
        finalAmount,
        discountAmount: amount - finalAmount
      }
    });

  } catch (error) {
    console.error('Create order error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Server Error';
    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
      error: error.response?.data
    });
  }
};

// Verify payment
const verifyPayment = async (req, res) => {
  try {
    console.log('Verify payment request:', req.body);

    // Cashfree verification is typically done by fetching the order details
    const { orderId } = req.body; // Expecting orderId from frontend

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const response = await cashfree.PGOrderFetchPayments(orderId);


    const payments = response.data;

    console.log('Payment details:', payments);

    // Find a successful payment
    const successPayment = payments.find(p => p.payment_status === 'SUCCESS');

    if (!successPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed or payment pending'
      });
    }

    // Fetch order to get tags (metadata)
    // Note: FetchPayments doesn't return tags. FetchOrder does.
    const orderResponse = await cashfree.PGOrderFetchPayments(orderId); // Correction: This line was redundant in original code, but updating if kept.
    const orderDetailsResponse = await cashfree.PGFetchOrder(orderId);


    const orderDetails = orderDetailsResponse.data;

    const planType = orderDetails.order_tags?.planType || 'premium';

    // Update user plan
    console.log(`Updating user plan to ${planType} for user:`, req.user.id);

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
        paymentId: successPayment.cf_payment_id,
        orderId: orderId
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