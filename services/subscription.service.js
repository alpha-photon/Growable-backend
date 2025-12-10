import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import User from '../models/User.model.js';
import PlanVisibility from '../models/PlanVisibility.model.js';
import paymentService, { createOrder, verifyPayment, createPaymentRecord, updatePaymentStatus } from './payment.service.js';

/**
 * Get pricing for user type and plan
 */
export const getPricing = (userType, plan) => {
  if (!['doctor', 'parent'].includes(userType)) {
    throw new Error('Invalid user type. Must be doctor or parent');
  }

  if (!['monthly', 'quarterly', 'yearly'].includes(plan)) {
    throw new Error('Invalid plan. Must be monthly, quarterly, or yearly');
  }

  return Subscription.calculatePrice(userType, plan);
};

/**
 * Create a new subscription
 */
export const createSubscription = async (userId, plan, userType) => {
  try {
    // Check if user already has an active subscription
    const activeSubscription = await Subscription.findOne({
      user: userId,
      status: 'active',
      endDate: { $gt: new Date() },
    });

    if (activeSubscription) {
      throw new Error('User already has an active subscription');
    }

    // Calculate pricing
    const pricing = getPricing(userType, plan);

    // Calculate end date based on plan
    const startDate = new Date();
    let endDate = new Date(startDate);

    switch (plan) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    // Create subscription record
    const subscription = await Subscription.create({
      user: userId,
      plan,
      userType,
      amount: pricing.monthlyPrice,
      discount: pricing.discount,
      finalAmount: pricing.finalAmount,
      status: 'pending',
      startDate: startDate,
      endDate: endDate,
      nextBillingDate: endDate,
    });

    // Create Razorpay order (or mock order for development)
    let order;
    try {
      order = await createOrder(
        pricing.finalAmount,
        'INR',
        `sub_${subscription._id}_${Date.now()}`
      );
      subscription.razorpayOrderId = order.orderId;
    } catch (error) {
      // If Razorpay is not configured, create a mock order for development/testing
      if (error.message.includes('not configured') || error.message.includes('placeholder')) {
        console.warn('⚠️  Razorpay not configured. Creating mock order for development.');
        order = {
          success: true,
          orderId: `mock_order_${subscription._id}_${Date.now()}`,
          amount: pricing.finalAmount * 100,
          currency: 'INR',
        };
        subscription.razorpayOrderId = order.orderId;
        subscription.status = 'pending'; // Keep as pending until real payment
      } else {
        // If it's a real Razorpay error, throw it
        throw error;
      }
    }
    
    await subscription.save();

    return {
      subscription,
      order: {
        id: order.orderId,
        amount: order.amount,
        currency: order.currency,
      },
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

/**
 * Activate subscription after successful payment
 */
export const activateSubscription = async (subscriptionId, paymentData) => {
  try {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'active') {
      throw new Error('Subscription is already active');
    }

    // Verify payment signature (skip if coming from webhook)
    if (paymentData.razorpaySignature) {
      const isValid = verifyPayment(
        paymentData.razorpayOrderId,
        paymentData.razorpayPaymentId,
        paymentData.razorpaySignature
      );

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }
    }

    // Create or update payment record
    let payment;
    const existingPayment = await paymentService.getPaymentByOrderId(paymentData.razorpayOrderId);
    
    if (existingPayment) {
      // Update existing payment
      payment = await paymentService.updatePaymentStatus(existingPayment._id, {
        status: 'completed',
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature || '',
        transactionId: paymentData.razorpayPaymentId,
      });
    } else {
      // Create new payment record
      payment = await createPaymentRecord({
        user: subscription.user,
        subscription: subscriptionId,
        amount: subscription.finalAmount,
        status: 'completed',
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature || '',
        transactionId: paymentData.razorpayPaymentId,
        receipt: `receipt_${subscriptionId}`,
      });
    }

    // Activate subscription
    subscription.status = 'active';
    subscription.startDate = new Date();
    subscription.paymentId = payment._id;
    await subscription.save();

    return {
      subscription,
      payment,
    };
  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
};

/**
 * Get user's active subscription
 */
export const getActiveSubscription = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active',
      endDate: { $gt: new Date() },
    })
      .populate('paymentId')
      .sort({ createdAt: -1 });

    return subscription;
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    throw new Error(`Failed to fetch active subscription: ${error.message}`);
  }
};

/**
 * Get user's subscription history
 */
export const getUserSubscriptions = async (userId, limit = 10, skip = 0) => {
  try {
    const subscriptions = await Subscription.find({ user: userId })
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Subscription.countDocuments({ user: userId });

    return {
      subscriptions,
      total,
      limit,
      skip,
    };
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (subscriptionId, userId, reason = null) => {
  try {
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId,
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Only active subscriptions can be cancelled');
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || 'User requested cancellation';

    await subscription.save();

    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Check if user has active subscription
 */
export const hasActiveSubscription = async (userId) => {
  try {
    const subscription = await getActiveSubscription(userId);
    return !!subscription;
  } catch (error) {
    console.error('Error checking active subscription:', error);
    return false;
  }
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (subscriptionId, userId = null) => {
  try {
    const query = { _id: subscriptionId };
    if (userId) {
      query.user = userId;
    }

    const subscription = await Subscription.findOne(query)
      .populate('user', 'name email role')
      .populate('paymentId');

    return subscription;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
};

/**
 * Get subscription by Razorpay order ID
 */
export const getSubscriptionByOrderId = async (razorpayOrderId) => {
  try {
    const subscription = await Subscription.findOne({ razorpayOrderId })
      .populate('user', 'name email role')
      .populate('paymentId');

    return subscription;
  } catch (error) {
    console.error('Error fetching subscription by order ID:', error);
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
};

/**
 * Update subscription status (for cron jobs or webhooks)
 */
export const updateSubscriptionStatus = async (subscriptionId, status) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  } catch (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
};

/**
 * Get expired subscriptions (for cleanup cron jobs)
 */
export const getExpiredSubscriptions = async () => {
  try {
    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lte: new Date() },
    });

    return expiredSubscriptions;
  } catch (error) {
    console.error('Error fetching expired subscriptions:', error);
    throw error;
  }
};

/**
 * Renew subscription (for auto-renewal)
 */
export const renewSubscription = async (subscriptionId) => {
  try {
    const oldSubscription = await Subscription.findById(subscriptionId);

    if (!oldSubscription) {
      throw new Error('Subscription not found');
    }

    if (oldSubscription.status !== 'active') {
      throw new Error('Can only renew active subscriptions');
    }

    // Create new subscription with same plan
    const newSubscription = await createSubscription(
      oldSubscription.user,
      oldSubscription.plan,
      oldSubscription.userType
    );

    // Mark old subscription as expired
    oldSubscription.status = 'expired';
    await oldSubscription.save();

    return newSubscription;
  } catch (error) {
    console.error('Error renewing subscription:', error);
    throw error;
  }
};

export default {
  getPricing,
  createSubscription,
  activateSubscription,
  getActiveSubscription,
  getUserSubscriptions,
  cancelSubscription,
  hasActiveSubscription,
  getSubscriptionById,
  updateSubscriptionStatus,
  getExpiredSubscriptions,
  renewSubscription,
};

