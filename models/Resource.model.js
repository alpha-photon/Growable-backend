import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Resource Details
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    resourceType: {
      type: String,
      enum: ['document', 'video', 'audio', 'worksheet', 'article', 'tool', 'assessment', 'other'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'autism',
        'adhd',
        'speech-therapy',
        'occupational-therapy',
        'physical-therapy',
        'behavioral-therapy',
        'learning-disabilities',
        'mental-health',
        'parent-resources',
        'educational',
        'assessment',
        'general',
      ],
      required: true,
    },
    // File/Content
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number, // in bytes
    },
    mimeType: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    // Access Control
    accessLevel: {
      type: String,
      enum: ['public', 'patients-only', 'therapists-only', 'premium'],
      default: 'public',
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Metadata
    author: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    version: {
      type: String,
      default: '1.0',
    },
    // Stats
    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    // Moderation
    isApproved: {
      type: Boolean,
      default: true, // Auto-approve for therapists
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // Related
    relatedAppointments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
resourceSchema.index({ therapistId: 1, createdAt: -1 });
resourceSchema.index({ category: 1, resourceType: 1, status: 1 });
resourceSchema.index({ tags: 1 });
resourceSchema.index({ isFeatured: 1, status: 1 });
resourceSchema.index({ accessLevel: 1, status: 1 });

// Text search index
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;

