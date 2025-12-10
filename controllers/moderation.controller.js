import * as moderationService from '../services/moderation.service.js';

/**
 * @desc    Get posts pending moderation
 * @route   GET /api/moderation/posts
 * @access  Private (Admin)
 */
export const getPendingPosts = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const { posts, pagination } = await moderationService.getPendingPosts(status, options);

    res.json({
      success: true,
      count: posts.length,
      ...pagination,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a post
 * @route   PUT /api/moderation/posts/:id/approve
 * @access  Private (Admin)
 */
export const approvePost = async (req, res, next) => {
  try {
    const post = await moderationService.approvePost(req.params.id, req.body.notes);

    res.json({
      success: true,
      message: 'Post approved successfully',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a post
 * @route   PUT /api/moderation/posts/:id/reject
 * @access  Private (Admin)
 */
export const rejectPost = async (req, res, next) => {
  try {
    const post = await moderationService.rejectPost(req.params.id, req.body.reason || req.body.notes);

    res.json({
      success: true,
      message: 'Post rejected',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get comments pending moderation
 * @route   GET /api/moderation/comments
 * @access  Private (Admin)
 */
export const getPendingComments = async (req, res, next) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const { comments, pagination } = await moderationService.getPendingComments(options);

    res.json({
      success: true,
      count: comments.length,
      ...pagination,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a comment
 * @route   PUT /api/moderation/comments/:id/approve
 * @access  Private (Admin)
 */
export const approveComment = async (req, res, next) => {
  try {
    const comment = await moderationService.approveComment(req.params.id);

    res.json({
      success: true,
      message: 'Comment approved successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a comment
 * @route   PUT /api/moderation/comments/:id/reject
 * @access  Private (Admin)
 */
export const rejectComment = async (req, res, next) => {
  try {
    const comment = await moderationService.rejectComment(req.params.id);

    res.json({
      success: true,
      message: 'Comment rejected',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

