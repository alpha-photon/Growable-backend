import * as patientService from '../services/patient.service.js';
import Patient from '../models/Patient.model.js';

/**
 * Create Patient Profile
 * @route   POST /api/patients
 * @desc    Create a new patient (doctor/therapist only)
 * @access  Private (Doctor/Therapist only)
 */
export const createPatient = async (req, res, next) => {
  try {
    if (!['doctor', 'therapist'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors and therapists can onboard patients',
      });
    }

    const patient = await patientService.createPatient(
      req.body,
      req.user._id,
      req.user.role
    );

    res.status(201).json({
      success: true,
      data: patient,
      message: 'Patient onboarded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Patient by ID
 * @route   GET /api/patients/:patientId
 * @desc    Get patient details
 * @access  Private
 */
export const getPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const patient = await patientService.getPatientById(patientId, userId, userRole);

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Patient Profile
 * @route   PUT /api/patients/:patientId
 * @desc    Update patient profile
 * @access  Private
 */
export const updatePatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const patient = await patientService.updatePatient(patientId, req.body, userId, userRole);

    res.json({
      success: true,
      data: patient,
      message: 'Patient profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Patients for Current User
 * @route   GET /api/patients/my-patients
 * @desc    Get all patients for current doctor/therapist/patient
 * @access  Private
 */
export const getMyPatients = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!['doctor', 'therapist', 'patient'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only doctors, therapists, and patients can view patients',
      });
    }

    const patients = await patientService.getPatientsByProfessional(userId, userRole);

    res.json({
      success: true,
      data: patients,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Patient Profile (for patient role)
 * @route   GET /api/patients/my-profile
 * @desc    Get patient's own profile by userId
 * @access  Private (Patient only)
 */
export const getMyPatientProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    if (userRole !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can access their own profile',
      });
    }

    const patient = await patientService.getPatientByUserId(userId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient profile not found',
      });
    }

    res.json({
      success: true,
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Patient Dashboard
 * @route   GET /api/patients/:patientId/dashboard
 * @desc    Get patient dashboard data
 * @access  Private
 */
export const getPatientDashboard = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const dashboardData = await patientService.getPatientDashboard(patientId, userId, userRole);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Share Patient with Professional
 * @route   POST /api/patients/:patientId/share
 * @desc    Share patient with another professional
 * @access  Private
 */
export const sharePatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { professionalId, professionalRole } = req.body;
    const grantedBy = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, req.user._id, req.user.role);

    const updatedPatient = await patientService.sharePatientWithProfessional(
      patientId,
      professionalId,
      professionalRole,
      grantedBy
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: 'Patient profile shared successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Primary Doctor/Therapist
 * @route   POST /api/patients/:patientId/assign-primary
 * @desc    Assign primary doctor or therapist
 * @access  Private
 */
export const assignPrimaryProfessional = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { professionalId, role } = req.body;
    const userId = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, userId, req.user.role);

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedPatient = await patientService.assignPrimaryProfessional(
      patientId,
      professionalId,
      role
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: `Primary ${role} assigned successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Professional to Assigned List
 * @route   POST /api/patients/:patientId/assign
 * @desc    Add professional to assigned list
 * @access  Private
 */
export const addAssignedProfessional = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { professionalId, role, specialization } = req.body;
    const userId = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, userId, req.user.role);

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedPatient = await patientService.addAssignedProfessional(
      patientId,
      professionalId,
      role,
      specialization
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: `${role} added to assigned list successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Primary Professional
 * @route   DELETE /api/patients/:patientId/assign-primary
 * @desc    Remove primary doctor/therapist
 * @access  Private
 */
export const removePrimaryProfessional = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { role } = req.body;
    const userId = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, userId, req.user.role);

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedPatient = await patientService.removePrimaryProfessional(patientId, role);

    res.json({
      success: true,
      data: updatedPatient,
      message: `Primary ${role} removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Professional from Assigned List
 * @route   DELETE /api/patients/:patientId/assign
 * @desc    Remove professional from assigned list
 * @access  Private
 */
export const removeAssignedProfessional = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { professionalId, role, removalReason } = req.body;
    const userId = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, userId, req.user.role);

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    // Validate removal reason
    const validReason = removalReason && ['removed', 'inactive', 'other'].includes(removalReason) 
      ? removalReason 
      : 'removed';

    const updatedPatient = await patientService.removeAssignedProfessional(
      patientId,
      professionalId,
      role,
      userId,
      validReason
    );

    res.json({
      success: true,
      data: updatedPatient,
      message: `${role} removed from assigned list successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive Patient
 * @route   DELETE /api/patients/:patientId
 * @desc    Archive a patient
 * @access  Private
 */
export const archivePatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const userId = req.user._id;

    // Check access
    await patientService.checkPatientAccess(patientId, userId, req.user.role);

    const patient = await patientService.archivePatient(patientId, userId);

    res.json({
      success: true,
      data: patient,
      message: 'Patient archived successfully',
    });
  } catch (error) {
    next(error);
  }
};

