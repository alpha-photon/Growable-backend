import express from 'express';
import { body } from 'express-validator';
import * as commentController from '../controllers/comment.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// @route   GET /api/comments/post/:postId
// @desc    Get all comments for a post
// @access  Public
router.get('/post/:postId', optionalAuth, commentController.getComments);

// @route   POST /api/comments
// @desc    Create a comment
// @access  Private
router.post(
  '/',
  protect,
  [
    body('postId').notEmpty().withMessage('Post ID is required'),
    body('content').trim().isLength({ min: 5, max: 1000 }).withMessage('Comment must be between 5 and 1,000 characters'),
    body('parentId').optional().isMongoId().withMessage('Invalid parent comment ID'),
  ],
  handleValidationErrors,
  commentController.createComment
);

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put(
  '/:id',
  protect,
  [body('content').trim().isLength({ min: 5, max: 1000 })],
  handleValidationErrors,
  commentController.updateComment
);

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', protect, commentController.deleteComment);

// @route   POST /api/comments/:id/like
// @desc    Like a comment
// @access  Private
router.post('/:id/like', protect, commentController.likeComment);

export default router;
