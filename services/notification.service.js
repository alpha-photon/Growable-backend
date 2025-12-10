import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import { emitNotification } from '../utils/notificationEmitter.js';

/**
 * Create a notification
 */
export const createNotification = async (notificationData) => {
  try {
    // Validate user exists
    const user = await User.findById(notificationData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check for duplicate notifications (within last 5 minutes)
    if (notificationData.groupKey) {
      const recentNotification = await Notification.findOne({
        userId: notificationData.userId,
        groupKey: notificationData.groupKey,
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      });

      if (recentNotification) {
        // Update existing notification instead of creating duplicate
        recentNotification.isRead = false;
        recentNotification.readAt = null;
        recentNotification.createdAt = new Date();
        if (notificationData.message) {
          recentNotification.message = notificationData.message;
        }
        await recentNotification.save();
        return recentNotification;
      }
    }

    const notification = await Notification.create(notificationData);
    
    // Emit real-time notification via Socket.io
    try {
      await emitNotification(notificationData.userId, notification);
    } catch (error) {
      console.error('Error emitting notification:', error);
      // Don't fail notification creation if emission fails
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create multiple notifications (for bulk operations)
 */
export const createBulkNotifications = async (notificationsData) => {
  try {
    // Validate all users exist
    const userIds = [...new Set(notificationsData.map(n => n.userId))];
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      throw new Error('Some users not found');
    }

    const notifications = await Notification.insertMany(notificationsData);
    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId, filters = {}) => {
  const {
    page = 1,
    limit = 20,
    isRead,
    type,
    priority,
    before,
    after,
  } = filters;

  const skip = (page - 1) * limit;
  const query = { userId };

  if (isRead !== undefined) {
    query.isRead = isRead === 'true' || isRead === true;
  }

  if (type) {
    query.type = type;
  }

  if (priority) {
    query.priority = priority;
  }

  if (before) {
    query.createdAt = { ...query.createdAt, $lt: new Date(before) };
  }

  if (after) {
    query.createdAt = { ...query.createdAt, $gte: new Date(after) };
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('relatedUser', 'name avatar')
      .populate('relatedPost', 'title')
      .populate('relatedComment', 'content')
      .populate('relatedAppointment', 'appointmentDate appointmentTime')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (userId, filters = {}) => {
  const query = { userId, isRead: false };

  if (filters.type) {
    query.type = filters.type;
  }

  const result = await Notification.updateMany(query, {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return result;
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  return notification;
};

/**
 * Delete all read notifications
 */
export const deleteAllRead = async (userId) => {
  const result = await Notification.deleteMany({
    userId,
    isRead: true,
  });

  return result;
};

/**
 * Get unread count
 */
export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    userId,
    isRead: false,
  });

  return count;
};

/**
 * Notification generators for different events
 */

// Post approved
export const notifyPostApproved = async (userId, postId, postTitle) => {
  return await createNotification({
    userId,
    type: 'post_approved',
    title: 'Post Approved',
    message: `Your post "${postTitle}" has been approved and is now live!`,
    relatedPost: postId,
    actionUrl: `/blog/${postId}`,
    priority: 'normal',
    groupKey: `post_approved_${postId}`,
  });
};

// Post rejected
export const notifyPostRejected = async (userId, postId, postTitle, reason) => {
  return await createNotification({
    userId,
    type: 'post_rejected',
    title: 'Post Rejected',
    message: reason
      ? `Your post "${postTitle}" was rejected. Reason: ${reason}`
      : `Your post "${postTitle}" was rejected.`,
    relatedPost: postId,
    actionUrl: `/blog/${postId}`,
    priority: 'normal',
    groupKey: `post_rejected_${postId}`,
  });
};

// Post liked
export const notifyPostLiked = async (postAuthorId, likerId, postId, postTitle, likerName) => {
  // Don't notify if user liked their own post
  if (postAuthorId.toString() === likerId.toString()) {
    return null;
  }

  return await createNotification({
    userId: postAuthorId,
    type: 'post_liked',
    title: 'New Like',
    message: `${likerName} liked your post "${postTitle}"`,
    relatedPost: postId,
    relatedUser: likerId,
    actionUrl: `/blog/${postId}`,
    priority: 'low',
    groupKey: `post_liked_${postId}_${likerId}`,
  });
};

// Comment on post
export const notifyPostCommented = async (postAuthorId, commenterId, postId, postTitle, commenterName) => {
  // Don't notify if user commented on their own post
  if (postAuthorId.toString() === commenterId.toString()) {
    return null;
  }

  return await createNotification({
    userId: postAuthorId,
    type: 'post_commented',
    title: 'New Comment',
    message: `${commenterName} commented on your post "${postTitle}"`,
    relatedPost: postId,
    relatedUser: commenterId,
    actionUrl: `/blog/${postId}`,
    priority: 'normal',
    groupKey: `post_commented_${postId}_${commenterId}`,
  });
};

// Reply to comment
export const notifyCommentReplied = async (commentAuthorId, replierId, commentId, postId, replierName) => {
  // Don't notify if user replied to their own comment
  if (commentAuthorId.toString() === replierId.toString()) {
    return null;
  }

  return await createNotification({
    userId: commentAuthorId,
    type: 'comment_replied',
    title: 'New Reply',
    message: `${replierName} replied to your comment`,
    relatedComment: commentId,
    relatedPost: postId,
    relatedUser: replierId,
    actionUrl: `/blog/${postId}`,
    priority: 'normal',
    groupKey: `comment_replied_${commentId}_${replierId}`,
  });
};

// Appointment created
export const notifyAppointmentCreated = async (therapistId, patientId, appointmentId, appointmentDate) => {
  return await createNotification({
    userId: therapistId,
    type: 'appointment_created',
    title: 'New Appointment Request',
    message: `You have a new appointment request for ${new Date(appointmentDate).toLocaleDateString()}`,
    relatedAppointment: appointmentId,
    relatedUser: patientId,
    actionUrl: `/appointments/${appointmentId}`,
    priority: 'high',
    groupKey: `appointment_created_${appointmentId}`,
  });
};

// Appointment confirmed
export const notifyAppointmentConfirmed = async (patientId, therapistId, appointmentId, appointmentDate) => {
  return await createNotification({
    userId: patientId,
    type: 'appointment_confirmed',
    title: 'Appointment Confirmed',
    message: `Your appointment has been confirmed for ${new Date(appointmentDate).toLocaleDateString()}`,
    relatedAppointment: appointmentId,
    relatedUser: therapistId,
    actionUrl: `/appointments/${appointmentId}`,
    priority: 'high',
    groupKey: `appointment_confirmed_${appointmentId}`,
  });
};

// Profile verified
export const notifyProfileVerified = async (userId, therapistId) => {
  return await createNotification({
    userId,
    type: 'profile_verified',
    title: 'Profile Verified',
    message: 'Your therapist/doctor profile has been verified!',
    relatedTherapist: therapistId,
    actionUrl: '/therapist/profile',
    priority: 'high',
    groupKey: `profile_verified_${therapistId}`,
  });
};

// Chat message (for mentions or direct messages)
export const notifyChatMessage = async (userId, senderId, roomId, messageId, senderName, roomName, isMention = false) => {
  return await createNotification({
    userId,
    type: isMention ? 'chat_mentioned' : 'chat_message',
    title: isMention ? 'You were mentioned' : 'New Message',
    message: isMention
      ? `${senderName} mentioned you in ${roomName}`
      : `${senderName} sent a message in ${roomName}`,
    relatedChatRoom: roomId,
    relatedChatMessage: messageId,
    relatedUser: senderId,
    actionUrl: `/chat/${roomId}`,
    priority: isMention ? 'high' : 'normal',
    groupKey: `chat_${roomId}_${senderId}`,
  });
};

// Admin notification for pending items
export const notifyAdminPendingPost = async (adminIds, postId, postTitle, authorName) => {
  const notifications = adminIds.map(adminId => ({
    userId: adminId,
    type: 'moderation_action',
    title: 'Pending Post',
    message: `New post "${postTitle}" by ${authorName} needs moderation`,
    relatedPost: postId,
    actionUrl: `/posts?status=pending`,
    priority: 'normal',
    groupKey: `pending_post_${postId}`,
  }));

  return await createBulkNotifications(notifications);
};

// Admin notification for flagged content
export const notifyAdminFlaggedContent = async (adminIds, contentId, contentType, reason) => {
  const notifications = adminIds.map(adminId => ({
    userId: adminId,
    type: 'content_flagged',
    title: 'Flagged Content',
    message: `New ${contentType} has been flagged. Reason: ${reason}`,
    relatedPost: contentType === 'post' ? contentId : undefined,
    relatedComment: contentType === 'comment' ? contentId : undefined,
    actionUrl: `/moderation?flagged=true`,
    priority: 'high',
    groupKey: `flagged_${contentType}_${contentId}`,
  }));

  return await createBulkNotifications(notifications);
};

