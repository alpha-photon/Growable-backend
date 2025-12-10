import express from 'express';
import * as messageController from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/', messageController.sendMessage);
router.get('/conversations', messageController.getConversations);
router.get('/conversation/:userId', messageController.getConversation);
router.put('/read', messageController.markAsRead);
router.delete('/:id', messageController.deleteMessage);

export default router;

