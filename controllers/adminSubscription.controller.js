import subscriptionService from '../services/subscription.service.js';
import paymentService from '../services/payment.service.js';
import Subscription from '../models/Subscription.model.js';
import Payment from '../models/Payment.model.js';
import PlanVisibility from '../models/PlanVisibility.model.js';
import User from '../models/User.model.js';

/**
 * @desc    Get all subscriptions (admin)
 * @route   GET /api/admin/subscriptions
 * @access  Private (Admin)
 */
export const getAllSubscriptions = async (req, res, next) => {
  try {
    const { status, userType, plan, limit = 50, skip = 0 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (userType) query.userType = userType;
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query)
      .populate('user', 'name email role')
      .populate('paymentId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Subscription.countDocuments(query);

    res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subscription statistics
 * @route   GET /api/admin/subscriptions/stats
 * @access  Private (Admin)
 */
export const getSubscriptionStats = async (req, res, next) => {
  try {
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({
      status: 'active',
      endDate: { $gt: new Date() },
    });
    const expiredSubscriptions = await Subscription.countDocuments({
      status: 'active',
      endDate: { $lte: new Date() },
    });
    const cancelledSubscriptions = await Subscription.countDocuments({
      status: 'cancelled',
    });

    // Revenue stats
    const revenueData = await Payment.aggregate([
      {
        $match: { status: 'completed' },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
        },
      },
    ]);

    const revenue = revenueData[0] || { totalRevenue: 0, totalPayments: 0 };

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
    ]);

    // User type distribution
    const userTypeDistribution = await Subscription.aggregate([
      {
        $group: {
          _id: '$userType',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
        revenue: {
          total: revenue.totalRevenue,
          payments: revenue.totalPayments,
        },
        planDistribution,
        userTypeDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually assign subscription to user
 * @route   POST /api/admin/subscriptions/assign
 * @access  Private (Admin)
 */
export const assignSubscription = async (req, res, next) => {
  try {
    const { userId, plan, userType, startDate, endDate, amount } = req.body;

    if (!userId || !plan || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, plan, and userType',
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Calculate pricing if not provided
    let finalAmount = amount;
    if (!finalAmount) {
      const pricing = subscriptionService.getPricing(userType, plan);
      finalAmount = pricing.finalAmount;
    }

    // Calculate end date if not provided
    const subscriptionStartDate = startDate || new Date();
    let subscriptionEndDate = endDate;
    
    if (!subscriptionEndDate) {
      subscriptionEndDate = new Date(subscriptionStartDate);
      switch (plan) {
        case 'monthly':
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
          break;
        case 'quarterly':
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3);
          break;
        case 'yearly':
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
          break;
      }
    }

    // Create subscription
    const subscription = await Subscription.create({
      user: userId,
      plan,
      userType,
      amount: finalAmount,
      discount: 0,
      finalAmount,
      status: 'active',
      startDate: subscriptionStartDate,
      endDate: subscriptionEndDate,
      nextBillingDate: subscriptionEndDate,
      autoRenew: false,
    });

    res.status(201).json({
      success: true,
      message: 'Subscription assigned successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user subscription
 * @route   PUT /api/admin/subscriptions/:id
 * @access  Private (Admin)
 */
export const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { plan, status, startDate, endDate, amount, autoRenew } = req.body;

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Update fields
    if (plan) subscription.plan = plan;
    if (status) subscription.status = status;
    if (startDate) subscription.startDate = startDate;
    if (endDate) subscription.endDate = endDate;
    if (amount !== undefined) {
      subscription.amount = amount;
      subscription.finalAmount = amount;
    }
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel user subscription (admin)
 * @route   POST /api/admin/subscriptions/:id/cancel
 * @access  Private (Admin)
 */
export const cancelUserSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    subscription.status = 'cancelled';
    subscription.autoRenew = false;
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || 'Cancelled by admin';

    await subscription.save();

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
 * @desc    Get plan visibility settings
 * @route   GET /api/admin/subscriptions/plan-visibility
 * @access  Private (Admin)
 */
export const getPlanVisibility = async (req, res, next) => {
  try {
    const { userType } = req.query;

    const query = userType ? { $or: [{ userType }, { userType: 'all' }] } : {};

    const visibility = await PlanVisibility.find(query).sort({ userType: 1, order: 1 });

    res.status(200).json({
      success: true,
      data: visibility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update plan visibility
 * @route   PUT /api/admin/subscriptions/plan-visibility/:id
 * @access  Private (Admin)
 */
export const updatePlanVisibility = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isVisible, isDefault, customPrice, customDiscount, description, order } = req.body;

    const visibility = await PlanVisibility.findById(id);

    if (!visibility) {
      return res.status(404).json({
        success: false,
        message: 'Plan visibility not found',
      });
    }

    // If setting as default, unset other defaults for same userType
    if (isDefault) {
      await PlanVisibility.updateMany(
        {
          _id: { $ne: id },
          userType: visibility.userType,
        },
        { $set: { isDefault: false } }
      );
    }

    if (isVisible !== undefined) visibility.isVisible = isVisible;
    if (isDefault !== undefined) visibility.isDefault = isDefault;
    if (customPrice !== undefined) visibility.customPrice = customPrice;
    if (customDiscount !== undefined) visibility.customDiscount = customDiscount;
    if (description !== undefined) visibility.description = description;
    if (order !== undefined) visibility.order = order;

    await visibility.save();

    res.status(200).json({
      success: true,
      message: 'Plan visibility updated successfully',
      data: visibility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update plan visibility
 * @route   POST /api/admin/subscriptions/plan-visibility
 * @access  Private (Admin)
 */
export const createPlanVisibility = async (req, res, next) => {
  try {
    const { userType, plan, isVisible, isDefault, customPrice, customDiscount, description, order } = req.body;

    if (!userType || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userType and plan',
      });
    }

    // If setting as default, unset other defaults for same userType
    if (isDefault) {
      await PlanVisibility.updateMany(
        { userType },
        { $set: { isDefault: false } }
      );
    }

    const visibility = await PlanVisibility.findOneAndUpdate(
      { userType, plan },
      {
        userType,
        plan,
        isVisible: isVisible !== undefined ? isVisible : true,
        isDefault: isDefault !== undefined ? isDefault : false,
        customPrice: customPrice || null,
        customDiscount: customDiscount || null,
        description: description || '',
        order: order || 0,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Plan visibility created/updated successfully',
      data: visibility,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user subscriptions
 * @route   GET /api/admin/subscriptions/user/:userId
 * @access  Private (Admin)
 */
export const getUserSubscriptions = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const subscriptions = await Subscription.find({ user: userId })
      .populate('paymentId')
      .sort({ createdAt: -1 });

    const user = await User.findById(userId).select('name email role');

    res.status(200).json({
      success: true,
      data: {
        user,
        subscriptions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initialize default plan visibility
 * @route   POST /api/admin/subscriptions/plan-visibility/init
 * @access  Private (Admin)
 */
export const initPlanVisibility = async (req, res, next) => {
  try {
    const userTypes = ['doctor', 'parent'];
    const plans = ['monthly', 'quarterly', 'yearly'];

    const defaultVisibility = [];

    for (const userType of userTypes) {
      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        defaultVisibility.push({
          userType,
          plan,
          isVisible: true,
          isDefault: i === 0, // Monthly is default
          order: i,
        });
      }
    }

    // Insert or update
    for (const visibility of defaultVisibility) {
      await PlanVisibility.findOneAndUpdate(
        { userType: visibility.userType, plan: visibility.plan },
        visibility,
        { upsert: true }
      );
    }

    const allVisibility = await PlanVisibility.find().sort({ userType: 1, order: 1 });

    res.status(200).json({
      success: true,
      message: 'Plan visibility initialized successfully',
      data: allVisibility,
    });
  } catch (error) {
    next(error);
  }
};

