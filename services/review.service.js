import Review from '../models/Review.model.js';
import TherapistProfile from '../models/TherapistProfile.model.js';
import Appointment from '../models/Appointment.model.js';

/**
 * Create review
 */
export const createReview = async (reviewData) => {
  const { therapistId, patientId, appointmentId, rating, comment, aspectRatings } = reviewData;

  // Validate appointment exists and is completed
  if (appointmentId) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    if (appointment.status !== 'completed') {
      throw new Error('Can only review completed appointments');
    }
    if (appointment.patientId.toString() !== patientId) {
      throw new Error('Can only review your own appointments');
    }
  }

  // Check if review already exists for this appointment
  if (appointmentId) {
    const existingReview = await Review.findOne({ appointmentId });
    if (existingReview) {
      throw new Error('Review already exists for this appointment');
    }
  } else {
    // Check if review exists (without appointment)
    const existingReview = await Review.findOne({ therapistId, patientId, appointmentId: null });
    if (existingReview) {
      throw new Error('Review already exists');
    }
  }

  const review = new Review({
    therapistId,
    patientId,
    appointmentId,
    rating,
    comment,
    aspectRatings,
    isVerified: !!appointmentId,
    status: appointmentId ? 'approved' : 'pending',
  });

  await review.save();

  // Update therapist profile stats
  await updateTherapistRating(therapistId);

  await review.populate('therapistId', 'name avatar role');
  await review.populate('patientId', 'name avatar');
  
  return review;
};

/**
 * Get reviews for a therapist
 */
export const getTherapistReviews = async (therapistId, filters = {}) => {
  const { status = 'approved', page = 1, limit = 20, minRating } = filters;

  const query = { therapistId, status };

  if (minRating) {
    query.rating = { $gte: minRating };
  }

  const skip = (page - 1) * limit;

  const reviews = await Review.find(query)
    .populate('patientId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Review.countDocuments(query);

  // Calculate average rating
  const allReviews = await Review.find({ therapistId, status: 'approved' });
  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

  return {
    reviews,
    averageRating: Math.round(averageRating * 10) / 10,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update therapist rating stats
 */
const updateTherapistRating = async (therapistId) => {
  const reviews = await Review.find({ therapistId, status: 'approved' });

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  await TherapistProfile.findOneAndUpdate(
    { userId: therapistId },
    {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    }
  );
};

/**
 * Get review by ID
 */
export const getReviewById = async (reviewId) => {
  const review = await Review.findById(reviewId)
    .populate('therapistId', 'name avatar role')
    .populate('patientId', 'name avatar')
    .populate('appointmentId')
    .lean();

  if (!review) {
    throw new Error('Review not found');
  }

  return review;
};

/**
 * Add therapist response to review
 */
export const addTherapistResponse = async (reviewId, therapistId, response) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new Error('Review not found');
  }

  if (review.therapistId.toString() !== therapistId) {
    throw new Error('Not authorized to respond to this review');
  }

  review.therapistResponse = response;
  review.therapistResponseAt = new Date();

  await review.save();

  return review;
};

/**
 * Mark review as helpful
 */
export const markReviewHelpful = async (reviewId, userId) => {
  const review = await Review.findById(reviewId);

  if (!review) {
    throw new Error('Review not found');
  }

  const alreadyHelpful = review.helpfulUsers.some((id) => id.toString() === userId.toString());

  if (alreadyHelpful) {
    // Remove helpful vote
    review.helpfulUsers = review.helpfulUsers.filter((id) => id.toString() !== userId.toString());
    review.helpfulCount = Math.max(0, review.helpfulCount - 1);
  } else {
    // Add helpful vote
    review.helpfulUsers.push(userId);
    review.helpfulCount += 1;
  }

  await review.save();

  return review;
};

