import * as adminService from '../services/admin.service.js';
import * as moderationService from '../services/moderation.service.js';
import * as chatModerationService from '../services/chatModeration.service.js';
import * as therapistProfileService from '../services/therapistProfile.service.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get analytics data
 * @route   GET /api/admin/dashboard/analytics
 * @access  Private (Admin)
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = await adminService.getAnalytics(days);
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { users, pagination } = await adminService.getAllUsers(req.query);
    res.json({
      success: true,
      count: users.length,
      ...pagination,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin)
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (req, res, next) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block user
 * @route   PUT /api/admin/users/:id/block
 * @access  Private (Admin)
 */
export const blockUser = async (req, res, next) => {
  try {
    const user = await adminService.blockUser(req.params.id);
    res.json({
      success: true,
      message: 'User blocked successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unblock user
 * @route   PUT /api/admin/users/:id/unblock
 * @access  Private (Admin)
 */
export const unblockUser = async (req, res, next) => {
  try {
    const user = await adminService.unblockUser(req.params.id);
    res.json({
      success: true,
      message: 'User unblocked successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const result = await adminService.deleteUser(req.params.id);
    res.json({
      success: true,
      message: 'User deleted successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all posts
 * @route   GET /api/admin/posts
 * @access  Private (Admin)
 */
export const getAllPosts = async (req, res, next) => {
  try {
    const { posts, pagination } = await adminService.getAllPosts(req.query);
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
 * @desc    Approve post
 * @route   PUT /api/admin/posts/:id/approve
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
 * @desc    Reject post
 * @route   PUT /api/admin/posts/:id/reject
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
 * @desc    Delete post
 * @route   DELETE /api/admin/posts/:id
 * @access  Private (Admin)
 */
export const deletePost = async (req, res, next) => {
  try {
    const Post = (await import('../models/Post.model.js')).default;
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }
    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all comments
 * @route   GET /api/admin/comments
 * @access  Private (Admin)
 */
export const getAllComments = async (req, res, next) => {
  try {
    const { comments, pagination } = await adminService.getAllComments(req.query);
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
 * @desc    Approve comment
 * @route   PUT /api/admin/comments/:id/approve
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
 * @desc    Reject comment
 * @route   PUT /api/admin/comments/:id/reject
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

/**
 * @desc    Delete comment
 * @route   DELETE /api/admin/comments/:id
 * @access  Private (Admin)
 */
export const deleteComment = async (req, res, next) => {
  try {
    const Comment = (await import('../models/Comment.model.js')).default;
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }
    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all chat rooms
 * @route   GET /api/admin/chat/rooms
 * @access  Private (Admin)
 */
export const getAllChatRooms = async (req, res, next) => {
  try {
    const { rooms, pagination } = await adminService.getAllChatRooms(req.query);
    res.json({
      success: true,
      count: rooms.length,
      ...pagination,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all chat messages
 * @route   GET /api/admin/chat/messages
 * @access  Private (Admin)
 */
export const getAllChatMessages = async (req, res, next) => {
  try {
    const { messages, pagination } = await adminService.getAllChatMessages(req.query);
    res.json({
      success: true,
      count: messages.length,
      ...pagination,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get flagged messages
 * @route   GET /api/admin/chat/flagged
 * @access  Private (Admin)
 */
export const getFlaggedMessages = async (req, res, next) => {
  try {
    const { messages, pagination } = await adminService.getAllChatMessages({
      ...req.query,
      flagged: 'true',
    });
    res.json({
      success: true,
      count: messages.length,
      ...pagination,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete chat message
 * @route   DELETE /api/admin/chat/messages/:id
 * @access  Private (Admin)
 */
export const deleteChatMessage = async (req, res, next) => {
  try {
    await chatModerationService.deleteMessage(req.params.id, req.user._id);
    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all appointments
 * @route   GET /api/admin/appointments
 * @access  Private (Admin)
 */
export const getAllAppointments = async (req, res, next) => {
  try {
    const { appointments, pagination } = await adminService.getAllAppointments(req.query);
    res.json({
      success: true,
      count: appointments.length,
      ...pagination,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all children
 * @route   GET /api/admin/children
 * @access  Private (Admin)
 */
export const getAllChildren = async (req, res, next) => {
  try {
    const { children, pagination } = await adminService.getAllChildren(req.query);
    res.json({
      success: true,
      count: children.length,
      ...pagination,
      data: children,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all therapist profiles
 * @route   GET /api/admin/therapists
 * @access  Private (Admin)
 */
export const getAllTherapistProfiles = async (req, res, next) => {
  try {
    const { profiles, pagination } = await adminService.getAllTherapistProfiles(req.query);
    res.json({
      success: true,
      count: profiles.length,
      ...pagination,
      data: profiles,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get therapist profile by ID
 * @route   GET /api/admin/therapists/:id
 * @access  Private (Admin)
 */
export const getTherapistProfileById = async (req, res, next) => {
  try {
    const profile = await adminService.getTherapistProfileById(req.params.id);
    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify therapist profile
 * @route   PUT /api/admin/therapists/:id/verify
 * @access  Private (Admin)
 */
export const verifyTherapistProfile = async (req, res, next) => {
  try {
    const { verificationNotes } = req.body;
    
    const profile = await therapistProfileService.verifyProfile(
      req.params.id,
      req.user._id,
      verificationNotes
    );

    res.json({
      success: true,
      message: 'Profile verified successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unverify therapist profile
 * @route   PUT /api/admin/therapists/:id/unverify
 * @access  Private (Admin)
 */
export const unverifyTherapistProfile = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const profile = await adminService.unverifyProfile(req.params.id, req.user._id, reason);

    res.json({
      success: true,
      message: 'Profile unverified successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk approve posts
 * @route   POST /api/admin/posts/bulk-approve
 * @access  Private (Admin)
 */
export const bulkApprovePosts = async (req, res, next) => {
  try {
    const { postIds, notes } = req.body;
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'postIds array is required',
      });
    }

    const result = await adminService.bulkApprovePosts(postIds, req.user._id, notes);
    res.json({
      success: true,
      message: `${result.modifiedCount} posts approved successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk reject posts
 * @route   POST /api/admin/posts/bulk-reject
 * @access  Private (Admin)
 */
export const bulkRejectPosts = async (req, res, next) => {
  try {
    const { postIds, reason } = req.body;
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'postIds array is required',
      });
    }

    const result = await adminService.bulkRejectPosts(postIds, req.user._id, reason);
    res.json({
      success: true,
      message: `${result.modifiedCount} posts rejected`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk approve comments
 * @route   POST /api/admin/comments/bulk-approve
 * @access  Private (Admin)
 */
export const bulkApproveComments = async (req, res, next) => {
  try {
    const { commentIds } = req.body;
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'commentIds array is required',
      });
    }

    const result = await adminService.bulkApproveComments(commentIds);
    res.json({
      success: true,
      message: `${result.modifiedCount} comments approved successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk reject comments
 * @route   POST /api/admin/comments/bulk-reject
 * @access  Private (Admin)
 */
export const bulkRejectComments = async (req, res, next) => {
  try {
    const { commentIds } = req.body;
    if (!commentIds || !Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'commentIds array is required',
      });
    }

    const result = await adminService.bulkRejectComments(commentIds);
    res.json({
      success: true,
      message: `${result.modifiedCount} comments rejected`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk block users
 * @route   POST /api/admin/users/bulk-block
 * @access  Private (Admin)
 */
export const bulkBlockUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    const result = await adminService.bulkBlockUsers(userIds);
    res.json({
      success: true,
      message: `${result.modifiedCount} users blocked successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk unblock users
 * @route   POST /api/admin/users/bulk-unblock
 * @access  Private (Admin)
 */
export const bulkUnblockUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    const result = await adminService.bulkUnblockUsers(userIds);
    res.json({
      success: true,
      message: `${result.modifiedCount} users unblocked successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export users to CSV
 * @route   GET /api/admin/export/users
 * @access  Private (Admin)
 */
export const exportUsers = async (req, res, next) => {
  try {
    const { headers, rows } = await adminService.exportUsers(req.query);
    
    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export posts to CSV
 * @route   GET /api/admin/export/posts
 * @access  Private (Admin)
 */
export const exportPosts = async (req, res, next) => {
  try {
    const { headers, rows } = await adminService.exportPosts(req.query);
    
    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=posts-export.csv');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create chat room
 * @route   POST /api/admin/chat/rooms
 * @access  Private (Admin)
 */
export const createChatRoom = async (req, res, next) => {
  try {
    const ChatRoom = (await import('../models/ChatRoom.model.js')).default;
    const { name, slug, description, topicDescription, isPrivate } = req.body;

    // Generate slug from name if not provided
    const roomSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Check if room with slug already exists
    const existingRoom = await ChatRoom.findOne({ slug: roomSlug });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: 'Chat room with this slug already exists',
      });
    }

    // Add current admin as moderator
    const room = await ChatRoom.create({
      name,
      slug: roomSlug,
      description: description || '',
      topicDescription: topicDescription || '',
      isPrivate: isPrivate || false,
      moderators: [req.user._id],
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: room,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Chat room with this slug already exists',
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete chat room
 * @route   DELETE /api/admin/chat/rooms/:id
 * @access  Private (Admin)
 */
export const deleteChatRoom = async (req, res, next) => {
  try {
    const ChatRoom = (await import('../models/ChatRoom.model.js')).default;
    const ChatMessage = (await import('../models/ChatMessage.model.js')).default;

    const room = await ChatRoom.findById(req.params.id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found',
      });
    }

    // Delete all messages in this room
    await ChatMessage.deleteMany({ room: room._id });

    // Delete the room
    await ChatRoom.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Chat room and all its messages deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

