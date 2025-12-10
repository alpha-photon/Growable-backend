import mongoose from 'mongoose';

const behaviorLogSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Behavior Details
    behaviorType: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true,
    },
    behaviorCategory: {
      type: String,
      enum: [
        'communication',
        'social-interaction',
        'emotional-regulation',
        'sensory',
        'aggression',
        'self-stimulation',
        'attention',
        'compliance',
        'self-care',
        'academic',
        'other',
      ],
      required: true,
    },
    behaviorDescription: {
      type: String,
      required: [true, 'Behavior description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Timing
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    duration: {
      type: Number, // in minutes
      min: 0,
    },
    // Context
    location: {
      type: String,
      enum: ['home', 'school', 'therapy', 'public', 'other'],
    },
    setting: {
      type: String,
      maxlength: [200, 'Setting cannot exceed 200 characters'],
    },
    // Triggers
    antecedents: {
      type: String, // What happened before
      maxlength: [500, 'Antecedents cannot exceed 500 characters'],
    },
    consequences: {
      type: String, // What happened after
      maxlength: [500, 'Consequences cannot exceed 500 characters'],
    },
    // Intensity
    intensity: {
      type: String,
      enum: ['low', 'moderate', 'high', 'extreme'],
    },
    // Frequency (if recurring)
    frequency: {
      type: String,
      enum: ['one-time', 'daily', 'weekly', 'monthly', 'occasional'],
      default: 'one-time',
    },
    // Logged By
    loggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    loggedByRole: {
      type: String,
      enum: ['parent', 'teacher', 'therapist', 'doctor'],
      required: true,
    },
    // Response/Intervention
    interventionUsed: {
      type: String,
      maxlength: [500, 'Intervention cannot exceed 500 characters'],
    },
    interventionEffectiveness: {
      type: String,
      enum: ['very-effective', 'effective', 'somewhat-effective', 'not-effective', 'not-tried'],
    },
    // Related Entities
    relatedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    relatedGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapyGoal',
    },
    // Media
    attachments: [
      {
        name: String,
        url: String,
        type: String, // image, video, audio
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Notes
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
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
behaviorLogSchema.index({ childId: 1, occurredAt: -1 });
behaviorLogSchema.index({ childId: 1, behaviorType: 1, occurredAt: -1 });
behaviorLogSchema.index({ loggedBy: 1, occurredAt: -1 });
behaviorLogSchema.index({ relatedAppointmentId: 1 });

const BehaviorLog = mongoose.model('BehaviorLog', behaviorLogSchema);

export default BehaviorLog;

