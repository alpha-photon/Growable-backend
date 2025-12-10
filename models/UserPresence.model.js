import mongoose from 'mongoose';

const userPresenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    socketId: {
      type: String,
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    avatarEmoji: {
      type: String,
      default: '',
    },
    isTyping: {
      type: Boolean,
      default: false,
    },
    lastTypingAt: {
      type: Date,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient room presence queries
userPresenceSchema.index({ room: 1, user: 1 }, { unique: true });
userPresenceSchema.index({ socketId: 1 });
userPresenceSchema.index({ room: 1, isTyping: 1 });

// TTL index to auto-remove stale presence (24 hours)
userPresenceSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const UserPresence = mongoose.model('UserPresence', userPresenceSchema);

export default UserPresence;

