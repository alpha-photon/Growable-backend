import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['parent', 'teacher', 'therapist', 'doctor']).withMessage('Invalid role'),
  ],
  handleValidationErrors,
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('bio').optional().trim().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  authController.updateProfile
);

// @route   POST /api/auth/anonymous
// @desc    Create anonymous user session
// @access  Public
router.post(
  '/anonymous',
  [
    body('displayName').trim().isLength({ min: 2, max: 50 }).withMessage('Display name must be between 2 and 50 characters'),
    body('avatarEmoji').optional().isLength({ max: 10 }),
  ],
  handleValidationErrors,
  authController.createAnonymous
);

// @route   POST /api/auth/accept-rules
// @desc    Accept community rules
// @access  Private
router.post('/accept-rules', protect, authController.acceptRules);

export default router;
