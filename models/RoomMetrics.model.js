import mongoose from 'mongoose';

const roomMetricsSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      unique: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    uniqueUsers: {
      type: Number,
      default: 0,
    },
    activeUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        messageCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    flaggedMessages: {
      type: Number,
      default: 0,
    },
    moderatedActions: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying metrics by date range
roomMetricsSchema.index({ room: 1, date: -1 });

const RoomMetrics = mongoose.model('RoomMetrics', roomMetricsSchema);

export default RoomMetrics;

