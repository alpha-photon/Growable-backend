import Patient from '../models/Patient.model.js';
import Child from '../models/Child.model.js';
import User from '../models/User.model.js';
import Appointment from '../models/Appointment.model.js';

/**
 * Check if user has access to view patient profile
 */
export const checkPatientAccess = async (patientId, userId, userRole) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Patient can access their own record via userId
  if (userRole === 'patient' && patient.userId && patient.userId.toString() === userId.toString()) {
    return true;
  }

  // Admin has access
  if (userRole === 'admin') {
    return true;
  }

  // Use unified assignments structure with fallback to legacy
  if (userRole === 'doctor' || userRole === 'therapist') {
    // Check unified assignments first
    if (patient.assignments && patient.assignments.length > 0) {
      const hasAccess = patient.hasAccess(userId, userRole);
      if (hasAccess) {
        return true;
      }
    }
    
    // Fallback to legacy structure
    // Onboarding doctor/therapist always has access
    if (patient.onboardedBy?.toString() === userId.toString()) {
      return true;
    }

    // Check if user is assigned doctor or therapist
    if (userRole === 'doctor') {
      const isAssigned = patient.assignedDoctors?.some(
        (doc) => doc.doctorId?.toString() === userId.toString() && doc.isActive
      );
      if (isAssigned) return true;
      if (patient.primaryDoctor?.toString() === userId.toString()) return true;
    }

    if (userRole === 'therapist') {
      const isAssigned = patient.assignedTherapists?.some(
        (therapist) => therapist.therapistId?.toString() === userId.toString() && therapist.isActive
      );
      if (isAssigned) return true;
      if (patient.primaryTherapist?.toString() === userId.toString()) return true;
    }
  }

  // Check sharedWith list
  const isShared = patient.sharedWith?.some((share) => share.userId?.toString() === userId.toString());
  if (isShared) return true;

  return false;
};

/**
 * Create Patient Profile
 */
export const createPatient = async (patientData, onboardedBy, onboardedByRole) => {
  // Verify onboardedBy user exists and has correct role
  const user = await User.findById(onboardedBy);
  if (!user) {
    throw new Error('User not found');
  }
  if (!['doctor', 'therapist'].includes(user.role)) {
    throw new Error('Only doctors and therapists can onboard patients');
  }
  if (user.role !== onboardedByRole) {
    throw new Error('User role mismatch');
  }

  // If linking to a child, verify child exists and user has access
  if (patientData.linkedChildId) {
    const child = await Child.findById(patientData.linkedChildId);
    if (!child) {
      throw new Error('Linked child not found');
    }
    // Check if user has access to the child
    // For doctors/therapists onboarding, they should have access if they're assigned or primary
    const isPrimaryDoctor = child.primaryDoctor?.toString() === onboardedBy.toString();
    const isPrimaryTherapist = child.primaryTherapist?.toString() === onboardedBy.toString();
    const isAssignedDoctor = child.assignedDoctors?.some(
      (doc) => doc.doctorId.toString() === onboardedBy.toString() && doc.isActive
    );
    const isAssignedTherapist = child.assignedTherapists?.some(
      (therapist) => therapist.therapistId.toString() === onboardedBy.toString() && therapist.isActive
    );
    const isShared = child.sharedWith?.some(
      (share) => share.userId.toString() === onboardedBy.toString()
    );
    
    if (!isPrimaryDoctor && !isPrimaryTherapist && !isAssignedDoctor && !isAssignedTherapist && !isShared) {
      throw new Error('Access denied to linked child. You must be assigned to this child first.');
    }
  }

  // Set primary doctor/therapist to onboarding user if not specified
  if (!patientData.primaryDoctor && onboardedByRole === 'doctor') {
    patientData.primaryDoctor = onboardedBy;
  }
  if (!patientData.primaryTherapist && onboardedByRole === 'therapist') {
    patientData.primaryTherapist = onboardedBy;
  }

  // Add onboarding user to assigned list if not already primary
  if (onboardedByRole === 'doctor' && patientData.primaryDoctor?.toString() !== onboardedBy.toString()) {
    if (!patientData.assignedDoctors) {
      patientData.assignedDoctors = [];
    }
    patientData.assignedDoctors.push({
      doctorId: onboardedBy,
      specialization: patientData.specialization || '',
      assignedAt: new Date(),
      isActive: true,
    });
  }

  if (onboardedByRole === 'therapist' && patientData.primaryTherapist?.toString() !== onboardedBy.toString()) {
    if (!patientData.assignedTherapists) {
      patientData.assignedTherapists = [];
    }
    patientData.assignedTherapists.push({
      therapistId: onboardedBy,
      specialization: patientData.specialization || '',
      assignedAt: new Date(),
      isActive: true,
    });
  }

  // Create User account for patient (email is required)
  let patientUserId = null;
  if (!patientData.email) {
    throw new Error('Email is required to create patient login account');
  }

  try {
    // Extract firstname from patient name (first word)
    let firstname = patientData.name.split(' ')[0].toLowerCase();
    
    // Ensure password is at least 6 characters (User model requirement)
    // If firstname is too short, pad it or use full name
    if (firstname.length < 6) {
      // Use first 6 characters of full name (lowercase, no spaces)
      firstname = patientData.name.toLowerCase().replace(/\s+/g, '').substring(0, 6);
      // If still too short, pad with numbers
      if (firstname.length < 6) {
        firstname = firstname.padEnd(6, '123');
      }
    }
    
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: patientData.email.toLowerCase() });
    
    if (existingUser) {
      // If user exists, use that user ID
      patientUserId = existingUser._id;
    } else {
        // Create new user account
        const newUser = await User.create({
          name: patientData.name,
          email: patientData.email.toLowerCase(),
          password: firstname, // Password is firstname (or padded version)
          role: 'patient', // Patients have patient role
          displayName: patientData.name,
          verified: false,
        });
      patientUserId = newUser._id;
    }
  } catch (error) {
    // If user creation fails, throw error
    throw new Error(`Failed to create user account for patient: ${error.message}`);
  }

  const patient = await Patient.create({
    ...patientData,
    onboardedBy,
    onboardedByRole,
    userId: patientUserId,
  });

  // Add onboardedBy to unified assignments array
  if (onboardedBy && onboardedByRole) {
    patient.addAssignment(onboardedBy, onboardedByRole, 'onboarded');
    await patient.save();
  }

  return patient.populate([
    { path: 'assignments.professionalId', select: 'name email role' },
    { path: 'onboardedBy', select: 'name email role' },
    { path: 'userId', select: 'name email role' },
    { path: 'primaryDoctor', select: 'name email' },
    { path: 'primaryTherapist', select: 'name email' },
    { path: 'assignedTherapists.therapistId', select: 'name email' },
    { path: 'assignedDoctors.doctorId', select: 'name email' },
    { path: 'linkedChildId', select: 'name dateOfBirth' },
  ]);
};

/**
 * Update Patient Profile
 */
export const updatePatient = async (patientId, updateData, userId, userRole) => {
  const hasAccess = await checkPatientAccess(patientId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Check if patient exists and is active
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Prevent editing inactive patients (only viewing allowed, except admin)
  if (!patient.isActive && userRole !== 'admin') {
    throw new Error('Cannot edit inactive patient. Patient is archived. Only viewing is allowed.');
  }

  const updatedPatient = await Patient.findByIdAndUpdate(patientId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email')
    .populate('linkedChildId', 'name dateOfBirth');

  return updatedPatient;
};

/**
 * Get Patient by ID
 */
export const getPatientById = async (patientId, userId, userRole) => {
  const hasAccess = await checkPatientAccess(patientId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const patient = await Patient.findById(patientId)
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email')
    .populate('linkedChildId', 'name dateOfBirth');

  return patient;
};

/**
 * Get Patient by User ID (for patient role to find their own record)
 */
export const getPatientByUserId = async (userId) => {
  const patient = await Patient.findOne({ userId, isActive: true })
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('linkedChildId', 'name dateOfBirth');

  return patient;
};

/**
 * Get All Patients for a Doctor/Therapist
 * Includes patients from:
 * 1. Direct onboarding (onboardedBy)
 * 2. Primary assignment (primaryDoctor/primaryTherapist)
 * 3. Assigned list (assignedDoctors/assignedTherapists)
 * 4. Appointments (via patientRecordId or patientId)
 */
export const getPatientsByProfessional = async (professionalId, role) => {
  // Import Appointment model
  const Appointment = (await import('../models/Appointment.model.js')).default;
  
  let query = {};

  // Get status filter from query params (optional - defaults to showing all)
  const statusFilter = undefined; // Will be passed as parameter if needed
  
  // Use unified assignments structure (with fallback to legacy)
  if (role === 'doctor') {
    query = {
      $or: [
        // New unified assignments structure
        { 'assignments.professionalId': professionalId, 'assignments.role': 'doctor', 'assignments.isActive': true },
        // Legacy structure (for backward compatibility during migration)
        { onboardedBy: professionalId, onboardedByRole: 'doctor' },
        { primaryDoctor: professionalId },
        { 'assignedDoctors.doctorId': professionalId, 'assignedDoctors.isActive': true },
      ],
      // Exclude patients who have explicitly removed this doctor
      $nor: [
        { 'assignments': { $elemMatch: { professionalId: professionalId, role: 'doctor', isActive: false } } },
        { 'assignedDoctors': { $elemMatch: { doctorId: professionalId, isActive: false } } } // Legacy
      ],
    };
  } else if (role === 'therapist') {
    query = {
      $or: [
        // New unified assignments structure
        { 'assignments.professionalId': professionalId, 'assignments.role': 'therapist', 'assignments.isActive': true },
        // Legacy structure (for backward compatibility during migration)
        { onboardedBy: professionalId, onboardedByRole: 'therapist' },
        { primaryTherapist: professionalId },
        { 'assignedTherapists.therapistId': professionalId, 'assignedTherapists.isActive': true },
      ],
      // Exclude patients who have explicitly removed this therapist
      $nor: [
        { 'assignments': { $elemMatch: { professionalId: professionalId, role: 'therapist', isActive: false } } },
        { 'assignedTherapists': { $elemMatch: { therapistId: professionalId, isActive: false } } } // Legacy
      ],
    };
  } else if (role === 'patient') {
    // Patient can only see their own record (active only)
    query = {
      userId: professionalId,
      isActive: true,
    };
  }

  // Get patients from direct assignments
  const allDirectPatients = await Patient.find(query)
    .populate('assignments.professionalId', 'name email role') // New unified structure
    .populate('onboardedBy', 'name email role') // Legacy
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email') // Legacy
    .populate('primaryTherapist', 'name email') // Legacy
    .populate('assignedTherapists.therapistId', 'name email') // Legacy
    .populate('assignedDoctors.doctorId', 'name email') // Legacy
    .populate('linkedChildId', 'name dateOfBirth')
    .sort({ createdAt: -1 })
    .lean();

  // Filter out patients who have explicitly removed this professional
  // Use unified assignments structure with fallback to legacy
  const directPatients = allDirectPatients.filter((patient) => {
    if (role === 'doctor') {
      // Check unified assignments first
      if (patient.assignments && patient.assignments.length > 0) {
        const assignment = patient.assignments.find(
          a => a.professionalId?.toString() === professionalId.toString() && a.role === 'doctor'
        );
        if (assignment && assignment.isActive === false) {
          return false; // Explicitly removed
        }
      }
      // Fallback to legacy structure
      const doctorAssignment = patient.assignedDoctors?.find(
        (doc) => doc.doctorId?.toString() === professionalId.toString()
      );
      if (doctorAssignment && doctorAssignment.isActive === false) {
        return false; // Explicitly removed
      }
      return true;
    } else if (role === 'therapist') {
      // Check unified assignments first
      if (patient.assignments && patient.assignments.length > 0) {
        const assignment = patient.assignments.find(
          a => a.professionalId?.toString() === professionalId.toString() && a.role === 'therapist'
        );
        if (assignment && assignment.isActive === false) {
          return false; // Explicitly removed
        }
      }
      // Fallback to legacy structure
      const therapistAssignment = patient.assignedTherapists?.find(
        (therapist) => therapist.therapistId?.toString() === professionalId.toString()
      );
      if (therapistAssignment && therapistAssignment.isActive === false) {
        return false; // Explicitly removed
      }
      return true;
    }
    return true;
  });

  // Get patient IDs from appointments (including child appointments)
  const appointments = await Appointment.find({
    therapistId: professionalId,
    status: { $ne: 'cancelled' }, // Exclude cancelled appointments
  })
    .select('patientRecordId patientId childId')
    .lean();

  // Collect unique patient IDs from appointments
  const appointmentPatientRecordIds = new Set();
  const appointmentPatientUserIds = new Set();
  const appointmentChildIds = new Set();

  appointments.forEach((apt) => {
    if (apt.patientRecordId) {
      appointmentPatientRecordIds.add(apt.patientRecordId.toString());
    }
    if (apt.patientId) {
      appointmentPatientUserIds.add(apt.patientId.toString());
    }
    if (apt.childId) {
      appointmentChildIds.add(apt.childId.toString());
    }
  });

  // Get Patient records linked to children from appointments
  // Include both active and inactive patients
  let childLinkedPatientIds = new Set();
  if (appointmentChildIds.size > 0) {
    const Child = (await import('../models/Child.model.js')).default;
    const childLinkedPatients = await Patient.find({
      linkedChildId: { $in: Array.from(appointmentChildIds) },
      // Include both active and inactive patients
    })
      .select('_id')
      .lean();
    
    childLinkedPatients.forEach((p) => {
      childLinkedPatientIds.add(p._id.toString());
      appointmentPatientRecordIds.add(p._id.toString()); // Add to main set
    });
  }

  // Get patients from appointments (via patientRecordId)
  // But exclude patients who have explicitly removed this professional
  // Include both active and inactive patients
  let appointmentPatients = [];
  if (appointmentPatientRecordIds.size > 0) {
    const allAppointmentPatients = await Patient.find({
      _id: { $in: Array.from(appointmentPatientRecordIds) },
      // Include both active and inactive patients
    })
      .populate('assignments.professionalId', 'name email role') // New unified structure
      .populate('onboardedBy', 'name email role') // Legacy
      .populate('userId', 'name email role')
      .populate('primaryDoctor', 'name email') // Legacy
      .populate('primaryTherapist', 'name email') // Legacy
      .populate('assignedTherapists.therapistId', 'name email') // Legacy
      .populate('assignedDoctors.doctorId', 'name email') // Legacy
      .populate('linkedChildId', 'name dateOfBirth')
      .lean();

    // Filter out patients who have explicitly removed this professional
    // Use unified assignments structure with fallback to legacy
    appointmentPatients = allAppointmentPatients.filter((patient) => {
      if (role === 'doctor') {
        // Check unified assignments first
        if (patient.assignments && patient.assignments.length > 0) {
          const assignment = patient.assignments.find(
            a => a.professionalId?.toString() === professionalId.toString() && a.role === 'doctor'
          );
          if (assignment && assignment.isActive === false) {
            return false; // Explicitly removed
          }
        }
        // Fallback to legacy structure
        const doctorAssignment = patient.assignedDoctors?.find(
          (doc) => doc.doctorId?.toString() === professionalId.toString()
        );
        if (doctorAssignment && doctorAssignment.isActive === false) {
          return false; // Explicitly removed
        }
        return true;
      } else if (role === 'therapist') {
        // Check unified assignments first
        if (patient.assignments && patient.assignments.length > 0) {
          const assignment = patient.assignments.find(
            a => a.professionalId?.toString() === professionalId.toString() && a.role === 'therapist'
          );
          if (assignment && assignment.isActive === false) {
            return false; // Explicitly removed
          }
        }
        // Fallback to legacy structure
        const therapistAssignment = patient.assignedTherapists?.find(
          (therapist) => therapist.therapistId?.toString() === professionalId.toString()
        );
        if (therapistAssignment && therapistAssignment.isActive === false) {
          return false; // Explicitly removed
        }
        return true;
      }
      return true;
    });
  }

  // Get patients from appointments (via patientId/userId) - patients who booked but don't have Patient record yet
  // But exclude patients who have explicitly removed this professional
  // Include both active and inactive patients
  let userBasedPatients = [];
  if (appointmentPatientUserIds.size > 0) {
    const allUserBasedPatients = await Patient.find({
      userId: { $in: Array.from(appointmentPatientUserIds) },
      // Include both active and inactive patients
    })
      .populate('assignments.professionalId', 'name email role') // New unified structure
      .populate('onboardedBy', 'name email role') // Legacy
      .populate('userId', 'name email role')
      .populate('primaryDoctor', 'name email') // Legacy
      .populate('primaryTherapist', 'name email') // Legacy
      .populate('assignedTherapists.therapistId', 'name email') // Legacy
      .populate('assignedDoctors.doctorId', 'name email') // Legacy
      .populate('linkedChildId', 'name dateOfBirth')
      .lean();

    // Filter out patients who have explicitly removed this professional
    // Use unified assignments structure with fallback to legacy
    userBasedPatients = allUserBasedPatients.filter((patient) => {
      if (role === 'doctor') {
        // Check unified assignments first
        if (patient.assignments && patient.assignments.length > 0) {
          const assignment = patient.assignments.find(
            a => a.professionalId?.toString() === professionalId.toString() && a.role === 'doctor'
          );
          if (assignment && assignment.isActive === false) {
            return false; // Explicitly removed
          }
        }
        // Fallback to legacy structure
        const doctorAssignment = patient.assignedDoctors?.find(
          (doc) => doc.doctorId?.toString() === professionalId.toString()
        );
        if (doctorAssignment && doctorAssignment.isActive === false) {
          return false; // Explicitly removed
        }
        return true;
      } else if (role === 'therapist') {
        // Check unified assignments first
        if (patient.assignments && patient.assignments.length > 0) {
          const assignment = patient.assignments.find(
            a => a.professionalId?.toString() === professionalId.toString() && a.role === 'therapist'
          );
          if (assignment && assignment.isActive === false) {
            return false; // Explicitly removed
          }
        }
        // Fallback to legacy structure
        const therapistAssignment = patient.assignedTherapists?.find(
          (therapist) => therapist.therapistId?.toString() === professionalId.toString()
        );
        if (therapistAssignment && therapistAssignment.isActive === false) {
          return false; // Explicitly removed
        }
        return true;
      }
      return true;
    });
  }

  // Combine all patients and remove duplicates
  const allPatients = [...directPatients, ...appointmentPatients, ...userBasedPatients];
  const uniquePatientsMap = new Map();

  allPatients.forEach((patient) => {
    const patientId = patient._id.toString();
    if (!uniquePatientsMap.has(patientId)) {
      uniquePatientsMap.set(patientId, patient);
    }
  });

  return Array.from(uniquePatientsMap.values());
};

/**
 * Share Patient with Professional
 */
export const sharePatientWithProfessional = async (patientId, professionalId, professionalRole, grantedBy) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Verify professional exists and has correct role
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }
  if (professional.role !== professionalRole) {
    throw new Error(`User is not a ${professionalRole}`);
  }

  // Check if already shared
  const alreadyShared = patient.sharedWith.some(
    (share) => share.userId.toString() === professionalId.toString()
  );

  if (alreadyShared) {
    throw new Error('Patient is already shared with this professional');
  }

  patient.sharedWith.push({
    userId: professionalId,
    role: professionalRole,
    grantedBy,
  });

  await patient.save();
  return patient;
};

/**
 * Assign Primary Doctor or Therapist
 */
export const assignPrimaryProfessional = async (patientId, professionalId, role) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Verify professional exists and has correct role
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }
  if (professional.role !== role) {
    throw new Error(`User is not a ${role}`);
  }

  // Use unified assignments structure
  patient.setPrimary(professionalId, role);

  // Also update legacy fields for backward compatibility
  if (role === 'doctor') {
    patient.primaryDoctor = professionalId;
  } else if (role === 'therapist') {
    patient.primaryTherapist = professionalId;
  }

  await patient.save();

  const updatedPatient = await Patient.findById(patientId)
    .populate('assignments.professionalId', 'name email role')
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  return updatedPatient;
};

/**
 * Remove Primary Professional
 */
export const removePrimaryProfessional = async (patientId, role) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  if (role !== 'doctor' && role !== 'therapist') {
    throw new Error('Invalid role. Must be doctor or therapist');
  }

  // Use unified assignments structure
  patient.removePrimary(role);

  // Also update legacy fields for backward compatibility
  if (role === 'doctor') {
    patient.primaryDoctor = undefined;
  } else if (role === 'therapist') {
    patient.primaryTherapist = undefined;
  }

  await patient.save();

  const updatedPatient = await Patient.findById(patientId)
    .populate('assignments.professionalId', 'name email role')
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  return updatedPatient;
};

/**
 * Add Professional to Assigned List
 */
export const addAssignedProfessional = async (patientId, professionalId, role, specialization = '', assignedBy = null) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Verify professional exists and has correct role
  const professional = await User.findById(professionalId);
  if (!professional) {
    throw new Error('Professional not found');
  }
  if (professional.role !== role) {
    throw new Error(`User is not a ${role}`);
  }

  // Check if already assigned (using unified structure)
  if (patient.assignments && patient.assignments.length > 0) {
    const existing = patient.assignments.find(
      a => a.professionalId?.toString() === professionalId.toString() && 
           a.role === role && 
           a.isActive
    );
    if (existing) {
      throw new Error(`${role === 'doctor' ? 'Doctor' : 'Therapist'} is already assigned to this patient`);
    }
  }

  // Use unified assignments structure
  patient.addAssignment(professionalId, role, 'assigned', specialization, assignedBy);

  // Also update legacy fields for backward compatibility
  if (role === 'doctor') {
    const alreadyAssigned = patient.assignedDoctors?.some(
      (doc) => doc.doctorId?.toString() === professionalId.toString() && doc.isActive
    );
    if (!alreadyAssigned) {
      if (!patient.assignedDoctors) {
        patient.assignedDoctors = [];
      }
      patient.assignedDoctors.push({
        doctorId: professionalId,
        specialization,
        assignedAt: new Date(),
        isActive: true,
      });
    }
  } else if (role === 'therapist') {
    const alreadyAssigned = patient.assignedTherapists?.some(
      (therapist) => therapist.therapistId?.toString() === professionalId.toString() && therapist.isActive
    );
    if (!alreadyAssigned) {
      if (!patient.assignedTherapists) {
        patient.assignedTherapists = [];
      }
      patient.assignedTherapists.push({
        therapistId: professionalId,
        specialization,
        assignedAt: new Date(),
        isActive: true,
      });
    }
  }

  await patient.save();

  const updatedPatient = await Patient.findById(patientId)
    .populate('assignments.professionalId', 'name email role')
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  return updatedPatient;
};

/**
 * Remove Professional from Assigned List
 */
export const removeAssignedProfessional = async (patientId, professionalId, role, removedBy = null, removalReason = 'removed') => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  if (role !== 'doctor' && role !== 'therapist') {
    throw new Error('Invalid role. Must be doctor or therapist');
  }

  // Use unified assignments structure
  const removed = patient.removeAssignment(professionalId, role, removedBy, removalReason);
  
  if (!removed) {
    // Check legacy structure
    if (role === 'doctor') {
      const doctorIndex = patient.assignedDoctors?.findIndex(
        (doc) => doc.doctorId?.toString() === professionalId.toString() && doc.isActive
      );
      if (doctorIndex === -1) {
        throw new Error('Doctor is not assigned to this patient');
      }
      patient.assignedDoctors[doctorIndex].isActive = false;
    } else if (role === 'therapist') {
      const therapistIndex = patient.assignedTherapists?.findIndex(
        (therapist) => therapist.therapistId?.toString() === professionalId.toString() && therapist.isActive
      );
      if (therapistIndex === -1) {
        throw new Error('Therapist is not assigned to this patient');
      }
      patient.assignedTherapists[therapistIndex].isActive = false;
    } else {
      throw new Error('Professional is not assigned to this patient');
    }
  } else {
    // Also update legacy fields for backward compatibility
    if (role === 'doctor') {
      const doctorIndex = patient.assignedDoctors?.findIndex(
        (doc) => doc.doctorId?.toString() === professionalId.toString() && doc.isActive
      );
      if (doctorIndex !== -1) {
        patient.assignedDoctors[doctorIndex].isActive = false;
      }
    } else if (role === 'therapist') {
      const therapistIndex = patient.assignedTherapists?.findIndex(
        (therapist) => therapist.therapistId?.toString() === professionalId.toString() && therapist.isActive
      );
      if (therapistIndex !== -1) {
        patient.assignedTherapists[therapistIndex].isActive = false;
      }
    }
  }

  await patient.save();

  const updatedPatient = await Patient.findById(patientId)
    .populate('assignments.professionalId', 'name email role')
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email');

  return updatedPatient;
};

/**
 * Archive Patient
 */
export const archivePatient = async (patientId, archivedBy) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new Error('Patient not found');
  }

  patient.isActive = false;
  patient.archivedAt = new Date();
  patient.archivedBy = archivedBy;

  await patient.save();
  return patient;
};

/**
 * Get Patient Dashboard Data
 */
export const getPatientDashboard = async (patientId, userId, userRole) => {
  const hasAccess = await checkPatientAccess(patientId, userId, userRole);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const patient = await Patient.findById(patientId)
    .populate('onboardedBy', 'name email role')
    .populate('userId', 'name email role')
    .populate('primaryDoctor', 'name email')
    .populate('primaryTherapist', 'name email')
    .populate('assignedTherapists.therapistId', 'name email')
    .populate('assignedDoctors.doctorId', 'name email')
    .populate('linkedChildId', 'name dateOfBirth');

  if (!patient) {
    throw new Error('Patient not found');
  }

  // Import models for queries
  const SessionNote = (await import('../models/SessionNote.model.js')).default;
  const ChildDiagnosis = (await import('../models/ChildDiagnosis.model.js')).default;
  const BehaviorLog = (await import('../models/BehaviorLog.model.js')).default;
  const ChildAssessment = (await import('../models/ChildAssessment.model.js')).default;
  const MedicalHistory = (await import('../models/MedicalHistory.model.js')).default;
  const ChildFile = (await import('../models/ChildFile.model.js')).default;

  // Build query conditions for patient or linked child
  const patientOrChildQuery = patient.linkedChildId 
    ? { $or: [{ patientRecordId: patientId }, { childId: patient.linkedChildId }] }
    : { patientRecordId: patientId };

  // Get all related data in parallel
  const [
    diagnoses,
    goals,
    behaviorLogs,
    assessments,
    medicalHistory,
    files,
    sessionNotes,
    appointments,
  ] = await Promise.all([
    // Diagnoses - use patient conditions, or get from linked child
    patient.linkedChildId
      ? ChildDiagnosis.find({ childId: patient.linkedChildId, isActive: true })
          .populate('diagnosedBy', 'name')
          .sort({ diagnosedDate: -1 })
          .lean()
      : Promise.resolve(
          (patient.conditions || []).map((cond, idx) => ({
            _id: `patient-condition-${idx}`,
            condition: cond.condition,
            diagnosedDate: cond.diagnosedDate || patient.createdAt,
            diagnosedBy: { name: patient.onboardedBy?.name || 'Unknown' },
            severity: cond.severity,
            notes: cond.notes,
            isActive: true,
          }))
        ),

    // Goals - use patient therapyGoals
    Promise.resolve(
      (patient.therapyGoals || []).map((goal, idx) => ({
        _id: `patient-goal-${idx}`,
        goalTitle: goal.goal,
        goalDescription: goal.goal,
        status: goal.status,
        targetDate: goal.targetDate,
        createdAt: patient.createdAt,
        assignedBy: { name: patient.onboardedBy?.name || 'Unknown' },
      }))
    ),

    // Behavior Logs - get from linked child if available
    patient.linkedChildId
      ? BehaviorLog.find({
          childId: patient.linkedChildId,
          occurredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .populate('loggedBy', 'name')
          .sort({ occurredAt: -1 })
          .limit(50)
          .lean()
      : Promise.resolve([]),

    // Assessments - get from linked child if available
    patient.linkedChildId
      ? ChildAssessment.find({ childId: patient.linkedChildId, isActive: true })
          .populate('conductedBy', 'name')
          .sort({ assessmentDate: -1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),

    // Medical History - get from linked child if available
    patient.linkedChildId
      ? MedicalHistory.find({
          childId: patient.linkedChildId,
          date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        })
          .populate('providerId', 'name')
          .populate('enteredBy', 'name')
          .sort({ date: -1 })
          .limit(20)
          .lean()
      : Promise.resolve([]),

    // Files - get from linked child if available
    patient.linkedChildId
      ? ChildFile.find({
          childId: patient.linkedChildId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .populate('uploadedBy', 'name')
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      : Promise.resolve([]),

    // Session Notes - from appointments
    SessionNote.find(patientOrChildQuery)
      .populate('therapistId', 'name')
      .populate('appointmentId')
      .sort({ sessionDate: -1 })
      .limit(20)
      .lean(),

    // Upcoming Appointments
    Appointment.find({
      ...patientOrChildQuery,
      status: { $in: ['pending', 'confirmed'] },
      appointmentDate: { $gte: new Date() },
    })
      .populate('therapistId', 'name email')
      .populate('patientId', 'name email')
      .populate('patientRecordId', 'name')
      .populate('childId', 'name')
      .sort({ appointmentDate: 1 })
      .limit(10)
      .lean(),
  ]);

  // Calculate statistics
  const stats = {
    totalGoals: goals.length,
    activeGoals: goals.filter((g) => g.status === 'in-progress').length,
    completedGoals: goals.filter((g) => g.status === 'achieved').length,
    totalBehaviorLogs: patient.linkedChildId 
      ? await BehaviorLog.countDocuments({ childId: patient.linkedChildId })
      : 0,
    recentBehaviorLogs: behaviorLogs.length,
    totalAssessments: patient.linkedChildId
      ? await ChildAssessment.countDocuments({ childId: patient.linkedChildId, isActive: true })
      : 0,
    totalSessionNotes: await SessionNote.countDocuments(patientOrChildQuery),
    pendingWorksheets: 0, // Worksheets are child-specific
    totalFiles: patient.linkedChildId
      ? await ChildFile.countDocuments({ childId: patient.linkedChildId })
      : 0,
    pendingRecommendations: 0,
    pendingSuggestions: 0,
    totalAppointments: await Appointment.countDocuments(patientOrChildQuery),
    upcomingAppointments: appointments.length,
  };

  return {
    patient,
    diagnoses,
    goals,
    behaviorLogs,
    assessments,
    medicalHistory,
    worksheets: [], // Worksheets are child-specific
    files,
    doctorRecommendations: [], // Recommendations are child-specific
    therapistSuggestions: [], // Suggestions are child-specific
    sessionNotes,
    appointments,
    stats,
  };
};

export default {
  createPatient,
  updatePatient,
  getPatientById,
  getPatientsByProfessional,
  sharePatientWithProfessional,
  checkPatientAccess,
  assignPrimaryProfessional,
  removePrimaryProfessional,
  addAssignedProfessional,
  removeAssignedProfessional,
  archivePatient,
  getPatientDashboard,
};

