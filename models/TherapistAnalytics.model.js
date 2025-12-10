import mongoose from 'mongoose';

const therapistAnalyticsSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Time Period
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'all-time'],
      required: true,
      default: 'all-time',
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    // Appointment Stats
    appointments: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      noShow: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      byType: {
        online: { type: Number, default: 0 },
        offline: { type: Number, default: 0 },
      },
    },
    // Revenue Stats (for future payment integration)
    revenue: {
      total: { type: Number, default: 0 },
      online: { type: Number, default: 0 },
      offline: { type: Number, default: 0 },
      currency: { type: String, default: 'INR' },
    },
    // Review Stats
    reviews: {
      total: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      byRating: {
        five: { type: Number, default: 0 },
        four: { type: Number, default: 0 },
        three: { type: Number, default: 0 },
        two: { type: Number, default: 0 },
        one: { type: Number, default: 0 },
      },
      recentReviews: [
        {
          reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
          rating: Number,
          date: Date,
        },
      ],
    },
    // Patient Stats
    patients: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
      returning: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
    },
    // Session Notes Stats
    sessionNotes: {
      total: { type: Number, default: 0 },
      withProgress: { type: Number, default: 0 },
      averageProgress: { type: Number, default: 0 },
    },
    // Resource Stats
    resources: {
      total: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      views: { type: Number, default: 0 },
    },
    // Group Sessions Stats
    groupSessions: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
      averageParticipants: { type: Number, default: 0 },
    },
    // Engagement Metrics
    engagement: {
      messagesSent: { type: Number, default: 0 },
      messagesReceived: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 }, // in minutes
      profileViews: { type: Number, default: 0 },
      directoryClicks: { type: Number, default: 0 },
    },
    // Specializations Performance
    specializationStats: [
      {
        specialization: String,
        appointments: Number,
        averageRating: Number,
        revenue: Number,
      },
    ],
    // Time-based Trends
    trends: {
      appointmentGrowth: { type: Number, default: 0 }, // percentage
      ratingTrend: { type: Number, default: 0 }, // +1 = improving, -1 = declining
      revenueGrowth: { type: Number, default: 0 }, // percentage
    },
    // Last Updated
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
therapistAnalyticsSchema.index({ therapistId: 1, period: 1, periodStart: -1 });
therapistAnalyticsSchema.index({ periodStart: 1, periodEnd: 1 });

const TherapistAnalytics = mongoose.model('TherapistAnalytics', therapistAnalyticsSchema);

export default TherapistAnalytics;

