import express from 'express';
import { body, query } from 'express-validator';
import * as moderationController from '../controllers/moderation.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// @route   GET /api/moderation/posts
// @desc    Get posts pending moderation
// @access  Private (Admin only)
router.get(
  '/posts',
  [
    query('status').optional().isIn(['pending', 'flagged', 'rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  moderationController.getPendingPosts
);

// @route   PUT /api/moderation/posts/:id/approve
// @desc    Approve a post
// @access  Private (Admin only)
router.put('/posts/:id/approve', moderationController.approvePost);

// @route   PUT /api/moderation/posts/:id/reject
// @desc    Reject a post
// @access  Private (Admin only)
router.put(
  '/posts/:id/reject',
  [body('reason').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  moderationController.rejectPost
);

// @route   GET /api/moderation/comments
// @desc    Get comments pending moderation
// @access  Private (Admin only)
router.get(
  '/comments',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  moderationController.getPendingComments
);

// @route   PUT /api/moderation/comments/:id/approve
// @desc    Approve a comment
// @access  Private (Admin only)
router.put('/comments/:id/approve', moderationController.approveComment);

// @route   PUT /api/moderation/comments/:id/reject
// @desc    Reject a comment
// @access  Private (Admin only)
router.put('/comments/:id/reject', moderationController.rejectComment);

export default router;
