import express from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public route for checking availability (before protect middleware)
router.get('/check-availability', appointmentController.checkAvailability);

// All other routes require authentication
router.use(protect);

// Protected routes - specific routes before parameter routes
router.post('/', appointmentController.createAppointment);
router.get('/', appointmentController.getAppointments);
router.put('/:id/status', appointmentController.updateAppointmentStatus); // Specific route before :id
router.put('/:id', appointmentController.updateAppointment); // Update appointment (date/time)
router.get('/:id', appointmentController.getAppointmentById);

export default router;

