import * as userService from '../services/user.service.js';
import * as postService from '../services/post.service.js';

/**
 * @desc    Get user profile
 * @route   GET /api/users/:id
 * @access  Public
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's posts
 * @route   GET /api/users/:id/posts
 * @access  Public
 */
export const getUserPosts = async (req, res, next) => {
  try {
    const requestingUserId = req.user ? req.user._id : null;
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const { posts, pagination } = await postService.getUserPosts(
      req.params.id,
      options,
      requestingUserId
    );

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

