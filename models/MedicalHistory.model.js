import mongoose from 'mongoose';

const medicalHistorySchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Entry Type
    entryType: {
      type: String,
      enum: ['visit', 'vaccination', 'medication', 'procedure', 'test', 'diagnosis', 'hospitalization', 'other'],
      required: true,
    },
    // Date
    date: {
      type: Date,
      required: true,
      index: true,
    },
    // Healthcare Provider
    providerName: {
      type: String,
      trim: true,
      maxlength: [200, 'Provider name cannot exceed 200 characters'],
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    providerOrganization: {
      type: String,
      trim: true,
    },
    // Details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Medication Specific
    medication: {
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      startDate: Date,
      endDate: Date,
      prescribedBy: String,
      sideEffects: String,
      isActive: { type: Boolean, default: true },
    },
    // Vaccination Specific
    vaccination: {
      vaccineName: String,
      batchNumber: String,
      administeredBy: String,
      nextDueDate: Date,
    },
    // Procedure Specific
    procedure: {
      procedureName: String,
      anesthesiaUsed: Boolean,
      complications: String,
      recoveryNotes: String,
    },
    // Test/Report Specific
    test: {
      testName: String,
      testType: String,
      results: String,
      normalRange: String,
      interpretation: String,
    },
    // Diagnosis Specific
    diagnosis: {
      diagnosisName: String,
      icd10Code: String,
      severity: String,
      notes: String,
    },
    // Hospitalization Specific
    hospitalization: {
      admissionDate: Date,
      dischargeDate: Date,
      reason: String,
      ward: String,
      dischargeSummary: String,
    },
    // Attachments
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Entered By
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    enteredByRole: {
      type: String,
      enum: ['parent', 'doctor', 'therapist', 'admin'],
      required: true,
    },
    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Privacy
    isPrivate: {
      type: Boolean,
      default: false, // Default is visible to all authorized professionals
    },
    privateToRoles: [
      {
        type: String,
        enum: ['doctor', 'therapist'],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
medicalHistorySchema.index({ childId: 1, date: -1 });
medicalHistorySchema.index({ childId: 1, entryType: 1, date: -1 });
medicalHistorySchema.index({ providerId: 1 });
medicalHistorySchema.index({ enteredBy: 1 });

const MedicalHistory = mongoose.model('MedicalHistory', medicalHistorySchema);

export default MedicalHistory;

