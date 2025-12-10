import * as therapistProfileService from '../services/therapistProfile.service.js';

/**
 * @route   POST /api/therapist/profile
 * @desc    Create or update therapist profile
 * @access  Private (Therapist/Doctor only)
 */
export const createOrUpdateProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!['therapist', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only therapists and doctors can create profiles',
      });
    }

    const profile = await therapistProfileService.createOrUpdateProfile(
      req.user._id,
      req.body
    );

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/therapist/profile
 * @desc    Get current user's therapist profile
 * @access  Private (Therapist/Doctor only)
 */
export const getMyProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const profile = await therapistProfileService.getProfileByUserId(req.user._id);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (error.message === 'Therapist profile not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/therapist/profile/:userId
 * @desc    Get therapist profile by userId
 * @access  Public
 */
export const getProfileByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const profile = await therapistProfileService.getProfileByUserId(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (error.message === 'Therapist profile not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/therapist/profiles/:profileId
 * @desc    Get therapist profile by profile ID
 * @access  Public
 */
export const getProfileById = async (req, res, next) => {
  try {
    const { profileId } = req.params;
    const profile = await therapistProfileService.getProfileById(profileId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (error.message === 'Therapist profile not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   GET /api/therapist/search
 * @desc    Search therapists with filters
 * @access  Public
 */
export const searchTherapists = async (req, res, next) => {
  try {
    const filters = {
      specializations: req.query.specializations
        ? req.query.specializations.split(',')
        : undefined,
      city: req.query.city,
      state: req.query.state,
      consultationType: req.query.consultationType,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
      isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
      searchQuery: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const options = {
      sortBy: req.query.sortBy || 'averageRating',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1,
    };

    const result = await therapistProfileService.searchTherapists(filters, options);

    res.json({
      success: true,
      data: result.profiles,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/therapist/available-slots/:therapistId
 * @desc    Get available time slots for a therapist on a specific date
 * @access  Public
 */
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required',
      });
    }

    const slots = await therapistProfileService.getAvailableSlots(therapistId, date);

    res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/therapist/verify/:profileId
 * @desc    Verify therapist profile (Admin only)
 * @access  Private (Admin only)
 */
export const verifyProfile = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can verify profiles',
      });
    }

    const { profileId } = req.params;
    const { verificationNotes } = req.body;

    const profile = await therapistProfileService.verifyProfile(
      profileId,
      req.user._id,
      verificationNotes
    );

    res.json({
      success: true,
      data: profile,
      message: 'Profile verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

