import mongoose from 'mongoose';

const worksheetSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Worksheet Information
    title: {
      type: String,
      required: [true, 'Worksheet title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Type
    worksheetType: {
      type: String,
      enum: ['therapy', 'homework', 'assessment', 'practice', 'other'],
      required: true,
    },
    // Category
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
    },
    // Assigned By
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Assigned To (usually parent or child)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Parent
    },
    // Dates
    assignedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    completedDate: {
      type: Date,
    },
    // Status
    status: {
      type: String,
      enum: ['assigned', 'in-progress', 'completed', 'overdue', 'not-completed'],
      default: 'assigned',
      index: true,
    },
    // Progress
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    // Worksheet File
    worksheetFile: {
      name: String,
      url: String,
      type: String, // pdf, doc, image
      uploadedAt: { type: Date, default: Date.now },
    },
    // Completed Work
    submittedWork: {
      name: String,
      url: String,
      type: String,
      submittedAt: Date,
    },
    // Related Entities
    relatedGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapyGoal',
    },
    relatedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    // Feedback
    therapistFeedback: {
      type: String,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
    },
    therapistRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedbackGivenAt: {
      type: Date,
    },
    feedbackGivenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes
    notes: [
      {
        content: String,
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
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
worksheetSchema.index({ childId: 1, status: 1, dueDate: 1 });
worksheetSchema.index({ assignedBy: 1 });
worksheetSchema.index({ assignedTo: 1 });
worksheetSchema.index({ relatedGoalId: 1 });

const Worksheet = mongoose.model('Worksheet', worksheetSchema);

export default Worksheet;

