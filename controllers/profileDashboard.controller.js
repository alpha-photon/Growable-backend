import * as profileDashboardService from '../services/profileDashboard.service.js';

/**
 * Get Unified Profile Dashboard
 * @route   GET /api/profile/dashboard/:profileId
 * @desc    Get unified dashboard for child or patient
 * @access  Private
 * @query   type - 'child' or 'patient' (defaults to 'child')
 */
export const getUnifiedProfileDashboard = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const { type = 'child' } = req.query; // Default to 'child' if not specified
    const userId = req.user._id;
    const userRole = req.user.role;

    // Debug logging
    console.log('getUnifiedProfileDashboard called:', {
      profileId,
      type,
      userId,
      userRole,
      path: req.path,
      originalUrl: req.originalUrl,
    });

    // Validate profile type
    if (!['child', 'patient'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile type. Must be "child" or "patient"',
      });
    }

    const dashboardData = await profileDashboardService.getUnifiedProfileDashboard(
      profileId,
      type,
      userId,
      userRole
    );

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('getUnifiedProfileDashboard error:', error);
    next(error);
  }
};

/**
 * Get Unified Profile Dashboard (Auto-detect type)
 * @route   GET /api/profile/dashboard/:profileId/auto
 * @desc    Get unified dashboard - automatically detects if profileId is child or patient
 * @access  Private
 */
export const getUnifiedProfileDashboardAuto = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Try to detect type by checking both
    let dashboardData;
    let detectedType = 'child';

    try {
      // Try child first
      dashboardData = await profileDashboardService.getUnifiedProfileDashboard(
        profileId,
        'child',
        userId,
        userRole
      );
      detectedType = 'child';
    } catch (childError) {
      // If child fails, try patient
      try {
        dashboardData = await profileDashboardService.getUnifiedProfileDashboard(
          profileId,
          'patient',
          userId,
          userRole
        );
        detectedType = 'patient';
      } catch (patientError) {
        // Both failed, return error
        throw new Error('Profile not found. Please check if the ID is correct.');
      }
    }

    res.json({
      success: true,
      data: dashboardData,
      detectedType,
    });
  } catch (error) {
    next(error);
  }
};
