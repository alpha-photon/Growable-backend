import Comment from '../models/Comment.model.js';
import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import { checkProhibitedContent, sanitizeContent, checkMedicalClaims } from '../utils/contentModeration.js';
import * as notificationService from './notification.service.js';

/**
 * Get comments for a post
 */
export const getPostComments = async (postId) => {
  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  // Get top-level comments
  const comments = await Comment.find({
    postId,
    status: 'approved',
    parentId: null,
  })
    .sort({ createdAt: -1 })
    .populate('authorId', 'name avatar role');

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    comments.map(async (comment) => {
      const replies = await Comment.find({
        parentId: comment._id,
        status: 'approved',
      })
        .sort({ createdAt: 1 })
        .populate('authorId', 'name avatar role');
      return {
        ...comment.toObject(),
        replies,
      };
    })
  );

  return commentsWithReplies;
};

/**
 * Create a comment
 */
export const createComment = async (commentData, authorId) => {
  const { postId, content, parentId } = commentData;

  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }

  // Check if parent comment exists (if replying)
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment) {
      throw new Error('Parent comment not found');
    }
    if (parentComment.postId.toString() !== postId) {
      throw new Error('Parent comment does not belong to this post');
    }
  }

  // Content moderation for comments (skip title validation)
  const prohibitedCheck = checkProhibitedContent(content);
  
  if (prohibitedCheck.hasProhibitedContent) {
    throw new Error(`Content contains inappropriate keywords: ${prohibitedCheck.flaggedKeywords.join(', ')}`);
  }
  
  const sanitizedContent = sanitizeContent(content);
  const hasMedicalClaims = checkMedicalClaims(content);

  // Get author info
  const author = await User.findById(authorId);
  if (!author) {
    throw new Error('Author not found');
  }

  // Create comment
  const comment = await Comment.create({
    postId,
    authorId,
    authorName: author.name,
    authorAvatar: author.avatar,
    content: sanitizedContent || content,
    parentId: parentId || null,
    status: hasMedicalClaims ? 'pending' : 'approved',
  });

  // Update post comment count if approved
  if (comment.status === 'approved') {
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
  }

  // Send notification to post author (if not their own comment)
  try {
    const post = await Post.findById(postId).populate('authorId', 'name');
    if (post && post.authorId._id.toString() !== authorId.toString()) {
      await notificationService.notifyPostCommented(
        post.authorId._id,
        authorId,
        postId,
        post.title,
        author.name
      );
    }

    // If replying to a comment, notify the parent comment author
    if (parentId) {
      const parentComment = await Comment.findById(parentId).populate('authorId', 'name');
      if (parentComment && parentComment.authorId._id.toString() !== authorId.toString()) {
        await notificationService.notifyCommentReplied(
          parentComment.authorId._id,
          authorId,
          parentId,
          postId,
          author.name
        );
      }
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't fail the comment creation if notification fails
  }

  return {
    comment,
    message: hasMedicalClaims
      ? 'Comment submitted for review'
      : 'Comment created successfully',
  };
};

/**
 * Update a comment
 */
export const updateComment = async (commentId, updateData, userId, userRole) => {
  let comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user is author or admin
  if (comment.authorId.toString() !== userId.toString() && userRole !== 'admin') {
    throw new Error('Not authorized to update this comment');
  }

  // Content moderation for comments
  const prohibitedCheck = checkProhibitedContent(updateData.content);
  
  if (prohibitedCheck.hasProhibitedContent) {
    throw new Error(`Content contains inappropriate keywords: ${prohibitedCheck.flaggedKeywords.join(', ')}`);
  }
  
  const sanitizedContent = sanitizeContent(updateData.content);
  const hasMedicalClaims = checkMedicalClaims(updateData.content);

  comment.content = sanitizedContent || updateData.content;
  if (hasMedicalClaims) {
    comment.status = 'pending';
  }

  await comment.save();

  return comment;
};

/**
 * Delete a comment
 */
export const deleteComment = async (commentId, userId, userRole) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user is author or admin
  if (comment.authorId.toString() !== userId.toString() && userRole !== 'admin') {
    throw new Error('Not authorized to delete this comment');
  }

  const postId = comment.postId;
  const wasApproved = comment.status === 'approved';

  await comment.deleteOne();

  // Update post comment count if it was approved
  if (wasApproved) {
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });
  }

  return { message: 'Comment deleted successfully' };
};

/**
 * Like/Unlike a comment
 */
export const toggleCommentLike = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error('Comment not found');
  }

  const isLiked = comment.likedBy.some((id) => id.toString() === userId.toString());

  if (isLiked) {
    comment.likedBy = comment.likedBy.filter((id) => id.toString() !== userId.toString());
    comment.likes -= 1;
  } else {
    comment.likedBy.push(userId);
    comment.likes += 1;
  }

  await comment.save();

  return {
    liked: !isLiked,
    likes: comment.likes,
  };
};

