import * as childService from './child.service.js';

/**
 * Unified Profile Dashboard Service
 * Handles both child and patient dashboards with consistent structure
 */
/**
 * Unified Profile Dashboard Service
 * Handles child dashboards with consistent structure
 * (Patient support removed - children only platform)
 */
export const getUnifiedProfileDashboard = async (profileId, profileType, userId, userRole) => {
  // Only support children (patients removed)
  if (profileType === 'patient') {
    throw new Error('Patient profiles are no longer supported. Please use child profiles.');
  }
  
  // Get child dashboard
  const dashboardData = await childService.getChildDashboard(profileId, userId, userRole);
  
  // Normalize child dashboard to unified structure
  const child = dashboardData.child;
  
  return {
    profile: {
      _id: child._id,
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      profilePhoto: child.profilePhoto,
      bloodGroup: child.bloodGroup,
      allergies: child.allergies || [],
      emergencyContact: child.emergencyContact,
      age: child.age,
      // Child specific fields
      parentId: child.parentId,
      primaryDoctor: child.primaryDoctor,
      primaryTherapist: child.primaryTherapist,
      assignedTherapists: child.assignedTherapists || [],
      assignedDoctors: child.assignedDoctors || [],
      sharedWith: child.sharedWith || [],
      // Common fields
      isActive: child.isActive,
      generalNotes: child.generalNotes,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    },
    stats: {
      totalGoals: dashboardData.stats.totalGoals || 0,
      activeGoals: dashboardData.stats.activeGoals || 0,
      completedGoals: dashboardData.stats.completedGoals || 0,
      totalBehaviorLogs: dashboardData.stats.totalBehaviorLogs || 0,
      recentBehaviorLogs: dashboardData.stats.recentBehaviorLogs || 0,
      totalAssessments: dashboardData.stats.totalAssessments || 0,
      totalSessionNotes: dashboardData.stats.totalSessionNotes || 0,
      pendingWorksheets: dashboardData.stats.pendingWorksheets || 0,
      totalFiles: dashboardData.stats.totalFiles || 0,
      pendingRecommendations: dashboardData.stats.pendingRecommendations || 0,
      pendingSuggestions: dashboardData.stats.pendingSuggestions || 0,
      totalAppointments: dashboardData.appointments?.length || 0,
      upcomingAppointments: dashboardData.appointments?.filter((apt) => 
        new Date(apt.appointmentDate) >= new Date()
      ).length || 0,
    },
    diagnoses: dashboardData.diagnoses || [],
    goals: dashboardData.goals || [],
    behaviorLogs: dashboardData.behaviorLogs || [],
    assessments: dashboardData.assessments || [],
    medicalHistory: dashboardData.medicalHistory || [],
    worksheets: dashboardData.worksheets || [],
    files: dashboardData.files || [],
    doctorRecommendations: dashboardData.doctorRecommendations || [],
    therapistSuggestions: dashboardData.therapistSuggestions || [],
    sessionNotes: dashboardData.sessionNotes || [],
    appointments: dashboardData.appointments || [],
    profileType: 'child',
  };
};

export default {
  getUnifiedProfileDashboard,
};
