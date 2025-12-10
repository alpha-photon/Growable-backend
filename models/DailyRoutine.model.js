import mongoose from 'mongoose';

const dailyRoutineSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Routine Name
    routineName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Routine name cannot exceed 100 characters'],
    },
    // Routine Description
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Schedule Type
    scheduleType: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily',
    },
    // Days of Week (for weekly schedules)
    daysOfWeek: [
      {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
    ],
    // Activities
    activities: [
      {
        activityName: {
          type: String,
          required: true,
          trim: true,
        },
        activityDescription: {
          type: String,
          maxlength: [500, 'Activity description cannot exceed 500 characters'],
        },
        pictureUrl: {
          type: String, // URL to activity picture
        },
        time: {
          hour: { type: Number, required: true, min: 0, max: 23 },
          minute: { type: Number, required: true, min: 0, max: 59 },
        },
        duration: {
          type: Number, // in minutes
          default: 0,
        },
        order: {
          type: Number,
          required: true,
        },
        reminders: {
          enabled: { type: Boolean, default: false },
          minutesBefore: { type: Number, default: 5 },
          sound: { type: String, default: 'default' },
        },
        isCompleted: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Sharing
    sharedWith: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['doctor', 'therapist', 'teacher'] },
        sharedAt: { type: Date, default: Date.now },
      },
    ],
    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
dailyRoutineSchema.index({ childId: 1, isActive: 1 });
dailyRoutineSchema.index({ childId: 1, createdAt: -1 });

export default mongoose.model('DailyRoutine', dailyRoutineSchema);

