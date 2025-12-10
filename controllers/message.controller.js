import * as messageService from '../services/message.service.js';

/**
 * @route   POST /api/messages
 * @desc    Send message
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { recipientId, content, messageType, attachments, appointmentId, parentMessageId } =
      req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: 'recipientId and content are required',
      });
    }

    const message = await messageService.sendMessage(req.user._id, recipientId, {
      content,
      messageType,
      attachments,
      appointmentId,
      parentMessageId,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
export const getConversations = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const conversations = await messageService.getConversations(req.user._id);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get conversation with specific user
 * @access  Private
 */
export const getConversation = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await messageService.getConversation(req.user._id, userId, { page, limit });

    // Mark messages as read
    await messageService.markAsRead(req.user._id, userId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const { userId } = req.query; // conversation partner userId
    if (userId) {
      await messageService.markAsRead(req.user._id, userId);
    }

    res.json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
export const deleteMessage = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    await messageService.deleteMessage(req.params.id, req.user._id);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

