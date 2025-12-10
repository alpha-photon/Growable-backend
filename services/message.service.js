import DirectMessage from '../models/DirectMessage.model.js';
import User from '../models/User.model.js';

/**
 * Send message
 */
export const sendMessage = async (senderId, recipientId, messageData) => {
  const { content, messageType, attachments, appointmentId, parentMessageId } = messageData;

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new Error('Recipient not found');
  }

  // Determine threadId
  let threadId = null;
  if (parentMessageId) {
    const parentMessage = await DirectMessage.findById(parentMessageId);
    threadId = parentMessage?.threadId || parentMessageId;
  }

  const message = new DirectMessage({
    senderId,
    recipientId,
    content,
    messageType: messageType || 'text',
    attachments: attachments || [],
    appointmentId,
    parentMessageId,
    threadId,
  });

  await message.save();

  await message.populate('senderId', 'name email avatar role');
  await message.populate('recipientId', 'name email avatar role');
  
  return message;
};

/**
 * Get conversation between two users
 */
export const getConversation = async (userId1, userId2, options = {}) => {
  const { page = 1, limit = 50 } = options;

  const query = {
    $or: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 },
    ],
    isDeleted: false,
  };

  const skip = (page - 1) * limit;

  const messages = await DirectMessage.find(query)
    .populate('senderId', 'name email avatar role')
    .populate('recipientId', 'name email avatar role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return messages.reverse(); // Return in chronological order
};

/**
 * Get all conversations for a user
 */
export const getConversations = async (userId) => {
  // Get all unique conversation partners
  const sentMessages = await DirectMessage.find({ senderId: userId, isDeleted: false })
    .select('recipientId')
    .lean();

  const receivedMessages = await DirectMessage.find({ recipientId: userId, isDeleted: false })
    .select('senderId')
    .lean();

  const partnerIds = new Set();
  sentMessages.forEach((m) => partnerIds.add(m.recipientId.toString()));
  receivedMessages.forEach((m) => partnerIds.add(m.senderId.toString()));

  // Get last message for each conversation
  const conversations = await Promise.all(
    Array.from(partnerIds).map(async (partnerId) => {
      const lastMessage = await DirectMessage.findOne({
        $or: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId },
        ],
        isDeleted: false,
      })
        .populate('senderId', 'name email avatar role')
        .populate('recipientId', 'name email avatar role')
        .sort({ createdAt: -1 })
        .lean();

      // Count unread messages
      const unreadCount = await DirectMessage.countDocuments({
        senderId: partnerId,
        recipientId: userId,
        isRead: false,
        isDeleted: false,
      });

      const partner = await User.findById(partnerId).select('name email avatar role').lean();

      return {
        partner,
        lastMessage,
        unreadCount,
      };
    })
  );

  // Sort by last message time
  conversations.sort((a, b) => {
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
  });

  return conversations;
};

/**
 * Mark messages as read
 */
export const markAsRead = async (userId, conversationPartnerId) => {
  await DirectMessage.updateMany(
    {
      senderId: conversationPartnerId,
      recipientId: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

/**
 * Delete message
 */
export const deleteMessage = async (messageId, userId) => {
  const message = await DirectMessage.findById(messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId.toString() !== userId.toString()) {
    throw new Error('Not authorized to delete this message');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.deletedBy = userId;

  await message.save();

  return message;
};

