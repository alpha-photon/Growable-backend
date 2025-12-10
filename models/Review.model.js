import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    // Rating
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    // Review Content
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Review title cannot exceed 100 characters'],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters'],
    },
    // Aspect Ratings (optional)
    aspectRatings: {
      professionalism: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      effectiveness: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      empathy: { type: Number, min: 1, max: 5 },
    },
    // Verification
    isVerified: {
      type: Boolean,
      default: false, // Verified if associated with completed appointment
    },
    // Response from Therapist
    therapistResponse: {
      type: String,
      maxlength: [500, 'Therapist response cannot exceed 500 characters'],
    },
    therapistResponseAt: {
      type: Date,
    },
    // Moderation
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    moderationNotes: {
      type: String,
    },
    flaggedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        flaggedAt: Date,
      },
    ],
    // Helpful votes
    helpfulCount: {
      type: Number,
      default: 0,
    },
    helpfulUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Anonymous review
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ therapistId: 1, createdAt: -1 });
reviewSchema.index({ patientId: 1, therapistId: 1 }); // Prevent duplicate reviews
reviewSchema.index({ rating: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// Prevent multiple reviews from same patient for same therapist (unless appointmentId is different)
reviewSchema.index({ patientId: 1, therapistId: 1, appointmentId: 1 }, { unique: true });

// Pre-save: Auto-approve if verified appointment
reviewSchema.pre('save', function (next) {
  if (this.appointmentId && this.status === 'pending') {
    // If review is linked to a completed appointment, auto-approve
    this.isVerified = true;
    this.status = 'approved';
  }
  next();
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;

