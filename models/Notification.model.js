import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        // Post related
        'post_approved',
        'post_rejected',
        'post_liked',
        'post_commented',
        'comment_replied',
        'comment_liked',
        // User related
        'user_followed',
        'user_mentioned',
        // Appointment related
        'appointment_created',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_reminder',
        // Therapist related
        'therapist_message',
        'therapist_review',
        'profile_verified',
        'profile_unverified',
        // Chat related
        'chat_message',
        'chat_mentioned',
        'message_reaction',
        // Admin/Moderation
        'content_flagged',
        'moderation_action',
        // System
        'system_announcement',
        'welcome',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    // Related entity references
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      index: true,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    relatedAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    relatedTherapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapistProfile',
      index: true,
    },
    relatedChatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      index: true,
    },
    relatedChatMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      index: true,
    },
    // Notification metadata
    actionUrl: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    // Status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    // Priority (for sorting/display)
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    // Expiry (for time-sensitive notifications)
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
    // Grouping (for similar notifications)
    groupKey: {
      type: String,
      index: true,
    },
    // Additional data
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, priority: 1, isRead: 1 });

// Virtual for notification age
notificationSchema.virtual('age').get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

