import mongoose from 'mongoose';

const notificationSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    browserPushEnabled: {
      type: Boolean,
      default: false,
    },
    browserPushToken: {
      type: String,
      default: '',
    },
    mutedRooms: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
      },
    ],
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    lastReadAt: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings;

