import subscriptionService from '../services/subscription.service.js';

/**
 * Middleware to check if user has active subscription
 * Use this middleware on routes that require an active subscription
 */
export const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Determine user type
    let userType = 'parent';
    if (req.user.role === 'doctor' || req.user.role === 'therapist') {
      userType = 'doctor';
    }

    // Check for active subscription
    const hasActive = await subscriptionService.hasActiveSubscription(req.user._id);

    if (!hasActive) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required to access this feature',
        requiresSubscription: true,
        userType,
      });
    }

    // Attach subscription info to request
    const subscription = await subscriptionService.getActiveSubscription(req.user._id);
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking subscription status',
    });
  }
};

/**
 * Optional subscription check - doesn't fail if no subscription
 * Attaches subscription info to request if available
 */
export const optionalSubscription = async (req, res, next) => {
  try {
    if (req.user) {
      const hasActive = await subscriptionService.hasActiveSubscription(req.user._id);
      if (hasActive) {
        const subscription = await subscriptionService.getActiveSubscription(req.user._id);
        req.subscription = subscription;
      }
    }
    next();
  } catch (error) {
    // Don't fail on error, just continue
    console.error('Optional subscription check error:', error);
    next();
  }
};

