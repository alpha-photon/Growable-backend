import ChatMessage from '../models/ChatMessage.model.js';
import ChatRoom from '../models/ChatRoom.model.js';
import User from '../models/User.model.js';
import UserMute from '../models/UserMute.model.js';
import ModerationLog from '../models/ModerationLog.model.js';
import { clearRateLimit } from '../utils/chatModeration.js';

/**
 * Delete a message
 */
export const deleteMessage = async (messageId, moderatorId, reason = '') => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = moderatorId;
  await message.save();

  // Log moderation action
  await ModerationLog.create({
    action: 'delete_message',
    moderator: moderatorId,
    targetMessage: messageId,
    targetUser: message.user,
    targetRoom: message.room,
    reason,
  });

  return message;
};

/**
 * Warn a user (temporary mute)
 */
export const warnUser = async (userId, roomId, moderatorId, reason = '', durationMinutes = 10) => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

  const mute = await UserMute.create({
    user: userId,
    room: roomId,
    mutedBy: moderatorId,
    reason,
    expiresAt,
    isActive: true,
  });

  // Log moderation action
  await ModerationLog.create({
    action: 'warn_user',
    moderator: moderatorId,
    targetUser: userId,
    targetRoom: roomId,
    reason,
    duration: durationMinutes,
    expiresAt,
  });

  return mute;
};

/**
 * Ban a user
 */
export const banUser = async (userId, moderatorId, reason = '', durationMinutes = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Block user account
  user.blocked = true;
  await user.save();

  // Create permanent or temporary mute
  const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;
  
  const mute = await UserMute.create({
    user: userId,
    room: null, // Global ban
    mutedBy: moderatorId,
    reason,
    expiresAt,
    isActive: true,
  });

  // Clear rate limits
  clearRateLimit(userId.toString());

  // Log moderation action
  await ModerationLog.create({
    action: 'ban_user',
    moderator: moderatorId,
    targetUser: userId,
    reason,
    duration: durationMinutes,
    expiresAt,
  });

  return mute;
};

/**
 * Unban a user
 */
export const unbanUser = async (userId, moderatorId, reason = '') => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.blocked = false;
  await user.save();

  // Deactivate all mutes for user
  await UserMute.updateMany(
    { user: userId, isActive: true },
    { isActive: false }
  );

  // Log moderation action
  await ModerationLog.create({
    action: 'unban_user',
    moderator: moderatorId,
    targetUser: userId,
    reason,
  });

  return user;
};

/**
 * Mute a user
 */
export const muteUser = async (userId, roomId, moderatorId, reason = '', durationMinutes = null) => {
  const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60 * 1000) : null;

  const mute = await UserMute.findOneAndUpdate(
    { user: userId, room: roomId, isActive: true },
    {
      mutedBy: moderatorId,
      reason,
      expiresAt,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // Log moderation action
  await ModerationLog.create({
    action: 'mute_user',
    moderator: moderatorId,
    targetUser: userId,
    targetRoom: roomId,
    reason,
    duration: durationMinutes,
    expiresAt,
  });

  return mute;
};

/**
 * Unmute a user
 */
export const unmuteUser = async (userId, roomId, moderatorId, reason = '') => {
  await UserMute.updateMany(
    { user: userId, room: roomId, isActive: true },
    { isActive: false }
  );

  // Log moderation action
  await ModerationLog.create({
    action: 'unmute_user',
    moderator: moderatorId,
    targetUser: userId,
    targetRoom: roomId,
    reason,
  });
};

/**
 * Pin a message
 */
export const pinMessage = async (messageId, roomId, moderatorId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message || message.room.toString() !== roomId.toString()) {
    throw new Error('Message not found or does not belong to this room');
  }

  message.isPinned = true;
  await message.save();

  // Add to room's pinned messages
  await ChatRoom.findByIdAndUpdate(roomId, {
    $addToSet: { pinnedMessages: messageId },
  });

  // Log moderation action
  await ModerationLog.create({
    action: 'pin_message',
    moderator: moderatorId,
    targetMessage: messageId,
    targetRoom: roomId,
  });

  return message;
};

/**
 * Unpin a message
 */
export const unpinMessage = async (messageId, roomId, moderatorId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  message.isPinned = false;
  await message.save();

  // Remove from room's pinned messages
  await ChatRoom.findByIdAndUpdate(roomId, {
    $pull: { pinnedMessages: messageId },
  });

  // Log moderation action
  await ModerationLog.create({
    action: 'unpin_message',
    moderator: moderatorId,
    targetMessage: messageId,
    targetRoom: roomId,
  });

  return message;
};

/**
 * Report a message
 */
export const reportMessage = async (messageId, reporterId, reason, category) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  // Check if already reported by this user
  const alreadyReported = message.flaggedBy.some(
    (f) => f.user.toString() === reporterId.toString()
  );

  if (alreadyReported) {
    throw new Error('You have already reported this message');
  }

  message.isFlagged = true;
  message.flaggedReason = category;
  message.needsReview = true;
  message.flaggedBy.push({
    user: reporterId,
    reason: category,
    reportedAt: new Date(),
  });

  await message.save();

  // Log moderation action
  await ModerationLog.create({
    action: 'flag_message',
    moderator: reporterId,
    targetMessage: messageId,
    targetUser: message.user,
    targetRoom: message.room,
    reason: `${category}: ${reason}`,
  });

  return message;
};

/**
 * Approve a flagged message
 */
export const approveMessage = async (messageId, moderatorId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  message.isFlagged = false;
  message.needsReview = false;
  message.approved = true;
  await message.save();

  // Log moderation action
  await ModerationLog.create({
    action: 'approve_message',
    moderator: moderatorId,
    targetMessage: messageId,
    reason: 'Message approved after review',
  });

  return message;
};

/**
 * Reject a flagged message (delete it)
 */
export const rejectMessage = async (messageId, moderatorId, reason = '') => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = moderatorId;
  message.isFlagged = false;
  message.needsReview = false;
  message.approved = false;
  await message.save();

  // Log moderation action
  await ModerationLog.create({
    action: 'reject_message',
    moderator: moderatorId,
    targetMessage: messageId,
    targetUser: message.user,
    targetRoom: message.room,
    reason,
  });

  return message;
};

/**
 * Get flagged messages for moderation
 */
export const getFlaggedMessages = async (roomId = null, limit = 50) => {
  const query = {
    isFlagged: true,
    needsReview: true,
    isDeleted: false,
  };

  if (roomId) {
    query.room = roomId;
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email role displayName')
    .populate('room', 'slug name')
    .lean();

  return messages;
};

/**
 * Get moderation logs
 */
export const getModerationLogs = async (filters = {}, limit = 100) => {
  const {
    moderatorId = null,
    targetUserId = null,
    action = null,
    startDate = null,
    endDate = null,
  } = filters;

  const query = {};

  if (moderatorId) query.moderator = moderatorId;
  if (targetUserId) query.targetUser = targetUserId;
  if (action) query.action = action;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await ModerationLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('moderator', 'name email role')
    .populate('targetUser', 'name email')
    .populate('targetMessage', 'content')
    .populate('targetRoom', 'slug name')
    .lean();

  return logs;
};

/**
 * Get active mutes and bans
 */
export const getActiveMutes = async (roomId = null) => {
  const query = {
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  };

  if (roomId) {
    query.$or.push({ room: null }, { room: roomId });
  } else {
    query.$or = [
      { room: null, expiresAt: null },
      { room: null, expiresAt: { $gt: new Date() } },
    ];
  }

  const mutes = await UserMute.find(query)
    .populate('user', 'name email role')
    .populate('mutedBy', 'name email role')
    .populate('room', 'slug name')
    .lean();

  return mutes;
};

