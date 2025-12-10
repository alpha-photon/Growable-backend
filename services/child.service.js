import Child from '../models/Child.model.js';
import ChildDiagnosis from '../models/ChildDiagnosis.model.js';
import TherapyGoal from '../models/TherapyGoal.model.js';
import BehaviorLog from '../models/BehaviorLog.model.js';
import ChildAssessment from '../models/ChildAssessment.model.js';
import MedicalHistory from '../models/MedicalHistory.model.js';
import Worksheet from '../models/Worksheet.model.js';
import ChildFile from '../models/ChildFile.model.js';
import DoctorRecommendation from '../models/DoctorRecommendation.model.js';
import TherapistSuggestion from '../models/TherapistSuggestion.model.js';
import SessionNote from '../models/SessionNote.model.js';
import Appointment from '../models/Appointment.model.js';

/**
 * Check if user has access to view child profile
 */
export const checkChildAccess = async (childId, userId, userRole) => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Parent always has access
  if (child.parentId.toString() === userId.toString()) {
    return true;
  }

  // Check if user is assigned doctor or therapist
  if (userRole === 'doctor') {
    const isAssigned = child.assignedDoctors.some(
      (doc) => doc.doctorId.toString() === userId.toString() && doc.isActive
    );
    if (isAssigned) return true;
    if (child.primaryDoctor?.toString() === userId.toString()) return true;
  }

  if (userRole === 'therapist') {
    const isAssigned = child.assignedTherapists.some(
      (therapist) => therapist.therapistId.toString() === userId.toString() && therapist.isActive
    );
    if (isAssigned) return true;
    if (child.primaryTherapist?.toString() === userId.toString()) return true;
  }

  // Check sharedWith list
  const isShared = child.sharedWith.some((share) => share.userId.toString() === userId.toString());
  if (isShared) return true;

  // Admin has access
  if (userRole === 'admin') {
    return true;
  }

  return false;
};

/**
 * Get Child Master Dashboard Data
 */
export const getChildDashboard = async (childId, userId, userRole) => {
  // Check access
  const hasAccess = await checkChildAccess(childId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Get child profile
  const child = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  if (!child) {
    throw new Error('Child not found');
  }

  // Get all related data in parallel
  const [
    diagnoses,
    goals,
    behaviorLogs,
    assessments,
    medicalHistory,
    worksheets,
    files,
    doctorRecommendations,
    therapistSuggestions,
    sessionNotes,
    appointments,
  ] = await Promise.all([
    // Active Diagnoses
    ChildDiagnosis.find({ childId, isActive: true })
      .populate('diagnosedBy', 'name')
      .sort({ diagnosedDate: -1 })
      .lean(),

    // Active Therapy Goals
    TherapyGoal.find({ childId })
      .populate('assignedBy', 'name')
      .populate('assignedTo.professionalId', 'name')
      .sort({ createdAt: -1 })
      .lean(),

    // Recent Behavior Logs (last 30 days)
    BehaviorLog.find({
      childId,
      occurredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('loggedBy', 'name')
      .sort({ occurredAt: -1 })
      .limit(50)
      .lean(),

    // Recent Assessments
    ChildAssessment.find({ childId, isActive: true })
      .populate('conductedBy', 'name')
      .sort({ assessmentDate: -1 })
      .limit(10)
      .lean(),

    // Recent Medical History (last 90 days)
    MedicalHistory.find({
      childId,
      date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    })
      .populate('providerId', 'name')
      .populate('enteredBy', 'name')
      .sort({ date: -1 })
      .limit(20)
      .lean(),

    // Active Worksheets
    Worksheet.find({ childId, status: { $in: ['assigned', 'in-progress'] } })
      .populate('assignedBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 })
      .lean(),

    // Recent Files (last 30 days)
    ChildFile.find({
      childId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

    // Pending/Active Doctor Recommendations
    DoctorRecommendation.find({
      childId,
      status: { $in: ['pending', 'in-progress'] },
    })
      .populate('doctorId', 'name')
      .sort({ recommendedDate: -1 })
      .limit(10)
      .lean(),

    // Pending/Active Therapist Suggestions
    TherapistSuggestion.find({
      childId,
      status: { $in: ['pending', 'in-progress'] },
    })
      .populate('therapistId', 'name')
      .sort({ suggestedDate: -1 })
      .limit(10)
      .lean(),

    // Session Notes Timeline
    SessionNote.find({ childId })
      .populate('therapistId', 'name')
      .populate('appointmentId')
      .sort({ sessionDate: -1 })
      .limit(20)
      .lean(),

    // Upcoming Appointments
    Appointment.find({
      childId,
      status: { $in: ['pending', 'confirmed'] },
      appointmentDate: { $gte: new Date() },
    })
      .populate('therapistId', 'name')
      .populate('patientId', 'name')
      .sort({ appointmentDate: 1 })
      .limit(10)
      .lean(),
  ]);

  // Calculate statistics
  const stats = {
    totalGoals: goals.length,
    activeGoals: goals.filter((g) => g.status === 'in-progress').length,
    completedGoals: goals.filter((g) => g.status === 'achieved').length,
    totalBehaviorLogs: await BehaviorLog.countDocuments({ childId }),
    recentBehaviorLogs: behaviorLogs.length,
    totalAssessments: await ChildAssessment.countDocuments({ childId, isActive: true }),
    totalSessionNotes: await SessionNote.countDocuments({ childId }),
    pendingWorksheets: worksheets.filter((w) => w.status === 'assigned').length,
    totalFiles: await ChildFile.countDocuments({ childId }),
    pendingRecommendations: doctorRecommendations.filter((r) => r.status === 'pending').length,
    pendingSuggestions: therapistSuggestions.filter((s) => s.status === 'pending').length,
  };

  return {
    child,
    diagnoses,
    goals,
    behaviorLogs,
    assessments,
    medicalHistory,
    worksheets,
    files,
    doctorRecommendations,
    therapistSuggestions,
    sessionNotes,
    appointments,
    stats,
  };
};

/**
 * Create Child Profile
 */
export const createChild = async (childData, parentId) => {
  const child = await Child.create({
    ...childData,
    parentId,
  });

  return child.populate('parentId', 'name email');
};

/**
 * Update Child Profile
 */
export const updateChild = async (childId, updateData, userId, userRole) => {
  const hasAccess = await checkChildAccess(childId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const child = await Child.findByIdAndUpdate(childId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email');

  return child;
};

/**
 * Get Child by ID
 */
export const getChildById = async (childId, userId, userRole) => {
  const hasAccess = await checkChildAccess(childId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const child = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  return child;
};

/**
 * Get All Children for a Parent
 */
export const getChildrenByParent = async (parentId) => {
  const children = await Child.find({ parentId, isActive: true })
    .populate('primaryDoctor', 'name')
    .populate('primaryTherapist', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return children;
};

/**
 * Get All Children for a Doctor/Therapist
 */
export const getChildrenByProfessional = async (professionalId, role) => {
  let query = {};
  
  if (role === 'doctor') {
    query = {
      $or: [
        { primaryDoctor: professionalId },
        { 'assignedDoctors.doctorId': professionalId, 'assignedDoctors.isActive': true },
      ],
      isActive: true,
    };
  } else if (role === 'therapist') {
    query = {
      $or: [
        { primaryTherapist: professionalId },
        { 'assignedTherapists.therapistId': professionalId, 'assignedTherapists.isActive': true },
      ],
      isActive: true,
    };
  }

  const children = await Child.find(query)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name')
    .populate('primaryTherapist', 'name')
    .sort({ createdAt: -1 })
    .lean();

  return children;
};

/**
 * Share Child with Professional
 */
export const shareChildWithProfessional = async (childId, professionalId, professionalRole, grantedBy) => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Check if already shared
  const alreadyShared = child.sharedWith.some(
    (share) => share.userId.toString() === professionalId.toString()
  );

  if (alreadyShared) {
    throw new Error('Child is already shared with this professional');
  }

  child.sharedWith.push({
    userId: professionalId,
    role: professionalRole,
    grantedBy,
  });

  await child.save();
  return child;
};

/**
 * Assign Primary Doctor or Therapist
 */
export const assignPrimaryProfessional = async (childId, professionalId, role) => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Verify professional exists and has correct role
  const User = (await import('../models/User.model.js')).default;
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }
  if (professional.role !== role) {
    throw new Error(`User is not a ${role}`);
  }

  if (role === 'doctor') {
    child.primaryDoctor = professionalId;
  } else if (role === 'therapist') {
    child.primaryTherapist = professionalId;
  }

  await child.save();
  
  // Re-fetch the child with populated fields
  const updatedChild = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');
  
  return updatedChild;
};

/**
 * Add Professional to Assigned List
 */
export const addAssignedProfessional = async (childId, professionalId, role, specialization = '') => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Verify professional exists and has correct role
  const User = (await import('../models/User.model.js')).default;
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }
  if (professional.role !== role) {
    throw new Error(`User is not a ${role}`);
  }

  // Check if already assigned
  if (role === 'doctor') {
    const alreadyAssigned = child.assignedDoctors.some(
      (doc) => doc.doctorId.toString() === professionalId.toString() && doc.isActive
    );
    if (alreadyAssigned) {
      throw new Error('Doctor is already assigned to this child');
    }
    child.assignedDoctors.push({
      doctorId: professionalId,
      specialization,
      assignedAt: new Date(),
      isActive: true,
    });
  } else if (role === 'therapist') {
    const alreadyAssigned = child.assignedTherapists.some(
      (therapist) => therapist.therapistId.toString() === professionalId.toString() && therapist.isActive
    );
    if (alreadyAssigned) {
      throw new Error('Therapist is already assigned to this child');
    }
    child.assignedTherapists.push({
      therapistId: professionalId,
      specialization,
      assignedAt: new Date(),
      isActive: true,
    });
  }

  await child.save();
  
  // Re-fetch the child with populated fields
  const updatedChild = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');
  
  return updatedChild;
};

/**
 * Remove Professional from Assigned List
 */
export const removeAssignedProfessional = async (childId, professionalId, role) => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  if (role === 'doctor') {
    const doctorIndex = child.assignedDoctors.findIndex(
      (doc) => doc.doctorId.toString() === professionalId.toString() && doc.isActive
    );
    if (doctorIndex === -1) {
      throw new Error('Doctor is not assigned to this child');
    }
    child.assignedDoctors[doctorIndex].isActive = false;
  } else if (role === 'therapist') {
    const therapistIndex = child.assignedTherapists.findIndex(
      (therapist) => therapist.therapistId.toString() === professionalId.toString() && therapist.isActive
    );
    if (therapistIndex === -1) {
      throw new Error('Therapist is not assigned to this child');
    }
    child.assignedTherapists[therapistIndex].isActive = false;
  }

  await child.save();
  
  // Re-fetch the child with populated fields
  const updatedChild = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');
  
  return updatedChild;
};

/**
 * Remove Primary Professional
 */
export const removePrimaryProfessional = async (childId, role) => {
  const child = await Child.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  if (role === 'doctor') {
    if (!child.primaryDoctor) {
      throw new Error('No primary doctor assigned');
    }
    child.primaryDoctor = null;
  } else if (role === 'therapist') {
    if (!child.primaryTherapist) {
      throw new Error('No primary therapist assigned');
    }
    child.primaryTherapist = null;
  }

  await child.save();
  
  // Re-fetch the child with populated fields
  const updatedChild = await Child.findById(childId)
    .populate('parentId', 'name email')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');
  
  return updatedChild;
};

export default {
  getChildDashboard,
  createChild,
  updateChild,
  getChildById,
  getChildrenByParent,
  getChildrenByProfessional,
  shareChildWithProfessional,
  checkChildAccess,
  assignPrimaryProfessional,
  addAssignedProfessional,
  removeAssignedProfessional,
  removePrimaryProfessional,
};

