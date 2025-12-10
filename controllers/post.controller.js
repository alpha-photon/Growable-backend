import * as postService from '../services/post.service.js';

/**
 * @desc    Get all posts
 * @route   GET /api/posts
 * @access  Public
 */
export const getPosts = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      specialNeeds: req.query.specialNeeds,
      search: req.query.search,
      status: req.query.status,
      authorId: req.query.authorId,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || 'latest',
    };

    const { posts, pagination } = await postService.getPosts(filters, options);

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
 * @desc    Get single post
 * @route   GET /api/posts/:id
 * @access  Public
 */
export const getPost = async (req, res, next) => {
  try {
    const userId = req.user ? req.user._id : null;
    const post = await postService.getPostById(req.params.id, userId);

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new post
 * @route   POST /api/posts
 * @access  Private
 */
export const createPost = async (req, res, next) => {
  try {
    const { post, message } = await postService.createPost(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message,
      data: post,
    });
  } catch (error) {
    // Handle moderation errors
    if (error.needsReview !== undefined) {
      return res.status(400).json({
        success: false,
        message: error.message,
        needsReview: error.needsReview,
      });
    }
    next(error);
  }
};

/**
 * @desc    Update a post
 * @route   PUT /api/posts/:id
 * @access  Private
 */
export const updatePost = async (req, res, next) => {
  try {
    const post = await postService.updatePost(
      req.params.id,
      req.body,
      req.user._id,
      req.user.role
    );

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a post
 * @route   DELETE /api/posts/:id
 * @access  Private
 */
export const deletePost = async (req, res, next) => {
  try {
    const result = await postService.deletePost(req.params.id, req.user._id, req.user.role);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Like/Unlike a post
 * @route   POST /api/posts/:id/like
 * @access  Private
 */
export const likePost = async (req, res, next) => {
  try {
    const result = await postService.togglePostLike(req.params.id, req.user._id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag a post
 * @route   POST /api/posts/:id/flag
 * @access  Private
 */
export const flagPost = async (req, res, next) => {
  try {
    const result = await postService.flagPost(req.params.id, req.user._id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

