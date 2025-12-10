import mongoose from 'mongoose';

const therapistSuggestionSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Therapist Information
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Suggestion Details
    title: {
      type: String,
      required: [true, 'Suggestion title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    suggestion: {
      type: String,
      required: [true, 'Suggestion is required'],
      maxlength: [2000, 'Suggestion cannot exceed 2000 characters'],
    },
    // Category
    category: {
      type: String,
      enum: [
        'home-practice',
        'behavior-management',
        'communication',
        'social-skills',
        'sensory',
        'environment-modification',
        'routine',
        'resource',
        'parent-training',
        'other',
      ],
    },
    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    // Dates
    suggestedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'implemented', 'not-implemented', 'cancelled'],
      default: 'pending',
      index: true,
    },
    implementedDate: {
      type: Date,
    },
    // Related Entities
    relatedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    relatedSessionNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionNote',
    },
    relatedGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapyGoal',
    },
    // Implementation Details
    implementationNotes: {
      type: String,
      maxlength: [1000, 'Implementation notes cannot exceed 1000 characters'],
    },
    parentFeedback: {
      type: String,
      maxlength: [1000, 'Parent feedback cannot exceed 1000 characters'],
    },
    effectiveness: {
      type: String,
      enum: ['very-effective', 'effective', 'somewhat-effective', 'not-effective', 'not-tried'],
    },
    // Resources
    resources: [
      {
        name: String,
        url: String,
        type: String,
        description: String,
      },
    ],
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
therapistSuggestionSchema.index({ childId: 1, status: 1, suggestedDate: -1 });
therapistSuggestionSchema.index({ therapistId: 1, suggestedDate: -1 });
therapistSuggestionSchema.index({ relatedAppointmentId: 1 });

const TherapistSuggestion = mongoose.model('TherapistSuggestion', therapistSuggestionSchema);

export default TherapistSuggestion;

