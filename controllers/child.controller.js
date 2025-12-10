import * as childService from '../services/child.service.js';
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

/**
 * Get Child Master Dashboard
 */
export const getChildDashboard = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const dashboardData = await childService.getChildDashboard(childId, userId, userRole);

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Child Profile
 */
export const createChild = async (req, res, next) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can create child profiles',
      });
    }

    const child = await childService.createChild(req.body, req.user._id);

    res.status(201).json({
      success: true,
      data: child,
      message: 'Child profile created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Child by ID
 */
export const getChild = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const child = await childService.getChildById(childId, userId, userRole);

    res.json({
      success: true,
      data: child,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Child Profile
 */
export const updateChild = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const child = await childService.updateChild(childId, req.body, userId, userRole);

    res.json({
      success: true,
      data: child,
      message: 'Child profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Children for Current User
 */
export const getMyChildren = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let children;
    if (userRole === 'parent') {
      children = await childService.getChildrenByParent(userId);
    } else if (['doctor', 'therapist'].includes(userRole)) {
      children = await childService.getChildrenByProfessional(userId, userRole);
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Share Child with Professional
 */
export const shareChild = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { professionalId, professionalRole } = req.body;
    const grantedBy = req.user._id;

    // Only parent can share child
    const child = await Child.findById(childId);
    if (child.parentId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only parent can share child profile',
      });
    }

    const updatedChild = await childService.shareChildWithProfessional(
      childId,
      professionalId,
      professionalRole,
      grantedBy
    );

    res.json({
      success: true,
      data: updatedChild,
      message: 'Child profile shared successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for ChildDiagnosis
 */
export const createDiagnosis = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const diagnosis = await ChildDiagnosis.create({
      ...req.body,
      childId,
      diagnosedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDiagnoses = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const diagnoses = await ChildDiagnosis.find({ childId })
      .populate('diagnosedBy', 'name')
      .sort({ diagnosedDate: -1 });

    res.json({
      success: true,
      data: diagnoses,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDiagnosis = async (req, res, next) => {
  try {
    const { childId, diagnosisId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const diagnosis = await ChildDiagnosis.findOneAndUpdate(
      { _id: diagnosisId, childId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found',
      });
    }

    res.json({
      success: true,
      data: diagnosis,
      message: 'Diagnosis updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDiagnosis = async (req, res, next) => {
  try {
    const { childId, diagnosisId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const diagnosis = await ChildDiagnosis.findOneAndDelete({ _id: diagnosisId, childId });

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found',
      });
    }

    res.json({
      success: true,
      message: 'Diagnosis deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for TherapyGoals
 */
export const createGoal = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const goal = await TherapyGoal.create({
      ...req.body,
      childId,
      assignedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: goal,
      message: 'Therapy goal created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const goals = await TherapyGoal.find({ childId })
      .populate('assignedBy', 'name')
      .populate('assignedTo.professionalId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const { childId, goalId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const goal = await TherapyGoal.findOneAndUpdate(
      { _id: goalId, childId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Goal not found',
      });
    }

    res.json({
      success: true,
      data: goal,
      message: 'Goal updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for BehaviorLogs
 */
export const createBehaviorLog = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const behaviorLog = await BehaviorLog.create({
      ...req.body,
      childId,
      loggedBy: req.user._id,
      loggedByRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      data: behaviorLog,
      message: 'Behavior log created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getBehaviorLogs = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { startDate, endDate, behaviorType, limit = 50 } = req.query;
    let query = { childId };

    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) query.occurredAt.$lte = new Date(endDate);
    }

    if (behaviorType) {
      query.behaviorType = behaviorType;
    }

    const logs = await BehaviorLog.find(query)
      .populate('loggedBy', 'name')
      .sort({ occurredAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for Assessments
 */
export const createAssessment = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const assessment = await ChildAssessment.create({
      ...req.body,
      childId,
      conductedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: assessment,
      message: 'Assessment created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getAssessments = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { assessmentType } = req.query;
    let query = { childId, isActive: true };

    if (assessmentType) {
      query.assessmentType = assessmentType;
    }

    const assessments = await ChildAssessment.find(query)
      .populate('conductedBy', 'name')
      .sort({ assessmentDate: -1 });

    res.json({
      success: true,
      data: assessments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for MedicalHistory
 */
export const createMedicalHistory = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const medicalHistory = await MedicalHistory.create({
      ...req.body,
      childId,
      enteredBy: req.user._id,
      enteredByRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      data: medicalHistory,
      message: 'Medical history entry added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicalHistory = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { entryType, startDate, endDate } = req.query;
    let query = { childId };

    if (entryType) {
      query.entryType = entryType;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const history = await MedicalHistory.find(query)
      .populate('providerId', 'name')
      .populate('enteredBy', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for Worksheets
 */
export const createWorksheet = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const worksheet = await Worksheet.create({
      ...req.body,
      childId,
      assignedBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: worksheet,
      message: 'Worksheet assigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getWorksheets = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { status } = req.query;
    let query = { childId };

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const worksheets = await Worksheet.find(query)
      .populate('assignedBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: worksheets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for ChildFiles
 */
export const uploadFile = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    // File should be uploaded via multer/cloudinary middleware
    // req.file or req.files should contain file information

    const fileData = {
      childId,
      fileName: req.body.fileName || req.file?.originalname,
      fileUrl: req.body.fileUrl || req.file?.url,
      fileType: req.body.fileType,
      mimeType: req.body.mimeType || req.file?.mimetype,
      fileSize: req.body.fileSize || req.file?.size,
      category: req.body.category,
      description: req.body.description,
      uploadedBy: req.user._id,
      uploadedByRole: req.user.role,
      relatedAppointmentId: req.body.relatedAppointmentId,
      relatedSessionNoteId: req.body.relatedSessionNoteId,
      relatedGoalId: req.body.relatedGoalId,
      relatedAssessmentId: req.body.relatedAssessmentId,
      relatedBehaviorLogId: req.body.relatedBehaviorLogId,
    };

    const file = await ChildFile.create(fileData);

    res.status(201).json({
      success: true,
      data: file,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getFiles = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { fileType, category } = req.query;
    let query = { childId };

    if (fileType) {
      query.fileType = fileType;
    }

    if (category) {
      query.category = category;
    }

    const files = await ChildFile.find(query)
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for DoctorRecommendations
 */
export const createDoctorRecommendation = async (req, res, next) => {
  try {
    const { childId } = req.params;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can create recommendations',
      });
    }

    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const recommendation = await DoctorRecommendation.create({
      ...req.body,
      childId,
      doctorId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: recommendation,
      message: 'Recommendation added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorRecommendations = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { status } = req.query;
    let query = { childId };

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const recommendations = await DoctorRecommendation.find(query)
      .populate('doctorId', 'name')
      .sort({ recommendedDate: -1 });

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CRUD Operations for TherapistSuggestions
 */
export const createTherapistSuggestion = async (req, res, next) => {
  try {
    const { childId } = req.params;

    if (!['therapist', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only therapists can create suggestions',
      });
    }

    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const suggestion = await TherapistSuggestion.create({
      ...req.body,
      childId,
      therapistId: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: suggestion,
      message: 'Suggestion added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getTherapistSuggestions = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await childService.checkChildAccess(childId, req.user._id, req.user.role);

    const { status } = req.query;
    let query = { childId };

    if (status) {
      query.status = { $in: status.split(',') };
    }

    const suggestions = await TherapistSuggestion.find(query)
      .populate('therapistId', 'name')
      .sort({ suggestedDate: -1 });

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign Primary Doctor/Therapist
 */
export const assignPrimaryProfessional = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { professionalId, role } = req.body; // role: 'doctor' or 'therapist'
    const userId = req.user._id;

    // Only parent can assign primary professional
    const child = await Child.findById(childId);
    if (child.parentId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only parent can assign primary professional',
      });
    }

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedChild = await childService.assignPrimaryProfessional(
      childId,
      professionalId,
      role
    );

    res.json({
      success: true,
      data: updatedChild,
      message: `Primary ${role} assigned successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Professional to Assigned List
 */
export const addAssignedProfessional = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { professionalId, role, specialization } = req.body; // role: 'doctor' or 'therapist'
    const userId = req.user._id;

    // Only parent can add assigned professional
    const child = await Child.findById(childId);
    if (child.parentId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only parent can assign professionals',
      });
    }

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedChild = await childService.addAssignedProfessional(
      childId,
      professionalId,
      role,
      specialization
    );

    res.json({
      success: true,
      data: updatedChild,
      message: `${role} added to assigned list successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Professional from Assigned List
 */
export const removeAssignedProfessional = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { professionalId, role } = req.body;
    const userId = req.user._id;

    // Only parent can remove assigned professional
    const child = await Child.findById(childId);
    if (child.parentId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only parent can remove assigned professionals',
      });
    }

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedChild = await childService.removeAssignedProfessional(
      childId,
      professionalId,
      role
    );

    res.json({
      success: true,
      data: updatedChild,
      message: `${role} removed from assigned list successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove Primary Professional
 */
export const removePrimaryProfessional = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { role } = req.body; // role: 'doctor' or 'therapist'
    const userId = req.user._id;

    // Only parent can remove primary professional
    const child = await Child.findById(childId);
    if (child.parentId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only parent can remove primary professional',
      });
    }

    if (!['doctor', 'therapist'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be doctor or therapist',
      });
    }

    const updatedChild = await childService.removePrimaryProfessional(childId, role);

    res.json({
      success: true,
      data: updatedChild,
      message: `Primary ${role} removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

