import mongoose from 'mongoose';

const therapyGoalSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Goal Information
    goalTitle: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [200, 'Goal title cannot exceed 200 characters'],
    },
    goalDescription: {
      type: String,
      required: [true, 'Goal description is required'],
      maxlength: [1000, 'Goal description cannot exceed 1000 characters'],
    },
    // Goal Category
    category: {
      type: String,
      enum: [
        'communication',
        'social-skills',
        'behavior',
        'motor-skills',
        'cognitive',
        'self-care',
        'academic',
        'emotional-regulation',
        'sensory',
        'other',
      ],
      required: true,
    },
    // Timeline
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    targetDate: {
      type: Date,
      required: true,
    },
    completedDate: {
      type: Date,
    },
    // Status
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'achieved', 'partially-achieved', 'deferred', 'cancelled'],
      default: 'not-started',
      index: true,
    },
    // Progress Tracking
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    milestones: [
      {
        title: String,
        description: String,
        targetDate: Date,
        achievedDate: Date,
        isAchieved: { type: Boolean, default: false },
        achievedAt: Date,
      },
    ],
    // Assigned Professionals
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: [
      {
        professionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['doctor', 'therapist'] },
        assignedAt: { type: Date, default: Date.now },
      },
    ],
    // Measurement
    measurementCriteria: {
      type: String,
      maxlength: [500, 'Measurement criteria cannot exceed 500 characters'],
    },
    baselineData: {
      type: String,
      maxlength: [500, 'Baseline data cannot exceed 500 characters'],
    },
    currentData: {
      type: String,
      maxlength: [500, 'Current data cannot exceed 500 characters'],
    },
    // Notes
    notes: [
      {
        content: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
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
therapyGoalSchema.index({ childId: 1, status: 1, targetDate: 1 });
therapyGoalSchema.index({ assignedBy: 1 });
therapyGoalSchema.index({ 'assignedTo.professionalId': 1 });

const TherapyGoal = mongoose.model('TherapyGoal', therapyGoalSchema);

export default TherapyGoal;

