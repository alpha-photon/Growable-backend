import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    // Onboarding Information
    onboardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    onboardedByRole: {
      type: String,
      enum: ['doctor', 'therapist'],
      required: true,
    },
    // User Account Reference (for login)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Patient Type
    patientType: {
      type: String,
      enum: ['specialable-child', 'regular-patient'],
      required: true,
      default: 'regular-patient',
    },
    // Basic Information
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: true,
    },
    profilePhoto: {
      type: String, // URL to uploaded photo
    },
    // Contact Information
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    // Address
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    // Medical Information
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    },
    allergies: [
      {
        allergen: String,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        notes: String,
      },
    ],
    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      alternatePhone: String,
    },
    // Guardian/Parent Information (for specialable children)
    guardianName: {
      type: String,
      trim: true,
    },
    guardianRelation: {
      type: String,
      enum: ['parent', 'guardian', 'caregiver', 'other'],
    },
    guardianPhone: {
      type: String,
      trim: true,
    },
    guardianEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Unified Assignments Array (NEW - Better approach)
    assignments: [
      {
        professionalId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
          index: true,
        },
        role: {
          type: String,
          enum: ['doctor', 'therapist'],
          required: true,
        },
        assignmentType: {
          type: String,
          enum: ['onboarded', 'primary', 'assigned'],
          required: true,
          default: 'assigned',
        },
        specialization: String,
        assignedAt: {
          type: Date,
          default: Date.now,
        },
        assignedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        removedAt: Date,
        removedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        removalReason: {
          type: String,
          enum: ['removed', 'inactive', 'other'],
          default: 'removed',
        },
      },
    ],
    // Legacy fields (kept for backward compatibility during migration)
    primaryDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    primaryTherapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedTherapists: [
      {
        therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        specialization: String,
        assignedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    assignedDoctors: [
      {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        specialization: String,
        assignedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    // Access Control - Who can view this patient's profile
    sharedWith: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['doctor', 'therapist', 'teacher'] },
        grantedAt: { type: Date, default: Date.now },
        grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // Link to Child profile if this is a specialable child
    linkedChildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      index: true,
    },
    // Medical Conditions/Diagnosis Summary
    primaryCondition: {
      type: String,
      trim: true,
    },
    conditions: [
      {
        condition: String,
        diagnosedDate: Date,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        notes: String,
      },
    ],
    // Therapy Information
    therapyType: {
      type: String,
      enum: [
        'speech-therapy',
        'occupational-therapy',
        'physical-therapy',
        'behavioral-therapy',
        'cognitive-therapy',
        'counseling',
        'psychotherapy',
        'other',
      ],
    },
    therapyGoals: [
      {
        goal: String,
        targetDate: Date,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'achieved', 'cancelled'],
          default: 'pending',
        },
      },
    ],
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes
    generalNotes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    // Insurance Information (optional)
    insurance: {
      provider: String,
      policyNumber: String,
      groupNumber: String,
      expiryDate: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
patientSchema.index({ onboardedBy: 1, isActive: 1 });
patientSchema.index({ primaryDoctor: 1, isActive: 1 }); // Legacy
patientSchema.index({ primaryTherapist: 1, isActive: 1 }); // Legacy
patientSchema.index({ 'assignedTherapists.therapistId': 1 }); // Legacy
patientSchema.index({ 'assignedDoctors.doctorId': 1 }); // Legacy
// New unified assignments indexes
patientSchema.index({ 'assignments.professionalId': 1, 'assignments.isActive': 1 });
patientSchema.index({ 'assignments.professionalId': 1, 'assignments.role': 1, 'assignments.isActive': 1 });
patientSchema.index({ 'assignments.assignmentType': 1, 'assignments.role': 1 });
patientSchema.index({ 'sharedWith.userId': 1 });
patientSchema.index({ patientType: 1, isActive: 1 });
patientSchema.index({ linkedChildId: 1 });
patientSchema.index({ userId: 1 });

// Virtual for age
patientSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Helper Methods for Unified Assignments
patientSchema.methods.getPrimaryDoctor = function() {
  const assignment = this.assignments?.find(
    a => a.role === 'doctor' && a.assignmentType === 'primary' && a.isActive
  );
  return assignment?.professionalId || this.primaryDoctor; // Fallback to legacy
};

patientSchema.methods.getPrimaryTherapist = function() {
  const assignment = this.assignments?.find(
    a => a.role === 'therapist' && a.assignmentType === 'primary' && a.isActive
  );
  return assignment?.professionalId || this.primaryTherapist; // Fallback to legacy
};

patientSchema.methods.getAssignedProfessionals = function(role) {
  if (this.assignments && this.assignments.length > 0) {
    return this.assignments.filter(
      a => a.role === role && a.isActive && a.assignmentType === 'assigned'
    );
  }
  // Fallback to legacy
  if (role === 'doctor') {
    return this.assignedDoctors?.filter(d => d.isActive) || [];
  } else if (role === 'therapist') {
    return this.assignedTherapists?.filter(t => t.isActive) || [];
  }
  return [];
};

patientSchema.methods.hasAccess = function(professionalId, role) {
  if (this.assignments && this.assignments.length > 0) {
    return this.assignments.some(
      a => a.professionalId?.toString() === professionalId.toString() &&
           a.role === role &&
           a.isActive
    );
  }
  // Fallback to legacy
  if (role === 'doctor') {
    return this.primaryDoctor?.toString() === professionalId.toString() ||
           this.assignedDoctors?.some(d => d.doctorId?.toString() === professionalId.toString() && d.isActive) ||
           this.onboardedBy?.toString() === professionalId.toString();
  } else if (role === 'therapist') {
    return this.primaryTherapist?.toString() === professionalId.toString() ||
           this.assignedTherapists?.some(t => t.therapistId?.toString() === professionalId.toString() && t.isActive) ||
           (this.onboardedBy?.toString() === professionalId.toString() && this.onboardedByRole === 'therapist');
  }
  return false;
};

patientSchema.methods.addAssignment = function(professionalId, role, assignmentType, specialization = '', assignedBy = null) {
  if (!this.assignments) {
    this.assignments = [];
  }
  
  // Check if already exists
  const existing = this.assignments.find(
    a => a.professionalId?.toString() === professionalId.toString() && a.role === role
  );
  
  if (existing) {
    // Reactivate if inactive
    if (!existing.isActive) {
      existing.isActive = true;
      existing.assignmentType = assignmentType;
      existing.assignedAt = new Date();
      existing.assignedBy = assignedBy;
      existing.removedAt = undefined;
      existing.removedBy = undefined;
      if (specialization) existing.specialization = specialization;
    } else {
      // Update assignment type if upgrading (onboarded > primary > assigned)
      const priority = { onboarded: 3, primary: 2, assigned: 1 };
      if (priority[assignmentType] > priority[existing.assignmentType]) {
        existing.assignmentType = assignmentType;
        if (specialization) existing.specialization = specialization;
      }
    }
  } else {
    this.assignments.push({
      professionalId,
      role,
      assignmentType,
      specialization,
      assignedAt: new Date(),
      assignedBy,
      isActive: true,
    });
  }
};

patientSchema.methods.removeAssignment = function(professionalId, role, removedBy = null, removalReason = 'removed') {
  if (!this.assignments || this.assignments.length === 0) {
    return false;
  }
  
  const assignment = this.assignments.find(
    a => a.professionalId?.toString() === professionalId.toString() && a.role === role && a.isActive
  );
  
  if (assignment) {
    assignment.isActive = false;
    assignment.removedAt = new Date();
    assignment.removedBy = removedBy;
    assignment.removalReason = removalReason;
    return true;
  }
  
  return false;
};

patientSchema.methods.setPrimary = function(professionalId, role) {
  if (!this.assignments) {
    this.assignments = [];
  }
  
  // Remove existing primary for this role
  this.assignments.forEach(a => {
    if (a.role === role && a.assignmentType === 'primary') {
      a.assignmentType = 'assigned';
    }
  });
  
  // Set new primary
  const assignment = this.assignments.find(
    a => a.professionalId?.toString() === professionalId.toString() && a.role === role
  );
  
  if (assignment) {
    assignment.assignmentType = 'primary';
    assignment.isActive = true;
  } else {
    // Add if doesn't exist
    this.addAssignment(professionalId, role, 'primary');
  }
};

patientSchema.methods.removePrimary = function(role) {
  if (!this.assignments) {
    return false;
  }
  
  const assignment = this.assignments.find(
    a => a.role === role && a.assignmentType === 'primary' && a.isActive
  );
  
  if (assignment) {
    assignment.assignmentType = 'assigned';
    return true;
  }
  
  return false;
};

// Validation: Ensure only one primary per role
patientSchema.pre('save', function(next) {
  if (this.assignments && this.assignments.length > 0) {
    const primaryDoctors = this.assignments.filter(
      a => a.role === 'doctor' && a.assignmentType === 'primary' && a.isActive
    );
    if (primaryDoctors.length > 1) {
      return next(new Error('Cannot have multiple primary doctors'));
    }
    
    const primaryTherapists = this.assignments.filter(
      a => a.role === 'therapist' && a.assignmentType === 'primary' && a.isActive
    );
    if (primaryTherapists.length > 1) {
      return next(new Error('Cannot have multiple primary therapists'));
    }
  }
  next();
});

// Ensure virtuals are included in JSON
patientSchema.set('toJSON', { virtuals: true });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;

