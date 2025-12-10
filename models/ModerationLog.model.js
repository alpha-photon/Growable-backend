import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'delete_message',
        'warn_user',
        'ban_user',
        'unban_user',
        'mute_user',
        'unmute_user',
        'pin_message',
        'unpin_message',
        'flag_message',
        'approve_message',
        'reject_message',
        'add_moderator',
        'remove_moderator',
      ],
      index: true,
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      index: true,
    },
    targetRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      index: true,
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    duration: {
      // For temporary bans/mutes (in minutes)
      type: Number,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
moderationLogSchema.index({ moderator: 1, createdAt: -1 });
moderationLogSchema.index({ targetUser: 1, createdAt: -1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });
moderationLogSchema.index({ createdAt: -1 });

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);

export default ModerationLog;

