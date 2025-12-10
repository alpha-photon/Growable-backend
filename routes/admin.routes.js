import express from 'express';
import { query, body } from 'express-validator';
import * as adminController from '../controllers/admin.controller.js';
import * as adminSubscriptionController from '../controllers/adminSubscription.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get(
  '/dashboard/analytics',
  [query('days').optional().isInt({ min: 1, max: 365 })],
  handleValidationErrors,
  adminController.getAnalytics
);

// Users
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['parent', 'teacher', 'therapist', 'doctor', 'admin'].includes(value);
      })
      .withMessage('Invalid role'),
    query('blocked')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['true', 'false'].includes(value);
      })
      .withMessage('Invalid blocked value'),
    query('search').optional().trim(),
  ],
  handleValidationErrors,
  adminController.getAllUsers
);
router.get('/users/:id', adminController.getUserById);
router.put(
  '/users/:id',
  [
    body('role').optional().isIn(['parent', 'teacher', 'therapist', 'doctor', 'admin']),
    body('verified').optional().isBoolean(),
    body('blocked').optional().isBoolean(),
  ],
  handleValidationErrors,
  adminController.updateUser
);
router.put('/users/:id/block', adminController.blockUser);
router.put('/users/:id/unblock', adminController.unblockUser);
router.delete('/users/:id', adminController.deleteUser);
router.post(
  '/users/bulk-block',
  [
    body('userIds').isArray().withMessage('userIds must be an array'),
    body('userIds.*').isMongoId().withMessage('Each userId must be a valid MongoDB ID'),
  ],
  handleValidationErrors,
  adminController.bulkBlockUsers
);
router.post(
  '/users/bulk-unblock',
  [
    body('userIds').isArray().withMessage('userIds must be an array'),
    body('userIds.*').isMongoId().withMessage('Each userId must be a valid MongoDB ID'),
  ],
  handleValidationErrors,
  adminController.bulkUnblockUsers
);

// Posts
router.get(
  '/posts',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['draft', 'pending', 'approved', 'rejected', 'flagged'].includes(value);
      })
      .withMessage('Invalid status'),
    query('search').optional().trim(),
  ],
  handleValidationErrors,
  adminController.getAllPosts
);
router.put(
  '/posts/:id/approve',
  [body('notes').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  adminController.approvePost
);
router.put(
  '/posts/:id/reject',
  [body('reason').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  adminController.rejectPost
);
router.delete('/posts/:id', adminController.deletePost);
router.post(
  '/posts/bulk-approve',
  [
    body('postIds').isArray().withMessage('postIds must be an array'),
    body('postIds.*').isMongoId().withMessage('Each postId must be a valid MongoDB ID'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  adminController.bulkApprovePosts
);
router.post(
  '/posts/bulk-reject',
  [
    body('postIds').isArray().withMessage('postIds must be an array'),
    body('postIds.*').isMongoId().withMessage('Each postId must be a valid MongoDB ID'),
    body('reason').optional().trim().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  adminController.bulkRejectPosts
);

// Comments
router.get(
  '/comments',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['pending', 'approved', 'rejected'].includes(value);
      })
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  adminController.getAllComments
);
router.put('/comments/:id/approve', adminController.approveComment);
router.put('/comments/:id/reject', adminController.rejectComment);
router.delete('/comments/:id', adminController.deleteComment);
router.post(
  '/comments/bulk-approve',
  [
    body('commentIds').isArray().withMessage('commentIds must be an array'),
    body('commentIds.*').isMongoId().withMessage('Each commentId must be a valid MongoDB ID'),
  ],
  handleValidationErrors,
  adminController.bulkApproveComments
);
router.post(
  '/comments/bulk-reject',
  [
    body('commentIds').isArray().withMessage('commentIds must be an array'),
    body('commentIds.*').isMongoId().withMessage('Each commentId must be a valid MongoDB ID'),
  ],
  handleValidationErrors,
  adminController.bulkRejectComments
);

// Chat
router.get(
  '/chat/rooms',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  adminController.getAllChatRooms
);
router.post(
  '/chat/rooms',
  [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be between 3 and 100 characters'),
    body('slug').optional().trim().isLength({ min: 3, max: 50 }).matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase alphanumeric with hyphens'),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('topicDescription').optional().trim().isLength({ max: 2000 }),
    body('isPrivate').optional().isBoolean(),
  ],
  handleValidationErrors,
  adminController.createChatRoom
);
router.delete('/chat/rooms/:id', adminController.deleteChatRoom);
router.get(
  '/chat/messages',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('roomId').optional({ checkFalsy: true }).isMongoId(),
    query('flagged')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['true', 'false'].includes(value);
      })
      .withMessage('Invalid flagged value'),
  ],
  handleValidationErrors,
  adminController.getAllChatMessages
);
router.get(
  '/chat/flagged',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  adminController.getFlaggedMessages
);
router.delete('/chat/messages/:id', adminController.deleteChatMessage);

// Appointments
router.get(
  '/appointments',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'].includes(value);
      })
      .withMessage('Invalid status'),
  ],
  handleValidationErrors,
  adminController.getAllAppointments
);

// Children
router.get(
  '/children',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  adminController.getAllChildren
);

// Therapists/Doctors
router.get(
  '/therapists',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('isVerified')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['true', 'false'].includes(value);
      })
      .withMessage('Invalid isVerified value'),
    query('role')
      .optional({ checkFalsy: true })
      .custom((value) => {
        if (!value || value === '') return true;
        return ['therapist', 'doctor'].includes(value);
      })
      .withMessage('Invalid role'),
    query('search').optional().trim(),
  ],
  handleValidationErrors,
  adminController.getAllTherapistProfiles
);
router.get('/therapists/:id', adminController.getTherapistProfileById);
router.put(
  '/therapists/:id/verify',
  [body('verificationNotes').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  adminController.verifyTherapistProfile
);
router.put(
  '/therapists/:id/unverify',
  [body('reason').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  adminController.unverifyTherapistProfile
);

// Export
router.get(
  '/export/users',
  [
    query('role').optional().isIn(['parent', 'teacher', 'therapist', 'doctor', 'admin']),
    query('blocked').optional().isIn(['true', 'false']),
  ],
  handleValidationErrors,
  adminController.exportUsers
);
router.get(
  '/export/posts',
  [
    query('status').optional().isIn(['draft', 'pending', 'approved', 'rejected', 'flagged']),
  ],
  handleValidationErrors,
  adminController.exportPosts
);

// Subscriptions
router.get(
  '/subscriptions',
  [
    query('status').optional().isIn(['active', 'expired', 'cancelled', 'pending']),
    query('userType').optional().isIn(['doctor', 'parent']),
    query('plan').optional().isIn(['monthly', 'quarterly', 'yearly']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('skip').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  adminSubscriptionController.getAllSubscriptions
);
router.get('/subscriptions/stats', adminSubscriptionController.getSubscriptionStats);
router.get('/subscriptions/user/:userId', adminSubscriptionController.getUserSubscriptions);
router.post(
  '/subscriptions/assign',
  [
    body('userId').isMongoId().withMessage('Valid userId is required'),
    body('plan').isIn(['monthly', 'quarterly', 'yearly']).withMessage('Valid plan is required'),
    body('userType').isIn(['doctor', 'parent']).withMessage('Valid userType is required'),
    body('startDate').optional().isISO8601().withMessage('Valid startDate is required'),
    body('endDate').optional().isISO8601().withMessage('Valid endDate is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount is required'),
  ],
  handleValidationErrors,
  adminSubscriptionController.assignSubscription
);
router.put(
  '/subscriptions/:id',
  [
    body('plan').optional().isIn(['monthly', 'quarterly', 'yearly']),
    body('status').optional().isIn(['active', 'expired', 'cancelled', 'pending']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('amount').optional().isFloat({ min: 0 }),
    body('autoRenew').optional().isBoolean(),
  ],
  handleValidationErrors,
  adminSubscriptionController.updateSubscription
);
router.post(
  '/subscriptions/:id/cancel',
  [body('reason').optional().trim().isLength({ max: 500 })],
  handleValidationErrors,
  adminSubscriptionController.cancelUserSubscription
);

// Plan Visibility
router.get('/subscriptions/plan-visibility', adminSubscriptionController.getPlanVisibility);
router.post(
  '/subscriptions/plan-visibility',
  [
    body('userType').isIn(['doctor', 'parent', 'all']).withMessage('Valid userType is required'),
    body('plan').isIn(['monthly', 'quarterly', 'yearly']).withMessage('Valid plan is required'),
    body('isVisible').optional().isBoolean(),
    body('isDefault').optional().isBoolean(),
    body('customPrice').optional().isFloat({ min: 0 }),
    body('customDiscount').optional().isFloat({ min: 0, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('order').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  adminSubscriptionController.createPlanVisibility
);
router.put(
  '/subscriptions/plan-visibility/:id',
  [
    body('isVisible').optional().isBoolean(),
    body('isDefault').optional().isBoolean(),
    body('customPrice').optional().isFloat({ min: 0 }),
    body('customDiscount').optional().isFloat({ min: 0, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('order').optional().isInt({ min: 0 }),
  ],
  handleValidationErrors,
  adminSubscriptionController.updatePlanVisibility
);
router.post('/subscriptions/plan-visibility/init', adminSubscriptionController.initPlanVisibility);

export default router;

