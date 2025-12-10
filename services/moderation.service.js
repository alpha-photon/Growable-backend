import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import * as notificationService from './notification.service.js';

/**
 * Get posts pending moderation
 */
export const getPendingPosts = async (status, options) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ status })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('authorId', 'name email role');

  const total = await Post.countDocuments({ status });

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
 * Approve a post
 */
export const approvePost = async (postId, notes) => {
  const post = await Post.findById(postId).populate('authorId', 'name');

  if (!post) {
    throw new Error('Post not found');
  }

  post.status = 'approved';
  post.publishedAt = new Date();
  post.moderationNotes = notes || '';

  await post.save();

  // Send notification to post author
  try {
    await notificationService.notifyPostApproved(
      post.authorId._id,
      post._id,
      post.title
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't fail the approval if notification fails
  }

  return post;
};

/**
 * Reject a post
 */
export const rejectPost = async (postId, reason) => {
  const post = await Post.findById(postId).populate('authorId', 'name');

  if (!post) {
    throw new Error('Post not found');
  }

  post.status = 'rejected';
  post.moderationNotes = reason || 'Post rejected by moderator';

  await post.save();

  // Send notification to post author
  try {
    await notificationService.notifyPostRejected(
      post.authorId._id,
      post._id,
      post.title,
      reason
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't fail the rejection if notification fails
  }

  return post;
};

/**
 * Get comments pending moderation
 */
export const getPendingComments = async (options) => {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const comments = await Comment.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('postId', 'title')
    .populate('authorId', 'name email role');

  const total = await Comment.countDocuments({ status: 'pending' });

  return {
    comments,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

/**
 * Approve a comment
 */
export const approveComment = async (commentId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error('Comment not found');
  }

  const wasPending = comment.status === 'pending';
  comment.status = 'approved';
  await comment.save();

  // Update post comment count if it was pending
  if (wasPending) {
    await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: 1 } });
  }

  return comment;
};

/**
 * Reject a comment
 */
export const rejectComment = async (commentId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error('Comment not found');
  }

  comment.status = 'rejected';
  await comment.save();

  return comment;
};

