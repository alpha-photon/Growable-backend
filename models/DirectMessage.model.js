import mongoose from 'mongoose';

const directMessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Message Content
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      trim: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'appointment', 'system'],
      default: 'text',
    },
    // Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Related Entities
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    sessionNoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SessionNote',
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Reply/Thread
    parentMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectMessage',
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DirectMessage',
    },
    // Priority
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    // Moderation
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flaggedReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
directMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
directMessageSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
directMessageSchema.index({ threadId: 1, createdAt: 1 });
directMessageSchema.index({ appointmentId: 1 });

// Compound index for conversation view
directMessageSchema.index(
  {
    $or: [{ senderId: 1, recipientId: 1 }, { senderId: 1, recipientId: 1 }],
  },
  { name: 'conversation_index' }
);

// Virtual for conversation participants
directMessageSchema.virtual('participants', {
  ref: 'User',
  localField: ['senderId', 'recipientId'],
  foreignField: '_id',
});

const DirectMessage = mongoose.model('DirectMessage', directMessageSchema);

export default DirectMessage;

