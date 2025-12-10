import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    avatarEmoji: {
      type: String,
      default: '',
      maxlength: [10, 'Avatar emoji cannot exceed 10 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'voice', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      required: function() {
        return this.messageType === 'text' || this.messageType === 'system';
      },
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    imageUrl: {
      type: String,
      required: function() {
        return this.messageType === 'image';
      },
    },
    imagePublicId: {
      type: String,
    },
    voiceUrl: {
      type: String,
      required: function() {
        return this.messageType === 'voice';
      },
    },
    voiceDuration: {
      type: Number,
      min: 0,
      max: 30,
    },
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
      },
    ],
    replyCount: {
      type: Number,
      default: 0,
    },
    isQuestion: {
      type: Boolean,
      default: false,
      index: true,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        count: {
          type: Number,
          default: 0,
        },
      },
    ],
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flaggedReason: {
      type: String,
      enum: ['profanity', 'medical_advice', 'abuse', 'spam', 'other'],
    },
    flaggedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: {
          type: String,
          enum: ['medical_advice', 'abuse', 'spam', 'other'],
        },
        reportedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    needsReview: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewReason: {
      type: String,
    },
    approved: {
      type: Boolean,
      default: true,
    },
    editedAt: {
      type: Date,
    },
    editedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ room: 1, isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ room: 1, isQuestion: 1, isDeleted: 1, createdAt: -1 });
chatMessageSchema.index({ parentMessage: 1, createdAt: 1 });
chatMessageSchema.index({ isFlagged: 1, needsReview: 1, createdAt: -1 });

// Method to check if message is a question
chatMessageSchema.pre('save', function(next) {
  if (this.content && !this.isQuestion) {
    // Check if message ends with ? or contains question mark
    this.isQuestion = this.content.trim().endsWith('?') || 
                     this.content.includes('?') ||
                     this.content.toLowerCase().includes('question:');
  }
  next();
});

// Virtual for reaction count
chatMessageSchema.virtual('reactionCount').get(function() {
  return this.reactions.reduce((sum, r) => sum + r.count, 0);
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;

