import * as moderationService from '../services/chatModeration.service.js';

/**
 * Delete a message
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { reason = '' } = req.body;

    const message = await moderationService.deleteMessage(
      messageId,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Warn a user (temporary mute)
 */
export const warnUser = async (req, res, next) => {
  try {
    const { userId, roomId, reason = '', durationMinutes = 10 } = req.body;

    const mute = await moderationService.warnUser(
      userId,
      roomId,
      req.user._id,
      reason,
      durationMinutes
    );

    res.json({
      success: true,
      message: 'User warned successfully',
      data: mute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ban a user
 */
export const banUser = async (req, res, next) => {
  try {
    const { userId, reason = '', durationMinutes = null } = req.body;

    const mute = await moderationService.banUser(
      userId,
      req.user._id,
      reason,
      durationMinutes
    );

    res.json({
      success: true,
      message: 'User banned successfully',
      data: mute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unban a user
 */
export const unbanUser = async (req, res, next) => {
  try {
    const { userId, reason = '' } = req.body;

    const user = await moderationService.unbanUser(
      userId,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mute a user
 */
export const muteUser = async (req, res, next) => {
  try {
    const { userId, roomId, reason = '', durationMinutes = null } = req.body;

    const mute = await moderationService.muteUser(
      userId,
      roomId,
      req.user._id,
      reason,
      durationMinutes
    );

    res.json({
      success: true,
      message: 'User muted successfully',
      data: mute,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unmute a user
 */
export const unmuteUser = async (req, res, next) => {
  try {
    const { userId, roomId, reason = '' } = req.body;

    await moderationService.unmuteUser(
      userId,
      roomId,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: 'User unmuted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a flagged message
 */
export const approveMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;

    const message = await moderationService.approveMessage(
      messageId,
      req.user._id
    );

    res.json({
      success: true,
      message: 'Message approved successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a flagged message
 */
export const rejectMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { reason = '' } = req.body;

    const message = await moderationService.rejectMessage(
      messageId,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: 'Message rejected successfully',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get flagged messages
 */
export const getFlaggedMessages = async (req, res, next) => {
  try {
    const { roomId, limit = 50 } = req.query;

    const messages = await moderationService.getFlaggedMessages(
      roomId || null,
      parseInt(limit)
    );

    res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get moderation logs
 */
export const getModerationLogs = async (req, res, next) => {
  try {
    const {
      moderatorId,
      targetUserId,
      action,
      startDate,
      endDate,
      limit = 100,
    } = req.query;

    const logs = await moderationService.getModerationLogs(
      {
        moderatorId: moderatorId || null,
        targetUserId: targetUserId || null,
        action: action || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      parseInt(limit)
    );

    res.json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active mutes
 */
export const getActiveMutes = async (req, res, next) => {
  try {
    const { roomId } = req.query;

    const mutes = await moderationService.getActiveMutes(roomId || null);

    res.json({
      success: true,
      count: mutes.length,
      data: mutes,
    });
  } catch (error) {
    next(error);
  }
};

