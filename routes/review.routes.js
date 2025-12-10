import express from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/therapist/:therapistId', reviewController.getTherapistReviews);
router.get('/:id', reviewController.getReviewById);

// Protected routes - anyone authenticated can create review or mark helpful
router.post('/', protect, reviewController.createReview);
router.post('/:id/helpful', protect, reviewController.markReviewHelpful);

// Only therapists/doctors can respond to reviews (and only their own reviews)
router.put('/:id/response', protect, authorize('therapist', 'doctor'), reviewController.addTherapistResponse);

export default router;

