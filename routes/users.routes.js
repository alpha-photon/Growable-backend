import express from 'express';
import { query } from 'express-validator';
import * as userController from '../controllers/user.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Public
router.get('/:id', userController.getUser);

// @route   GET /api/users/:id/posts
// @desc    Get user's posts
// @access  Public
router.get(
  '/:id/posts',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  handleValidationErrors,
  userController.getUserPosts
);

export default router;
