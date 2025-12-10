import mongoose from 'mongoose';

const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    badgeType: {
      type: String,
      required: true,
      enum: [
        'helpful_parent',
        'active_contributor',
        'expert',
        'moderator',
        'community_leader',
        'verified',
      ],
      index: true,
    },
    badgeName: {
      type: String,
      required: true,
    },
    badgeEmoji: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      // null means permanent badge
    },
    metadata: {
      // Store additional data like upvote count, etc.
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index
userBadgeSchema.index({ user: 1, badgeType: 1 }, { unique: true });
userBadgeSchema.index({ user: 1, awardedAt: -1 });

const UserBadge = mongoose.model('UserBadge', userBadgeSchema);

export default UserBadge;

