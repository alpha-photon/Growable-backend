import * as commentService from '../services/comment.service.js';

/**
 * @desc    Get comments for a post
 * @route   GET /api/comments/post/:postId
 * @access  Public
 */
export const getComments = async (req, res, next) => {
  try {
    const comments = await commentService.getPostComments(req.params.postId);

    res.json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a comment
 * @route   POST /api/comments
 * @access  Private
 */
export const createComment = async (req, res, next) => {
  try {
    const { comment, message } = await commentService.createComment(
      req.body,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a comment
 * @route   PUT /api/comments/:id
 * @access  Private
 */
export const updateComment = async (req, res, next) => {
  try {
    const comment = await commentService.updateComment(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role
    );

    res.json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:id
 * @access  Private
 */
export const deleteComment = async (req, res, next) => {
  try {
    const result = await commentService.deleteComment(
      req.params.id,
      req.user._id,
      req.user.role
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Like a comment
 * @route   POST /api/comments/:id/like
 * @access  Private
 */
export const likeComment = async (req, res, next) => {
  try {
    const result = await commentService.toggleCommentLike(req.params.id, req.user._id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

