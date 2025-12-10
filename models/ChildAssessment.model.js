import mongoose from 'mongoose';

const childAssessmentSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Assessment Type
    assessmentType: {
      type: String,
      enum: ['mchat', 'vanderbilt', 'custom'],
      required: true,
      index: true,
    },
    assessmentName: {
      type: String,
      required: true,
      trim: true,
    },
    // Conducted By
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conductedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Assessment Date
    assessmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // MCHAT Specific Fields
    mchat: {
      totalScore: Number,
      criticalScore: Number,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
      answers: [
        {
          questionNumber: Number,
          question: String,
          answer: String, // yes, no, not-applicable
          score: Number,
        },
      ],
      followUpRequired: Boolean,
      followUpDate: Date,
    },
    // Vanderbilt Specific Fields
    vanderbilt: {
      category: {
        type: String,
        enum: ['adhd-inattentive', 'adhd-hyperactive', 'adhd-combined', 'oppositional-defiant', 'conduct', 'anxiety', 'depression'],
      },
      inattentiveScore: Number,
      hyperactiveScore: Number,
      oppositionalDefiantScore: Number,
      conductScore: Number,
      anxietyScore: Number,
      depressionScore: Number,
      totalScore: Number,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
      },
      answers: [
        {
          questionNumber: Number,
          category: String,
          question: String,
          answer: String, // never, occasionally, often, very-often
          score: Number,
        },
      ],
    },
    // Custom Assessment Fields
    custom: {
      scores: [
        {
          category: String,
          score: Number,
          maxScore: Number,
          percentage: Number,
        },
      ],
      totalScore: Number,
      maxTotalScore: Number,
      overallPercentage: Number,
    },
    // General Assessment Data
    assessmentData: {
      type: mongoose.Schema.Types.Mixed, // Flexible structure for different assessments
    },
    // Results
    overallScore: {
      type: Number,
    },
    maxPossibleScore: {
      type: Number,
    },
    percentageScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
    // Interpretation
    interpretation: {
      type: String,
      maxlength: [2000, 'Interpretation cannot exceed 2000 characters'],
    },
    recommendations: {
      type: String,
      maxlength: [2000, 'Recommendations cannot exceed 2000 characters'],
    },
    // Follow-up
    requiresFollowUp: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    followUpNotes: {
      type: String,
      maxlength: [1000, 'Follow-up notes cannot exceed 1000 characters'],
    },
    // Documents
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
childAssessmentSchema.index({ childId: 1, assessmentDate: -1 });
childAssessmentSchema.index({ childId: 1, assessmentType: 1, assessmentDate: -1 });
childAssessmentSchema.index({ conductedBy: 1 });

const ChildAssessment = mongoose.model('ChildAssessment', childAssessmentSchema);

export default ChildAssessment;

