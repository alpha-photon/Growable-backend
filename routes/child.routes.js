import express from 'express';
import * as childController from '../controllers/child.controller.js';
import * as routineController from '../controllers/routine.controller.js';
import * as medicationController from '../controllers/medication.controller.js';
import * as therapyReminderController from '../controllers/therapy-reminder.controller.js';
import * as progressReportController from '../controllers/progress-report.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * Child Profile Routes
 */
router.post('/', childController.createChild); // Create child (parent only)
router.get('/my-children', childController.getMyChildren); // Get my children
router.get('/dashboard/:childId', childController.getChildDashboard); // Get dashboard
router.get('/:childId', childController.getChild); // Get child by ID
router.put('/:childId', childController.updateChild); // Update child
router.post('/:childId/share', childController.shareChild); // Share child with professional

/**
 * Assignment Routes
 */
router.post('/:childId/assign-primary', childController.assignPrimaryProfessional); // Assign primary doctor/therapist
router.post('/:childId/assign', childController.addAssignedProfessional); // Add to assigned list
router.delete('/:childId/assign', childController.removeAssignedProfessional); // Remove from assigned list
router.delete('/:childId/assign-primary', childController.removePrimaryProfessional); // Remove primary professional

/**
 * Diagnosis Routes
 */
router.post('/:childId/diagnoses', childController.createDiagnosis);
router.get('/:childId/diagnoses', childController.getDiagnoses);
router.put('/:childId/diagnoses/:diagnosisId', childController.updateDiagnosis);
router.delete('/:childId/diagnoses/:diagnosisId', childController.deleteDiagnosis);

/**
 * Therapy Goals Routes
 */
router.post('/:childId/goals', childController.createGoal);
router.get('/:childId/goals', childController.getGoals);
router.put('/:childId/goals/:goalId', childController.updateGoal);

/**
 * Behavior Logs Routes
 */
router.post('/:childId/behavior-logs', childController.createBehaviorLog);
router.get('/:childId/behavior-logs', childController.getBehaviorLogs);

/**
 * Assessments Routes
 */
router.post('/:childId/assessments', childController.createAssessment);
router.get('/:childId/assessments', childController.getAssessments);

/**
 * Medical History Routes
 */
router.post('/:childId/medical-history', childController.createMedicalHistory);
router.get('/:childId/medical-history', childController.getMedicalHistory);

/**
 * Worksheets Routes
 */
router.post('/:childId/worksheets', childController.createWorksheet);
router.get('/:childId/worksheets', childController.getWorksheets);

/**
 * Files Routes
 */
router.post('/:childId/files', childController.uploadFile);
router.get('/:childId/files', childController.getFiles);

/**
 * Doctor Recommendations Routes
 */
router.post('/:childId/recommendations', childController.createDoctorRecommendation);
router.get('/:childId/recommendations', childController.getDoctorRecommendations);

/**
 * Therapist Suggestions Routes
 */
router.post('/:childId/suggestions', childController.createTherapistSuggestion);
router.get('/:childId/suggestions', childController.getTherapistSuggestions);

/**
 * Daily Routine Routes
 */
router.post('/:childId/routines', routineController.createRoutine);
router.get('/:childId/routines', routineController.getRoutines);
router.put('/:childId/routines/:routineId', routineController.updateRoutine);
router.delete('/:childId/routines/:routineId', routineController.deleteRoutine);
router.post('/:childId/routines/:routineId/complete-activity', routineController.markActivityComplete);

/**
 * Medication Reminder Routes
 */
router.post('/:childId/medications', medicationController.createMedication);
router.get('/:childId/medications', medicationController.getMedications);
router.put('/:childId/medications/:medicationId', medicationController.updateMedication);
router.delete('/:childId/medications/:medicationId', medicationController.deleteMedication);
router.post('/:childId/medications/:medicationId/log-dose', medicationController.logMedicationDose);

/**
 * Therapy Reminder Routes
 */
router.post('/:childId/therapy-reminders', therapyReminderController.createTherapyReminder);
router.get('/:childId/therapy-reminders', therapyReminderController.getTherapyReminders);
router.put('/:childId/therapy-reminders/:therapyId', therapyReminderController.updateTherapyReminder);
router.delete('/:childId/therapy-reminders/:therapyId', therapyReminderController.deleteTherapyReminder);
router.post('/:childId/therapy-reminders/:therapyId/log-session', therapyReminderController.logTherapySession);

/**
 * Progress Report Routes
 */
router.post('/:childId/progress-reports', progressReportController.generateProgressReport);
router.get('/:childId/progress-reports', progressReportController.getProgressReports);
router.get('/:childId/progress-reports/:reportId', progressReportController.getProgressReportById);

export default router;

