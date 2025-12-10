import mongoose from 'mongoose';

const childDiagnosisSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Diagnosis Information
    diagnosisType: {
      type: String,
      enum: [
        'autism',
        'adhd',
        'down-syndrome',
        'dyslexia',
        'dysgraphia',
        'dyscalculia',
        'speech-delay',
        'apraxia',
        'stuttering',
        'cerebral-palsy',
        'vision-impairment',
        'hearing-loss',
        'anxiety',
        'depression',
        'sensory-processing-disorder',
        'learning-disability',
        'developmental-delay',
        'other',
      ],
      required: true,
    },
    diagnosisName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Diagnosis name cannot exceed 200 characters'],
    },
    // Diagnosis Details
    diagnosedDate: {
      type: Date,
      required: true,
    },
    diagnosedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    diagnosedByOrganization: {
      type: String,
      trim: true,
    },
    // Severity
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'not-specified'],
    },
    // Description
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // Assessment Scores
    assessmentScores: [
      {
        assessmentType: String, // MCHAT, Vanderbilt, etc.
        score: Number,
        maxScore: Number,
        percentile: Number,
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    // Supporting Documents
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      maxlength: [1000, 'Resolution notes cannot exceed 1000 characters'],
    },
    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
childDiagnosisSchema.index({ childId: 1, isActive: 1, diagnosedDate: -1 });
childDiagnosisSchema.index({ diagnosedBy: 1 });

const ChildDiagnosis = mongoose.model('ChildDiagnosis', childDiagnosisSchema);

export default ChildDiagnosis;

