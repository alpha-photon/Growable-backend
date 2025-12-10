import mongoose from 'mongoose';

const medicationReminderSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Medication Details
    medicationName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Medication name cannot exceed 200 characters'],
    },
    dosage: {
      amount: { type: String, required: true }, // e.g., "5ml", "1 tablet"
      unit: { type: String }, // ml, tablet, mg, etc.
    },
    frequency: {
      type: String,
      enum: ['once-daily', 'twice-daily', 'thrice-daily', 'four-times-daily', 'as-needed', 'custom'],
      required: true,
    },
    // Custom Schedule (for custom frequency)
    customSchedule: [
      {
        time: {
          hour: { type: Number, required: true, min: 0, max: 23 },
          minute: { type: Number, required: true, min: 0, max: 59 },
        },
        dosage: String,
      },
    ],
    // Standard Times (for standard frequencies)
    times: [
      {
        hour: { type: Number, min: 0, max: 23 },
        minute: { type: Number, min: 0, max: 59 },
      },
    ],
    // Reminder Settings
    reminders: {
      enabled: { type: Boolean, default: true },
      minutesBefore: { type: Number, default: 15 },
      sound: { type: String, default: 'default' },
      repeat: { type: Number, default: 3 }, // number of times to repeat reminder
    },
    // Start and End Dates
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    // Instructions
    instructions: {
      type: String,
      maxlength: [500, 'Instructions cannot exceed 500 characters'],
    },
    // Prescribed By
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Medication Logs
    logs: [
      {
        scheduledTime: { type: Date, required: true },
        actualTime: Date,
        status: {
          type: String,
          enum: ['taken', 'missed', 'skipped', 'pending'],
          default: 'pending',
        },
        notes: String,
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
medicationReminderSchema.index({ childId: 1, isActive: 1 });
medicationReminderSchema.index({ childId: 1, startDate: 1, endDate: 1 });
medicationReminderSchema.index({ 'logs.scheduledTime': 1 });

export default mongoose.model('MedicationReminder', medicationReminderSchema);

