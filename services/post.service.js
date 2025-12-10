import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import { moderateContent, generateExcerpt } from '../utils/contentModeration.js';

/**
 * Get all posts with filters
 */
export const getPosts = async (filters, options) => {
  const {
    category,
    specialNeeds,
    search,
    status = 'approved', // Default to approved only
    authorId,
  } = filters;

  const { page = 1, limit = 10, sort = 'latest' } = options;

  const skip = (page - 1) * limit;

  // Build query
  const queryObj = {};

  // Only show approved posts unless filtering by author or status
  if (status && !authorId) {
    queryObj.status = status;
  } else if (authorId) {
    // If filtering by author, show their posts (including drafts)
    queryObj.authorId = authorId;
    if (status) {
      queryObj.status = status;
    }
  } else {
    queryObj.status = 'approved';
  }

  if (category) {
    queryObj.category = category;
  }

  if (specialNeeds) {
    queryObj.specialNeeds = { $in: Array.isArray(specialNeeds) ? specialNeeds : [specialNeeds] };
  }

  // Search functionality - search in title, excerpt, and tags
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    queryObj.$or = [
      { title: searchRegex },
      { excerpt: searchRegex },
      { tags: { $in: [searchRegex] } },
    ];
  }

  // Sort
  let sortObj = { publishedAt: -1 }; // Default: latest
  if (sort === 'popular') {
    sortObj = { likes: -1, publishedAt: -1 };
  } else if (sort === 'trending') {
    sortObj = { likes: -1, views: -1, publishedAt: -1 };
  } else if (sort === 'latest') {
    sortObj = { createdAt: -1 };
  }

  // Execute query
  const posts = await Post.find(queryObj)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .select('-content'); // Don't send full content in list

  const total = await Post.countDocuments(queryObj);

  return {
    posts,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

/**
 * Get single post by ID
 */
export const getPostById = async (postId, userId = null) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  // Only show approved posts to non-authors
  if (post.status !== 'approved' && (!userId || userId.toString() !== post.authorId.toString())) {
    throw new Error('Post not available');
  }

  // Increment views
  post.views += 1;
  await post.save();

  return post;
};

/**
 * Create a new post
 */
export const createPost = async (postData, authorId) => {
  const { title, content, category, tags, specialNeeds, images, status } = postData;

  // Get author info
  const author = await User.findById(authorId);
  if (!author) {
    throw new Error('Author not found');
  }

  // Content moderation
  const moderationResult = moderateContent(title, content);

  if (!moderationResult.approved) {
    const error = new Error(moderationResult.reason);
    error.needsReview = moderationResult.needsReview;
    throw error;
  }

  // Determine post status
  let postStatus = status || 'pending';
  if (moderationResult.needsReview) {
    postStatus = 'pending';
  }

  // Create post
  const post = await Post.create({
    authorId,
    authorName: author.name,
    authorRole: author.role,
    authorAvatar: author.avatar,
    title: moderationResult.sanitizedTitle || title,
    content: moderationResult.sanitizedContent || content,
    excerpt: generateExcerpt(content),
    category,
    tags: tags || [],
    specialNeeds: specialNeeds || [],
    images: images || [],
    status: postStatus,
  });

  // Update user's post count
  await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });

  return {
    post,
    message: moderationResult.needsReview
      ? 'Post submitted for review. It will be published after moderation.'
      : 'Post created successfully',
  };
};

/**
 * Update a post
 */
export const updatePost = async (postId, updateData, userId, userRole) => {
  let post = await Post.findById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  // Check if user is author or admin
  if (post.authorId.toString() !== userId.toString() && userRole !== 'admin') {
    throw new Error('Not authorized to update this post');
  }

  // Content moderation if content changed
  if (updateData.title || updateData.content) {
    const title = updateData.title || post.title;
    const content = updateData.content || post.content;
    const moderationResult = moderateContent(title, content);

    if (!moderationResult.approved) {
      throw new Error(moderationResult.reason);
    }

    if (moderationResult.sanitizedTitle) updateData.title = moderationResult.sanitizedTitle;
    if (moderationResult.sanitizedContent) updateData.content = moderationResult.sanitizedContent;
    if (updateData.content) updateData.excerpt = generateExcerpt(updateData.content);

    // If needs review and was approved, change status
    if (moderationResult.needsReview && post.status === 'approved') {
      updateData.status = 'pending';
    }
  }

  // Update post
  post = await Post.findByIdAndUpdate(postId, updateData, {
    new: true,
    runValidators: true,
  });

  return post;
};

/**
 * Delete a post
 */
export const deletePost = async (postId, userId, userRole) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  // Check if user is author or admin
  if (post.authorId.toString() !== userId.toString() && userRole !== 'admin') {
    throw new Error('Not authorized to delete this post');
  }

  await post.deleteOne();

  // Update user's post count
  await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

  return { message: 'Post deleted successfully' };
};

/**
 * Like/Unlike a post
 */
export const togglePostLike = async (postId, userId) => {
  const post = await Post.findById(postId).populate('authorId', 'name');

  if (!post) {
    throw new Error('Post not found');
  }

  const isLiked = post.likedBy.some((id) => id.toString() === userId.toString());

  if (isLiked) {
    // Unlike
    post.likedBy = post.likedBy.filter((id) => id.toString() !== userId.toString());
    post.likes -= 1;
  } else {
    // Like
    post.likedBy.push(userId);
    post.likes += 1;

    // Send notification to post author (if not their own post)
    try {
      const liker = await User.findById(userId).select('name');
      if (liker && post.authorId._id.toString() !== userId.toString()) {
        await notificationService.notifyPostLiked(
          post.authorId._id,
          userId,
          post._id,
          post.title,
          liker.name
        );
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't fail the like if notification fails
    }
  }

  await post.save();

  return {
    liked: !isLiked,
    likes: post.likes,
  };
};

/**
 * Flag a post for review
 */
export const flagPost = async (postId, userId) => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  // Check if already flagged by this user
  if (post.flaggedBy.some((id) => id.toString() === userId.toString())) {
    throw new Error('You have already flagged this post');
  }

  post.flaggedBy.push(userId);
  post.flaggedCount += 1;

  // Auto-flag if multiple users flag
  if (post.flaggedCount >= 3 && post.status === 'approved') {
    post.status = 'flagged';
  }

  await post.save();

  return { message: 'Post flagged for review' };
};

/**
 * Get user's posts
 */
export const getUserPosts = async (userId, options, requestingUserId = null) => {
  const { page = 1, limit = 10 } = options;

  const skip = (page - 1) * limit;

  // Check if requesting own posts
  const isOwnPosts = requestingUserId && requestingUserId.toString() === userId.toString();
  const statusFilter = isOwnPosts
    ? { $in: ['draft', 'pending', 'approved'] }
    : 'approved';

  const posts = await Post.find({
    authorId: userId,
    status: statusFilter,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-content');

  const total = await Post.countDocuments({
    authorId: userId,
    status: statusFilter,
  });

  return {
    posts,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

