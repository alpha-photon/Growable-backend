import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import * as chatService from '../services/chat.service.js';
import * as moderationService from '../services/chatModeration.service.js';
import UserPresence from '../models/UserPresence.model.js';
import * as notificationService from '../services/notification.service.js';

/**
 * Socket.io authentication middleware
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      // Require authentication - no anonymous users
      return next(new Error('Authentication required. Please login to use chat.'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || user.blocked) {
        return next(new Error('Authentication failed'));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      socket.isAnonymous = false;
      socket.displayName = user.displayName || user.name || 'User';
      socket.avatarEmoji = user.avatarEmoji || '';
      
      next();
    } catch (error) {
      // Invalid token - require login
      return next(new Error('Invalid token. Please login again.'));
    }
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

/**
 * Initialize Socket.io server
 */
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Store active rooms and their user counts
  const roomUsers = new Map(); // roomId -> Set of socketIds
  // Store user socket connections for notifications
  const userSockets = new Map(); // userId -> Set of socketIds

  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id} (User: ${socket.userId || 'Anonymous'})`);

    // All users must be authenticated (no anonymous users)
    if (!socket.userId || socket.isAnonymous) {
      socket.emit('error', { message: 'Authentication required. Please login.' });
      socket.disconnect();
      return;
    }

    // Track user socket for notifications
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    // Join user's notification room
    socket.join(`user:${socket.userId}`);

    // Send unread count on connection
    try {
      const unreadCount = await notificationService.getUnreadCount(socket.userId);
      socket.emit('notification_count', { count: unreadCount });
    } catch (error) {
      console.error('Error getting unread count:', error);
    }

    // Handle room join
    socket.on('join_room', async ({ roomId, roomSlug }) => {
      try {
        let targetRoomId = roomId;
        
        // If slug provided, get room by slug
        if (roomSlug && !roomId) {
          const room = await chatService.getChatRoomBySlug(roomSlug);
          targetRoomId = room._id.toString();
        }

        if (!targetRoomId) {
          socket.emit('error', { message: 'Room ID or slug required' });
          return;
        }

        // Verify user can access room
        let room;
        if (roomSlug) {
          room = await chatService.getChatRoomBySlug(roomSlug);
          targetRoomId = room._id.toString();
        } else {
          const ChatRoom = (await import('../models/ChatRoom.model.js')).default;
          room = await ChatRoom.findById(targetRoomId).populate('moderators').lean();
          if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
          }
        }
        
        if (room.isPrivate && (!socket.userId || !room.moderators.some(m => {
          const modId = typeof m === 'object' ? m._id.toString() : m.toString();
          return modId === socket.userId;
        }))) {
          socket.emit('error', { message: 'Access denied to private room' });
          return;
        }

        // Join socket room
        socket.join(targetRoomId);
        
        // Join room in database
        if (socket.userId) {
          await chatService.joinRoom(
            socket.userId,
            targetRoomId,
            socket.id,
            socket.displayName,
            socket.avatarEmoji
          );
        }

        // Track room users
        if (!roomUsers.has(targetRoomId)) {
          roomUsers.set(targetRoomId, new Set());
        }
        roomUsers.get(targetRoomId).add(socket.id);

        // Update presence count
        const presence = await chatService.getRoomPresence(targetRoomId);
        
        // Emit to others in room
        socket.to(targetRoomId).emit('user_joined', {
          displayName: socket.displayName,
          avatarEmoji: socket.avatarEmoji,
          onlineCount: presence.onlineCount,
        });

        // Send current presence to joining user
        socket.emit('room_presence', presence);

        console.log(`User ${socket.displayName} joined room ${targetRoomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: error.message || 'Failed to join room' });
      }
    });

    // Handle room leave
    socket.on('leave_room', async ({ roomId }) => {
      try {
        if (roomId) {
          socket.leave(roomId);
          
          if (socket.userId) {
            await chatService.leaveRoom(socket.id);
          }

          // Update room users
          if (roomUsers.has(roomId)) {
            roomUsers.get(roomId).delete(socket.id);
            if (roomUsers.get(roomId).size === 0) {
              roomUsers.delete(roomId);
            }
          }

          const presence = await chatService.getRoomPresence(roomId);
          
          socket.to(roomId).emit('user_left', {
            displayName: socket.displayName,
            onlineCount: presence.onlineCount,
          });
        }
      } catch (error) {
        console.error('Leave room error:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing_start', async ({ roomId }) => {
      try {
        if (socket.userId && roomId) {
          await chatService.updateTyping(socket.id, roomId, true);
          socket.to(roomId).emit('user_typing', {
            displayName: socket.displayName,
            avatarEmoji: socket.avatarEmoji,
          });
        }
      } catch (error) {
        console.error('Typing start error:', error);
      }
    });

    socket.on('typing_stop', async ({ roomId }) => {
      try {
        if (socket.userId && roomId) {
          await chatService.updateTyping(socket.id, roomId, false);
          socket.to(roomId).emit('user_stopped_typing', {
            displayName: socket.displayName,
          });
        }
      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

    // Handle sending message
    socket.on('send_message', async (data) => {
      try {
        if (!socket.userId && !socket.isAnonymous) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        // Require authentication - no anonymous messages
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required. Please login to send messages.' });
          return;
        }

        const {
          roomId,
          content,
          messageType = 'text',
          imageUrl,
          imagePublicId,
          voiceUrl,
          voiceDuration,
          parentMessageId,
        } = data;

        // Send message
        const message = await chatService.sendMessage({
          userId: socket.userId,
          roomId,
          content,
          messageType,
          imageUrl,
          imagePublicId,
          voiceUrl,
          voiceDuration,
          parentMessageId,
        });

        // Stop typing indicator
        if (roomId) {
          await chatService.updateTyping(socket.id, roomId, false);
        }

        // Broadcast message to room
        io.to(roomId).emit('new_message', message);

        // Update presence
        const presence = await chatService.getRoomPresence(roomId);
        io.to(roomId).emit('room_presence', presence);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
      }
    });

    // Handle message reactions
    socket.on('react_message', async ({ messageId, emoji }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const reactions = await chatService.reactToMessage(messageId, socket.userId, emoji);
        
        // Get message to find room
        const ChatMessage = (await import('../models/ChatMessage.model.js')).default;
        const message = await ChatMessage.findById(messageId).select('room');
        
        if (message) {
          io.to(message.room.toString()).emit('message_reaction', {
            messageId,
            reactions,
          });
        }
      } catch (error) {
        console.error('React message error:', error);
        socket.emit('error', { message: error.message || 'Failed to react' });
      }
    });

    // Handle upvote
    socket.on('upvote_message', async ({ messageId }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const result = await chatService.upvoteMessage(messageId, socket.userId);
        
        // Get message to find room
        const ChatMessage = (await import('../models/ChatMessage.model.js')).default;
        const message = await ChatMessage.findById(messageId).select('room');
        
        if (message) {
          io.to(message.room.toString()).emit('message_upvote', {
            messageId,
            ...result,
          });
        }
      } catch (error) {
        console.error('Upvote message error:', error);
        socket.emit('error', { message: error.message || 'Failed to upvote' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        console.log(`Socket disconnected: ${socket.id}`);

        if (socket.userId) {
          // Remove from user sockets
          if (userSockets.has(socket.userId)) {
            userSockets.get(socket.userId).delete(socket.id);
            if (userSockets.get(socket.userId).size === 0) {
              userSockets.delete(socket.userId);
            }
          }

          const presence = await UserPresence.findOne({ socketId: socket.id });
          
          if (presence) {
            const roomId = presence.room.toString();
            await chatService.leaveRoom(socket.id);

            // Update room users
            if (roomUsers.has(roomId)) {
              roomUsers.get(roomId).delete(socket.id);
            }

            const updatedPresence = await chatService.getRoomPresence(roomId);
            socket.to(roomId).emit('user_left', {
              displayName: socket.displayName,
              onlineCount: updatedPresence.onlineCount,
            });
          }
        }
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    });
  });

  // Helper function to emit notification to user
  const emitNotification = async (userId, notification) => {
    try {
      const unreadCount = await notificationService.getUnreadCount(userId);
      io.to(`user:${userId}`).emit('new_notification', {
        notification,
        unreadCount,
      });
    } catch (error) {
      console.error('Error emitting notification:', error);
    }
  };

  // Export helper for use in services
  io.emitNotification = emitNotification;

  return io;
};

