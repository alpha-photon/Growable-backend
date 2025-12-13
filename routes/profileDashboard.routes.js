import express from 'express';
import * as profileDashboardController from '../controllers/profileDashboard.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug middleware to log ALL requests (before auth to catch 404s)
router.use((req, res, next) => {
  console.log('🔍 ProfileDashboard router - Request received:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    params: req.params,
    query: req.query,
  });
  next();
});

// All routes require authentication
router.use(protect);

// Debug middleware to log authenticated requests
router.use((req, res, next) => {
  console.log('✅ ProfileDashboard router - Authenticated request:', {
    method: req.method,
    path: req.path,
    userId: req.user?._id,
    userRole: req.user?.role,
  });
  next();
});

/**
 * Unified Profile Dashboard Routes
 * @route   GET /api/profile/dashboard/:profileId?type=child|patient
 * @desc    Get unified dashboard for child or patient
 * @access  Private
 */
// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Profile dashboard routes are working' });
});

router.get('/dashboard/:profileId', profileDashboardController.getUnifiedProfileDashboard); // Get dashboard with type query param
router.get('/dashboard/:profileId/auto', profileDashboardController.getUnifiedProfileDashboardAuto); // Auto-detect type

export default router;
