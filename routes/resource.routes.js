import express from 'express';
import * as resourceController from '../controllers/resource.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/', resourceController.getResources);
router.get('/:id', resourceController.getResourceById);
router.post('/:id/download', resourceController.trackDownload);

// Protected routes (Therapist/Doctor only)
router.post('/', protect, authorize('therapist', 'doctor'), resourceController.createResource);
router.put('/:id', protect, authorize('therapist', 'doctor'), resourceController.updateResource);
router.delete('/:id', protect, authorize('therapist', 'doctor'), resourceController.deleteResource);

export default router;

