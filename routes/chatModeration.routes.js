import express from 'express';
import * as moderationController from '../controllers/chatModeration.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication and moderator/admin role
router.use(protect);
router.use(authorize('moderator', 'admin', 'therapist'));

// Message moderation
router.delete('/messages/:messageId', moderationController.deleteMessage);
router.post('/messages/:messageId/approve', moderationController.approveMessage);
router.post('/messages/:messageId/reject', moderationController.rejectMessage);

// User moderation
router.post('/users/warn', moderationController.warnUser);
router.post('/users/ban', moderationController.banUser);
router.post('/users/unban', moderationController.unbanUser);
router.post('/users/mute', moderationController.muteUser);
router.post('/users/unmute', moderationController.unmuteUser);

// Moderation dashboard
router.get('/flagged-messages', moderationController.getFlaggedMessages);
router.get('/logs', moderationController.getModerationLogs);
router.get('/active-mutes', moderationController.getActiveMutes);

export default router;

