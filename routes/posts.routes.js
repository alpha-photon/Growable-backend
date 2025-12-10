import express from 'express';
import { body, query } from 'express-validator';
import * as postController from '../controllers/post.controller.js';
import { protect, optionalAuth } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// @route   GET /api/posts
// @desc    Get all posts (with filters)
// @access  Public
router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isIn(['success-story', 'tips', 'experience', 'advice', 'resource', 'question']),
    query('sort').optional().isIn(['latest', 'popular', 'trending']),
  ],
  handleValidationErrors,
  postController.getPosts
);

// @route   GET /api/posts/:id
// @desc    Get single post
// @access  Public
router.get('/:id', optionalAuth, postController.getPost);

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post(
  '/',
  protect,
  [
    body('title').trim().isLength({ min: 10, max: 200 }).withMessage('Title must be between 10 and 200 characters'),
    body('content').trim().isLength({ min: 50, max: 10000 }).withMessage('Content must be between 50 and 10,000 characters'),
    body('category').isIn(['success-story', 'tips', 'experience', 'advice', 'resource', 'question']).withMessage('Invalid category'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('specialNeeds').optional().isArray().withMessage('Special needs must be an array'),
    body('status').optional().isIn(['draft', 'pending']).withMessage('Invalid status'),
  ],
  handleValidationErrors,
  postController.createPost
);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put(
  '/:id',
  protect,
  [
    body('title').optional().trim().isLength({ min: 10, max: 200 }),
    body('content').optional().trim().isLength({ min: 50, max: 10000 }),
  ],
  handleValidationErrors,
  postController.updatePost
);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, postController.deletePost);

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike a post
// @access  Private
router.post('/:id/like', protect, postController.likePost);

// @route   POST /api/posts/:id/flag
// @desc    Flag a post for review
// @access  Private
router.post('/:id/flag', protect, postController.flagPost);

export default router;
