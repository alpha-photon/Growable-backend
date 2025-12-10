import mongoose from 'mongoose';

const childFileSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // File Information
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [200, 'File name cannot exceed 200 characters'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      enum: ['document', 'image', 'video', 'audio', 'report', 'certificate', 'other'],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    // Category
    category: {
      type: String,
      enum: [
        'medical-report',
        'diagnosis-report',
        'assessment',
        'therapy-video',
        'progress-video',
        'behavior-video',
        'session-recording',
        'homework',
        'worksheet',
        'certificate',
        'prescription',
        'test-result',
        'x-ray',
        'scan',
        'other',
      ],
    },
    // Description
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Uploaded By
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['parent', 'doctor', 'therapist', 'teacher', 'admin'],
      required: true,
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
    relatedAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildAssessment',
    },
    relatedBehaviorLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BehaviorLog',
    },
    // Privacy
    isPrivate: {
      type: Boolean,
      default: false,
    },
    privateToRoles: [
      {
        type: String,
        enum: ['doctor', 'therapist'],
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
    // Thumbnail (for videos/images)
    thumbnailUrl: {
      type: String,
    },
    // Duration (for videos/audio)
    duration: {
      type: Number, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
childFileSchema.index({ childId: 1, createdAt: -1 });
childFileSchema.index({ childId: 1, fileType: 1 });
childFileSchema.index({ childId: 1, category: 1 });
childFileSchema.index({ uploadedBy: 1 });
childFileSchema.index({ relatedAppointmentId: 1 });

const ChildFile = mongoose.model('ChildFile', childFileSchema);

export default ChildFile;

