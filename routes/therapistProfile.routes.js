import express from 'express';
import * as therapistProfileController from '../controllers/therapistProfile.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/search', therapistProfileController.searchTherapists);
router.get('/profile/:userId', therapistProfileController.getProfileByUserId);
router.get('/profiles/:profileId', therapistProfileController.getProfileById);
router.get('/available-slots/:therapistId', therapistProfileController.getAvailableSlots);

// Protected routes (Therapist/Doctor only) - only they can create/update their own profile
router.post('/profile', protect, authorize('therapist', 'doctor'), therapistProfileController.createOrUpdateProfile);
router.get('/profile', protect, authorize('therapist', 'doctor'), therapistProfileController.getMyProfile);

// Admin routes - only admins can verify profiles
router.post('/verify/:profileId', protect, authorize('admin'), therapistProfileController.verifyProfile);

export default router;

