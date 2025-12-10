/**
 * Helper to emit Socket.io notifications
 * This allows services to emit notifications without directly importing socket.io
 */

let ioInstance = null;

export const setIOInstance = (io) => {
  ioInstance = io;
};

export const emitNotification = async (userId, notification) => {
  if (!ioInstance) {
    // Socket.io not initialized yet, skip emission
    return;
  }

  try {
    // Import notification service to get unread count
    const { getUnreadCount } = await import('../services/notification.service.js');
    const unreadCount = await getUnreadCount(userId);
    
    ioInstance.to(`user:${userId}`).emit('new_notification', {
      notification,
      unreadCount,
    });
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

export const emitNotificationCount = async (userId) => {
  if (!ioInstance) {
    return;
  }

  try {
    const { getUnreadCount } = await import('../services/notification.service.js');
    const unreadCount = await getUnreadCount(userId);
    
    ioInstance.to(`user:${userId}`).emit('notification_count', {
      count: unreadCount,
    });
  } catch (error) {
    console.error('Error emitting notification count:', error);
  }
};

