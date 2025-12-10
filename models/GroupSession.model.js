import mongoose from 'mongoose';

const groupSessionSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Session Details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    sessionType: {
      type: String,
      enum: ['therapy-group', 'support-group', 'workshop', 'webinar', 'parent-group'],
      required: true,
    },
    // Schedule
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    // Recurring Sessions
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
      },
      dayOfWeek: {
        type: Number, // 0 = Sunday, 6 = Saturday
      },
      dayOfMonth: {
        type: Number, // 1-31
      },
      endDate: Date,
      occurrences: Number,
    },
    // Capacity
    maxParticipants: {
      type: Number,
      required: true,
      min: 2,
      max: 50,
    },
    minParticipants: {
      type: Number,
      default: 2,
      min: 2,
    },
    currentParticipants: {
      type: Number,
      default: 0,
    },
    // Participants
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ['registered', 'attended', 'absent', 'cancelled'],
          default: 'registered',
        },
        notes: String,
      },
    ],
    waitlist: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Location/Meeting
    sessionFormat: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      required: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingId: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      landmark: String,
    },
    // Fees
    fee: {
      type: Number,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentRequired: {
      type: Boolean,
      default: false,
    },
    // Topics/Categories
    topics: [
      {
        type: String,
        trim: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Status
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
      index: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    // Resources
    resources: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],
    // Session Notes/Summary
    sessionNotes: {
      type: String,
      maxlength: [5000, 'Session notes cannot exceed 5000 characters'],
    },
    summary: {
      type: String,
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
    },
    // Feedback
    feedbackEnabled: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    feedbackCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSessionSchema.index({ therapistId: 1, startDate: 1 });
groupSessionSchema.index({ status: 1, startDate: 1 });
groupSessionSchema.index({ sessionType: 1, status: 1 });
groupSessionSchema.index({ 'participants.userId': 1 });
groupSessionSchema.index({ tags: 1 });

// Validation: endDate should be after startDate
groupSessionSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

// Auto-update currentParticipants count
groupSessionSchema.pre('save', function (next) {
  if (this.participants) {
    this.currentParticipants = this.participants.filter(
      (p) => p.status !== 'cancelled'
    ).length;
  }
  next();
});

const GroupSession = mongoose.model('GroupSession', groupSessionSchema);

export default GroupSession;

