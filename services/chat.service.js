import ChatRoom from '../models/ChatRoom.model.js';
import ChatMessage from '../models/ChatMessage.model.js';
import UserPresence from '../models/UserPresence.model.js';
import User from '../models/User.model.js';
import UserMute from '../models/UserMute.model.js';
import { moderateMessage } from '../utils/chatModeration.js';

/**
 * Get all active chat rooms
 */
export const getChatRooms = async () => {
  const rooms = await ChatRoom.find({ isActive: true })
    .populate('moderators', 'name email role displayName avatarEmoji')
    .sort({ lastMessageAt: -1, name: 1 });

  return rooms;
};

/**
 * Get a chat room by slug
 */
export const getChatRoomBySlug = async (slug) => {
  const room = await ChatRoom.findOne({ slug, isActive: true })
    .populate('moderators', 'name email role displayName avatarEmoji')
    .populate('pinnedMessages')
    .lean();

  if (!room) {
    throw new Error('Chat room not found');
  }

  return room;
};

/**
 * Join a chat room (create presence)
 */
export const joinRoom = async (userId, roomId, socketId, displayName, avatarEmoji) => {
  // Check if user is muted in this room
  const mute = await UserMute.findOne({
    user: userId,
    $or: [{ room: null }, { room: roomId }], // Global or room-specific mute
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (mute) {
    throw new Error('You are muted and cannot join chat rooms');
  }

  // Remove existing presence for this socket (cleanup)
  await UserPresence.deleteOne({ socketId });

  // Create or update presence
  const presence = await UserPresence.findOneAndUpdate(
    { user: userId, room: roomId },
    {
      socketId,
      displayName,
      avatarEmoji,
      isTyping: false,
      lastSeenAt: new Date(),
      joinedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return presence;
};

/**
 * Leave a chat room (remove presence)
 */
export const leaveRoom = async (socketId) => {
  const presence = await UserPresence.findOne({ socketId });
  if (presence) {
    await UserPresence.deleteOne({ socketId });
    return presence.room;
  }
  return null;
};

/**
 * Send a message in a chat room
 */
export const sendMessage = async ({
  userId,
  roomId,
  content,
  messageType = 'text',
  imageUrl = null,
  imagePublicId = null,
  voiceUrl = null,
  voiceDuration = null,
  parentMessageId = null,
}) => {
  // Check if user is muted
  const mute = await UserMute.findOne({
    user: userId,
    $or: [{ room: null }, { room: roomId }],
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  if (mute) {
    throw new Error('You are muted and cannot send messages');
  }

  // Get user info
  const user = await User.findById(userId);
  if (!user || user.blocked) {
    throw new Error('User not found or blocked');
  }

  // Get room
  const room = await ChatRoom.findById(roomId);
  if (!room || !room.isActive) {
    throw new Error('Chat room not found or inactive');
  }

  // Moderate message (for text messages)
  let moderationResult = { approved: true, needsReview: false };
  if (messageType === 'text' && content) {
    moderationResult = moderateMessage(content, userId.toString());
    
    if (!moderationResult.approved) {
      throw new Error(moderationResult.message || 'Message rejected by moderation system');
    }
  }

  // Create message
  const messageData = {
    room: roomId,
    user: userId,
    displayName: user.displayName || user.name || 'Anonymous',
    avatarEmoji: user.avatarEmoji || '',
    messageType,
    content: moderationResult.sanitizedContent || content,
    isFlagged: moderationResult.needsReview,
    needsReview: moderationResult.needsReview,
    reviewReason: moderationResult.flaggedReason,
    approved: moderationResult.approved,
  };

  if (messageType === 'image') {
    messageData.imageUrl = imageUrl;
    messageData.imagePublicId = imagePublicId;
  }

  if (messageType === 'voice') {
    messageData.voiceUrl = voiceUrl;
    messageData.voiceDuration = voiceDuration;
  }

  if (parentMessageId) {
    messageData.parentMessage = parentMessageId;
    // Update parent message reply count
    await ChatMessage.findByIdAndUpdate(parentMessageId, {
      $inc: { replyCount: 1 },
      $push: { replies: null }, // Will be updated after message creation
    });
  }

  const message = new ChatMessage(messageData);
  await message.save();

  // Update parent message replies array
  if (parentMessageId) {
    await ChatMessage.findByIdAndUpdate(parentMessageId, {
      $push: { replies: message._id },
    });
  }

  // Update room message count and last message time
  await ChatRoom.findByIdAndUpdate(roomId, {
    $inc: { messageCount: 1 },
    lastMessageAt: new Date(),
  });

  // Update user message count
  await User.findByIdAndUpdate(userId, {
    $inc: { chatMessageCount: 1 },
    lastActiveAt: new Date(),
  });

  // Populate message for response
  const populatedMessage = await ChatMessage.findById(message._id)
    .populate('user', 'name email role displayName avatarEmoji')
    .populate('parentMessage', 'content displayName')
    .lean();

  return populatedMessage;
};

/**
 * Get messages for a room with pagination
 */
export const getRoomMessages = async (roomId, options = {}) => {
  const {
    cursor = null,
    limit = 50,
    parentMessageId = null,
    isQuestionOnly = false,
  } = options;

  const query = {
    room: roomId,
    isDeleted: false,
  };

  if (parentMessageId) {
    query.parentMessage = parentMessageId;
  } else {
    query.parentMessage = null; // Only top-level messages
  }

  if (isQuestionOnly) {
    query.isQuestion = true;
  }

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email role displayName avatarEmoji')
    .populate('parentMessage', 'content displayName')
    .lean();

  // Reverse to get chronological order
  messages.reverse();

  const nextCursor = messages.length === limit ? messages[0]._id : null;
  const hasMore = messages.length === limit;

  return {
    messages,
    nextCursor,
    hasMore,
  };
};

/**
 * Get message replies
 */
export const getMessageReplies = async (messageId, limit = 20) => {
  const replies = await ChatMessage.find({
    parentMessage: messageId,
    isDeleted: false,
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('user', 'name email role displayName avatarEmoji')
    .lean();

  return replies;
};

/**
 * Get online users in a room
 */
export const getRoomPresence = async (roomId) => {
  const presence = await UserPresence.find({ room: roomId })
    .populate('user', 'name email role displayName avatarEmoji')
    .select('-socketId')
    .lean();

  const onlineCount = presence.length;
  const typingUsers = presence.filter((p) => p.isTyping).map((p) => ({
    displayName: p.displayName,
    avatarEmoji: p.avatarEmoji,
  }));

  return {
    onlineCount,
    users: presence.map((p) => ({
      displayName: p.displayName,
      avatarEmoji: p.avatarEmoji,
      role: p.user?.role,
    })),
    typingUsers,
  };
};

/**
 * Update typing indicator
 */
export const updateTyping = async (socketId, roomId, isTyping) => {
  await UserPresence.findOneAndUpdate(
    { socketId, room: roomId },
    {
      isTyping,
      lastTypingAt: isTyping ? new Date() : null,
    }
  );
};

/**
 * React to a message
 */
export const reactToMessage = async (messageId, userId, emoji) => {
  const message = await ChatMessage.findById(messageId);
  if (!message || message.isDeleted) {
    throw new Error('Message not found');
  }

  // Find or create reaction
  let reaction = message.reactions.find((r) => r.emoji === emoji);
  
  if (reaction) {
    // Toggle user in reaction
    const userIndex = reaction.users.findIndex((u) => u.toString() === userId.toString());
    if (userIndex >= 0) {
      // Remove reaction
      reaction.users.splice(userIndex, 1);
      reaction.count = Math.max(0, reaction.count - 1);
      if (reaction.count === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      // Add reaction
      reaction.users.push(userId);
      reaction.count += 1;
    }
  } else {
    // Create new reaction
    message.reactions.push({
      emoji,
      users: [userId],
      count: 1,
    });
  }

  await message.save();
  return message.reactions;
};

/**
 * Upvote a message (helpful reaction)
 */
export const upvoteMessage = async (messageId, userId) => {
  const message = await ChatMessage.findById(messageId);
  if (!message || message.isDeleted) {
    throw new Error('Message not found');
  }

  const userIndex = message.upvotes.findIndex((u) => u.toString() === userId.toString());
  
  if (userIndex >= 0) {
    // Remove upvote
    message.upvotes.splice(userIndex, 1);
    message.upvoteCount = Math.max(0, message.upvoteCount - 1);
  } else {
    // Add upvote
    message.upvotes.push(userId);
    message.upvoteCount += 1;
    
    // Update helpful upvotes count for message author
    if (message.user.toString() !== userId.toString()) {
      await User.findByIdAndUpdate(message.user, {
        $inc: { helpfulUpvotes: 1 },
      });
    }
  }

  await message.save();
  return {
    upvoteCount: message.upvoteCount,
    hasUpvoted: message.upvotes.some((u) => u.toString() === userId.toString()),
  };
};

