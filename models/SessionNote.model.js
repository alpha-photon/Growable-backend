import mongoose from 'mongoose';

const sessionNoteSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Child Reference (optional - for child sessions)
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      index: true,
    },
    // Session Details
    sessionDate: {
      type: Date,
      required: true,
      index: true,
    },
    sessionDuration: {
      type: Number, // in minutes
      required: true,
    },
    // Notes Content
    presentingComplaint: {
      type: String,
      maxlength: [1000, 'Presenting complaint cannot exceed 1000 characters'],
    },
    sessionNotes: {
      type: String,
      required: true,
      maxlength: [5000, 'Session notes cannot exceed 5000 characters'],
    },
    observations: {
      type: String,
      maxlength: [2000, 'Observations cannot exceed 2000 characters'],
    },
    interventions: {
      type: String,
      maxlength: [2000, 'Interventions cannot exceed 2000 characters'],
    },
    homework: {
      type: String,
      maxlength: [1000, 'Homework cannot exceed 1000 characters'],
    },
    // Progress Tracking
    progress: {
      type: String,
      enum: ['excellent', 'good', 'moderate', 'needs-improvement', 'not-assessed'],
      default: 'not-assessed',
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    goals: [
      {
        goal: { type: String, required: true },
        status: {
          type: String,
          enum: ['not-started', 'in-progress', 'achieved', 'deferred'],
          default: 'not-started',
        },
        targetDate: Date,
      },
    ],
    // Assessments/Scores
    assessments: [
      {
        name: String,
        score: Number,
        maxScore: Number,
        date: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    // Files/Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Privacy
    isPatientVisible: {
      type: Boolean,
      default: false, // By default, notes are private to therapist
    },
    sharedWithPatientAt: {
      type: Date,
    },
    // Next Session
    nextSessionPlan: {
      type: String,
      maxlength: [1000, 'Next session plan cannot exceed 1000 characters'],
    },
    recommendedFollowUp: {
      type: Number, // days until next session
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
sessionNoteSchema.index({ therapistId: 1, sessionDate: -1 });
sessionNoteSchema.index({ patientId: 1, sessionDate: -1 });
sessionNoteSchema.index({ childId: 1, sessionDate: -1 });
sessionNoteSchema.index({ appointmentId: 1 }, { unique: true }); // One note per appointment

const SessionNote = mongoose.model('SessionNote', sessionNoteSchema);

export default SessionNote;

