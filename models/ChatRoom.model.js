import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    topicDescription: {
      type: String,
      default: '',
      maxlength: [2000, 'Topic description cannot exceed 2000 characters'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessage',
      },
    ],
    pinnedResources: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['link', 'pdf', 'post'],
          default: 'link',
        },
        description: {
          type: String,
          default: '',
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expertTip: {
      message: {
        type: String,
        default: '',
      },
      author: {
        type: String,
        default: '',
      },
      updatedAt: {
        type: Date,
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatRoomSchema.index({ slug: 1 });
chatRoomSchema.index({ isActive: 1, lastMessageAt: -1 });
chatRoomSchema.index({ moderators: 1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;

