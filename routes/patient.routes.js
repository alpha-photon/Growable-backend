import express from 'express';
import { body } from 'express-validator';
import * as patientController from '../controllers/patient.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { handleValidationErrors } from '../middleware/validation.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * Patient Routes
 */
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female', 'other', 'prefer-not-to-say']).withMessage('Valid gender is required'),
    body('patientType').isIn(['specialable-child', 'regular-patient']).withMessage('Valid patient type is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 characters'),
  ],
  handleValidationErrors,
  patientController.createPatient
); // Create patient (doctor/therapist only)
router.get('/my-patients', patientController.getMyPatients); // Get my patients
router.get('/my-profile', patientController.getMyPatientProfile); // Get my patient profile (for patient role)
router.get('/dashboard/:patientId', patientController.getPatientDashboard); // Get dashboard
router.get('/:patientId', patientController.getPatient); // Get patient by ID
router.put('/:patientId', patientController.updatePatient); // Update patient
router.delete('/:patientId', patientController.archivePatient); // Archive patient
router.post('/:patientId/share', patientController.sharePatient); // Share patient with professional

/**
 * Assignment Routes
 */
router.post('/:patientId/assign-primary', patientController.assignPrimaryProfessional); // Assign primary doctor/therapist
router.delete('/:patientId/assign-primary', patientController.removePrimaryProfessional); // Remove primary doctor/therapist
router.post('/:patientId/assign', patientController.addAssignedProfessional); // Add to assigned list
router.delete('/:patientId/assign', patientController.removeAssignedProfessional); // Remove from assigned list

export default router;

