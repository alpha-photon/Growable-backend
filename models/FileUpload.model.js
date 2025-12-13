import mongoose from 'mongoose';

const fileUploadSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // File information from S3
    url: {
      type: String,
      required: true,
    },
    bucketKey: {
      type: String,
      required: true,
    },
    folder: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
    },
    // File metadata
    fileSize: {
      type: Number, // in bytes
    },
    mimeType: {
      type: String,
    },
    // Additional metadata
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    format: {
      type: String,
    },
    // Usage context
    uploadContext: {
      type: String,
      enum: ['post', 'message', 'profile', 'institute-logo', 'resource', 'session-note', 'other'],
      default: 'other',
    },
    // Reference to related entity (optional)
    relatedEntityType: {
      type: String,
      enum: ['Post', 'ChatMessage', 'DirectMessage', 'User', 'Institute', 'Resource', 'SessionNote', null],
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
fileUploadSchema.index({ uploadedBy: 1, createdAt: -1 });
fileUploadSchema.index({ uploadContext: 1 });
fileUploadSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
fileUploadSchema.index({ bucketKey: 1, folder: 1 });

const FileUpload = mongoose.model('FileUpload', fileUploadSchema);

export default FileUpload;
