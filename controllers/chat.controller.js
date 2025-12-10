import * as chatService from '../services/chat.service.js';
import * as moderationService from '../services/chatModeration.service.js';
import ChatRoom from '../models/ChatRoom.model.js';

/**
 * Get all chat rooms
 */
export const getChatRooms = async (req, res, next) => {
  try {
    const rooms = await chatService.getChatRooms();
    
    if (rooms.length === 0) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No chat rooms found. Please run "npm run seed:chat-rooms" to create chat rooms.',
      });
    }
    
    res.json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a chat room by slug
 */
export const getChatRoom = async (req, res, next) => {
  const { slug } = req.params;
  
  try {
    const room = await chatService.getChatRoomBySlug(slug);
    
    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    if (error.message === 'Chat room not found') {
      return res.status(404).json({
        success: false,
        message: `Chat room "${slug}" not found. Please run 'npm run seed:chat-rooms' to create chat rooms.`,
      });
    }
    next(error);
  }
};

/**
 * Get messages for a room
 */
export const getRoomMessages = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { cursor, limit = 50, parentMessageId, isQuestionOnly } = req.query;

    const room = await chatService.getChatRoomBySlug(slug);
    
    const result = await chatService.getRoomMessages(room._id.toString(), {
      cursor,
      limit: parseInt(limit),
      parentMessageId: parentMessageId || null,
      isQuestionOnly: isQuestionOnly === 'true',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get message replies
 */
export const getMessageReplies = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { limit = 20 } = req.query;

    const replies = await chatService.getMessageReplies(messageId, parseInt(limit));

    res.json({
      success: true,
      count: replies.length,
      data: replies,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get room presence (online users)
 */
export const getRoomPresence = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const room = await chatService.getChatRoomBySlug(slug);
    
    const presence = await chatService.getRoomPresence(room._id.toString());

    res.json({
      success: true,
      data: presence,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pin a message (moderator only)
 */
export const pinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { roomId } = req.body;

    const message = await moderationService.pinMessage(
      messageId,
      roomId,
      req.user._id
    );

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unpin a message (moderator only)
 */
export const unpinMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { roomId } = req.body;

    const message = await moderationService.unpinMessage(
      messageId,
      roomId,
      req.user._id
    );

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report a message
 */
export const reportMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { reason, category } = req.body;

    const message = await moderationService.reportMessage(
      messageId,
      req.user._id,
      reason,
      category
    );

    res.json({
      success: true,
      message: 'Message reported successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add pinned resource to room (moderator only)
 */
export const addPinnedResource = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { title, url, type = 'link', description = '' } = req.body;

    const room = await chatService.getChatRoomBySlug(slug);
    
    // Check if user is moderator
    const isModerator = room.moderators.some(
      (m) => m._id.toString() === req.user._id.toString()
    ) || req.user.role === 'admin';

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can add pinned resources',
      });
    }

    room.pinnedResources.push({
      title,
      url,
      type,
      description,
      addedBy: req.user._id,
      addedAt: new Date(),
    });

    await room.save();

    res.json({
      success: true,
      data: room.pinnedResources[room.pinnedResources.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove pinned resource from room (moderator only)
 */
export const removePinnedResource = async (req, res, next) => {
  try {
    const { slug, resourceId } = req.params;

    const room = await chatService.getChatRoomBySlug(slug);
    
    // Check if user is moderator
    const isModerator = room.moderators.some(
      (m) => m._id.toString() === req.user._id.toString()
    ) || req.user.role === 'admin';

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can remove pinned resources',
      });
    }

    room.pinnedResources = room.pinnedResources.filter(
      (r) => r._id.toString() !== resourceId
    );

    await room.save();

    res.json({
      success: true,
      message: 'Pinned resource removed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update expert tip (moderator/therapist only)
 */
export const updateExpertTip = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { message, author } = req.body;

    const room = await chatService.getChatRoomBySlug(slug);
    
    // Check if user is moderator or therapist
    const isModerator = room.moderators.some(
      (m) => m._id.toString() === req.user._id.toString()
    );
    const isTherapist = req.user.role === 'therapist' || req.user.role === 'admin';

    if (!isModerator && !isTherapist) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators or therapists can update expert tips',
      });
    }

    room.expertTip = {
      message,
      author: author || req.user.name,
      updatedAt: new Date(),
      updatedBy: req.user._id,
    };

    await room.save();

    res.json({
      success: true,
      data: room.expertTip,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update room description (moderator only)
 */
export const updateRoomDescription = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { description, topicDescription } = req.body;

    const room = await ChatRoom.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if user is moderator
    const isModerator = room.moderators.some(
      (m) => m._id.toString() === req.user._id.toString()
    ) || req.user.role === 'admin';

    if (!isModerator) {
      return res.status(403).json({
        success: false,
        message: 'Only moderators can update room description',
      });
    }

    if (description !== undefined) room.description = description;
    if (topicDescription !== undefined) room.topicDescription = topicDescription;

    await room.save();

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

