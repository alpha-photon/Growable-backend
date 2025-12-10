import * as reviewService from '../services/review.service.js';

/**
 * @route   POST /api/reviews
 * @desc    Create review
 * @access  Private
 */
export const createReview = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const review = await reviewService.createReview({
      ...req.body,
      patientId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reviews/therapist/:therapistId
 * @desc    Get reviews for a therapist
 * @access  Public
 */
export const getTherapistReviews = async (req, res, next) => {
  try {
    const { therapistId } = req.params;
    const filters = {
      status: req.query.status || 'approved',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      minRating: req.query.minRating ? parseInt(req.query.minRating) : undefined,
    };

    const result = await reviewService.getTherapistReviews(therapistId, filters);

    res.json({
      success: true,
      data: result.reviews,
      averageRating: result.averageRating,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
export const getReviewById = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewById(req.params.id);

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    if (error.message === 'Review not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/reviews/:id/response
 * @desc    Add therapist response to review
 * @access  Private (Therapist only)
 */
export const addTherapistResponse = async (req, res, next) => {
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
        message: 'Only therapists can respond to reviews',
      });
    }

    const { response } = req.body;
    const review = await reviewService.addTherapistResponse(
      req.params.id,
      req.user._id,
      response
    );

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
export const markReviewHelpful = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const review = await reviewService.markReviewHelpful(req.params.id, req.user._id);

    res.json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

