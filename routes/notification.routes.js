import express from 'express';
import { query, body } from 'express-validator';
import * as notificationController from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isRead')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['true', 'false'].includes(value);
      }),
    query('type').optional().trim(),
    query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  ],
  handleValidationErrors,
  notificationController.getNotifications
);

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', notificationController.getUnreadCount);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', notificationController.markAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put(
  '/read-all',
  [
    body('type').optional().trim(),
  ],
  handleValidationErrors,
  notificationController.markAllAsRead
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', notificationController.deleteNotification);

// @route   DELETE /api/notifications/read
// @desc    Delete all read notifications
// @access  Private
router.delete('/read', notificationController.deleteAllRead);

export default router;

