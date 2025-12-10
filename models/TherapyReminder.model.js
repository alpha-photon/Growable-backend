import mongoose from 'mongoose';

const therapyReminderSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Therapy Type
    therapyType: {
      type: String,
      enum: ['speech', 'occupational', 'physical', 'behavioral', 'play', 'music', 'art', 'other'],
      required: true,
    },
    // Therapy Details
    therapyName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Schedule
    scheduleType: {
      type: String,
      enum: ['one-time', 'recurring'],
      default: 'recurring',
    },
    // One-time appointment
    scheduledDate: {
      type: Date,
    },
    // Recurring schedule
    recurrence: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
      },
      daysOfWeek: [
        {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
      ],
      time: {
        hour: { type: Number, min: 0, max: 23 },
        minute: { type: Number, min: 0, max: 59 },
      },
      duration: { type: Number, default: 60 }, // in minutes
    },
    // Location/Type
    location: {
      type: String,
      enum: ['home', 'clinic', 'school', 'online'],
      default: 'clinic',
    },
    // Therapist/Professional
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Reminder Settings
    reminders: {
      enabled: { type: Boolean, default: true },
      minutesBefore: { type: Number, default: 60 }, // 1 hour before
      sound: { type: String, default: 'default' },
      sendEmail: { type: Boolean, default: false },
      sendSMS: { type: Boolean, default: false },
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Sessions Log
    sessions: [
      {
        scheduledDate: { type: Date, required: true },
        actualDate: Date,
        status: {
          type: String,
          enum: ['completed', 'missed', 'cancelled', 'rescheduled', 'pending'],
          default: 'pending',
        },
        notes: String,
        progress: {
          type: String,
          enum: ['excellent', 'good', 'moderate', 'needs-improvement', 'not-assessed'],
        },
        loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        loggedAt: { type: Date, default: Date.now },
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
therapyReminderSchema.index({ childId: 1, isActive: 1 });
therapyReminderSchema.index({ childId: 1, 'recurrence.daysOfWeek': 1 });
therapyReminderSchema.index({ scheduledDate: 1 });
therapyReminderSchema.index({ therapistId: 1 });

export default mongoose.model('TherapyReminder', therapyReminderSchema);

