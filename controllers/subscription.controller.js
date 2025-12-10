import subscriptionService from '../services/subscription.service.js';
import paymentService from '../services/payment.service.js';
import Subscription from '../models/Subscription.model.js';
import PlanVisibility from '../models/PlanVisibility.model.js';

/**
 * @desc    Get pricing for plans
 * @route   GET /api/subscriptions/pricing
 * @access  Public
 */
export const getPricing = async (req, res, next) => {
  try {
    const { userType, plan } = req.query;

    if (!userType || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userType and plan',
      });
    }

    const pricing = subscriptionService.getPricing(userType, plan);

    res.status(200).json({
      success: true,
      data: {
        userType,
        plan,
        ...pricing,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pricing plans
 * @route   GET /api/subscriptions/plans
 * @access  Public
 */
export const getAllPlans = async (req, res, next) => {
  try {
    const { userType } = req.query;
    const allPlans = [];

    // If userType is provided, get visible plans for that type
    if (userType && ['doctor', 'parent'].includes(userType)) {
      const visiblePlans = await PlanVisibility.getVisiblePlans(userType);
      
      for (const visibility of visiblePlans) {
        try {
          const pricing = subscriptionService.getPricing(visibility.userType === 'all' ? userType : visibility.userType, visibility.plan);
          
          // Use custom price if set, otherwise use calculated price
          const finalAmount = visibility.customPrice || pricing.finalAmount;
          const discount = visibility.customDiscount !== null ? 
            (pricing.monthlyPrice * (visibility.customDiscount / 100)) : 
            pricing.discount;

          allPlans.push({
            userType: visibility.userType === 'all' ? userType : visibility.userType,
            plan: visibility.plan,
            basePrice: pricing.basePrice,
            monthlyPrice: pricing.monthlyPrice,
            discount,
            finalAmount: visibility.customPrice || (pricing.monthlyPrice - discount),
            isVisible: visibility.isVisible,
            isDefault: visibility.isDefault,
            description: visibility.description,
            order: visibility.order,
          });
        } catch (error) {
          console.error(`Error getting pricing for ${visibility.userType} - ${visibility.plan}:`, error);
        }
      }
    } else {
      // Return all plans for all user types (for admin view)
      const plans = ['monthly', 'quarterly', 'yearly'];
      const userTypes = ['doctor', 'parent'];

      userTypes.forEach((ut) => {
        plans.forEach((plan) => {
          try {
            const pricing = subscriptionService.getPricing(ut, plan);
            allPlans.push({
              userType: ut,
              plan,
              ...pricing,
            });
          } catch (error) {
            console.error(`Error getting pricing for ${ut} - ${plan}:`, error);
          }
        });
      });
    }

    res.status(200).json({
      success: true,
      data: allPlans.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new subscription
 * @route   POST /api/subscriptions/create
 * @access  Private
 */
export const createSubscription = async (req, res, next) => {
  try {
    const { plan } = req.body;
    const userId = req.user._id;

    // Determine user type based on role
    let userType = 'parent';
    if (req.user.role === 'doctor' || req.user.role === 'therapist') {
      userType = 'doctor';
    }

    if (!plan || !['monthly', 'quarterly', 'yearly'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid plan (monthly, quarterly, or yearly)',
      });
    }

    const result = await subscriptionService.createSubscription(userId, plan, userType);

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        subscription: result.subscription,
        order: result.order,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify payment and activate subscription
 * @route   POST /api/subscriptions/verify
 * @access  Private
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { subscriptionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.user._id;

    if (!subscriptionId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all payment details',
      });
    }

    const result = await subscriptionService.activateSubscription(subscriptionId, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    // Verify subscription belongs to user
    if (result.subscription.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to subscription',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated successfully',
      data: {
        subscription: result.subscription,
        payment: result.payment,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's active subscription
 * @route   GET /api/subscriptions/active
 * @access  Private
 */
export const getActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const subscription = await subscriptionService.getActiveSubscription(userId);

    if (!subscription) {
      return res.status(200).json({
        success: true,
        message: 'No active subscription found',
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's subscription history
 * @route   GET /api/subscriptions/history
 * @access  Private
 */
export const getSubscriptionHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const result = await subscriptionService.getUserSubscriptions(userId, limit, skip);

    res.status(200).json({
      success: true,
      data: result.subscriptions,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.skip + result.limit < result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel subscription
 * @route   POST /api/subscriptions/:id/cancel
 * @access  Private
 */
export const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const subscription = await subscriptionService.cancelSubscription(id, userId, reason);

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscription by ID
 * @route   GET /api/subscriptions/:id
 * @access  Private
 */
export const getSubscriptionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const subscription = await subscriptionService.getSubscriptionById(id, userId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check subscription status
 * @route   GET /api/subscriptions/check
 * @access  Private
 */
export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const hasActive = await subscriptionService.hasActiveSubscription(userId);
    const subscription = hasActive
      ? await subscriptionService.getActiveSubscription(userId)
      : null;

    res.status(200).json({
      success: true,
      data: {
        hasActiveSubscription: hasActive,
        subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Razorpay webhook handler
 * @route   POST /api/subscriptions/webhook
 * @access  Public (Razorpay)
 */
export const handleWebhook = async (req, res, next) => {
  try {
    const { event, payload } = req.body;

    // Verify webhook signature
    const crypto = require('crypto');
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid webhook signature',
        });
      }
    }

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        // Payment successful
        const payment = payload.payment.entity;
        const orderId = payment.order_id;

        // Find subscription by order ID
        const subscription = await Subscription.findOne({ razorpayOrderId: orderId });

        if (subscription && subscription.status === 'pending') {
          // Activate subscription (webhook doesn't provide signature, so skip verification)
          await subscriptionService.activateSubscription(subscription._id, {
            razorpayOrderId: orderId,
            razorpayPaymentId: payment.id,
            razorpaySignature: '', // Webhook doesn't provide signature, skip verification
          });
        }

        break;

      case 'payment.failed':
        // Payment failed
        const failedPayment = payload.payment.entity;
        await paymentService.updatePaymentStatus(failedPayment.id, {
          status: 'failed',
          failureReason: failedPayment.error_description,
        });
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
};

/**
 * @desc    Get payment history
 * @route   GET /api/subscriptions/payments
 * @access  Private
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const result = await paymentService.getUserPayments(userId, limit, skip);

    res.status(200).json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
        hasMore: result.skip + result.limit < result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

