import express from 'express';
import * as chatController from '../controllers/chat.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Protected routes - require login
router.get('/rooms', chatController.getChatRooms);
router.get('/rooms/:slug', chatController.getChatRoom);
router.get('/rooms/:slug/messages', chatController.getRoomMessages);
router.get('/messages/:messageId/replies', chatController.getMessageReplies);
router.get('/rooms/:slug/presence', chatController.getRoomPresence);

router.post('/messages/:messageId/report', chatController.reportMessage);
router.post('/rooms/:slug/resources', chatController.addPinnedResource);
router.delete('/rooms/:slug/resources/:resourceId', chatController.removePinnedResource);
router.put('/rooms/:slug/expert-tip', chatController.updateExpertTip);
router.put('/rooms/:slug/description', chatController.updateRoomDescription);
router.post('/messages/:messageId/pin', authorize('moderator', 'admin'), chatController.pinMessage);
router.post('/messages/:messageId/unpin', authorize('moderator', 'admin'), chatController.unpinMessage);

export default router;

