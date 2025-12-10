import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
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
    // Child Reference (optional - for child appointments)
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      index: true,
    },
    // Appointment Details
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    appointmentTime: {
      type: String, // e.g., "10:00", "14:30"
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      default: 60,
    },
    consultationType: {
      type: String,
      enum: ['online', 'offline'],
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'pending',
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: ['therapist', 'patient', 'system'],
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    cancelledAt: {
      type: Date,
    },
    // Meeting Details (for online)
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingId: {
      type: String,
      trim: true,
    },
    // Address (for offline)
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
    // Notes
    patientNotes: {
      type: String,
      maxlength: [1000, 'Patient notes cannot exceed 1000 characters'],
    },
    therapistNotes: {
      type: String,
      maxlength: [1000, 'Therapist notes cannot exceed 1000 characters'],
    },
    // Reminders
    remindersSent: {
      type: Number,
      default: 0,
    },
    lastReminderSent: {
      type: Date,
    },
    // Fees
    consultationFee: {
      type: Number,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'free'],
      default: 'pending',
    },
    paymentId: {
      type: String,
    },
    // Follow-up
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    parentAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    followUpDate: {
      type: Date,
    },
    // Completion
    completedAt: {
      type: Date,
    },
    sessionNotesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionNote',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
appointmentSchema.index({ therapistId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ childId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });

// Validation: Appointment date should be in the future
appointmentSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('appointmentDate')) {
    const appointmentDateTime = new Date(this.appointmentDate);
    const [hours, minutes] = this.appointmentTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    if (appointmentDateTime < new Date() && this.status === 'pending') {
      return next(new Error('Appointment date and time must be in the future'));
    }
  }
  next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;

