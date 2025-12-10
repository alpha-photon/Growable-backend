import express from 'express';
import {
  getPricing,
  getAllPlans,
  createSubscription,
  verifyPayment,
  getActiveSubscription,
  getSubscriptionHistory,
  cancelSubscription,
  getSubscriptionById,
  checkSubscriptionStatus,
  handleWebhook,
  getPaymentHistory,
} from '../controllers/subscription.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { sanitizeBody, sanitizeQuery } from '../middleware/sanitize.middleware.js';

const router = express.Router();

// Public routes
router.get('/pricing', sanitizeQuery, getPricing);
router.get('/plans', getAllPlans);
router.post('/webhook', handleWebhook); // Razorpay webhook (no auth required)

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/check', checkSubscriptionStatus);
router.get('/active', getActiveSubscription);
router.get('/history', sanitizeQuery, getSubscriptionHistory);
router.get('/payments', sanitizeQuery, getPaymentHistory);
router.get('/:id', getSubscriptionById);
router.post('/create', sanitizeBody, createSubscription);
router.post('/verify', sanitizeBody, verifyPayment);
router.post('/:id/cancel', sanitizeBody, cancelSubscription);

export default router;

