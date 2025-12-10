import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorRole: {
      type: String,
      enum: ['parent', 'teacher', 'therapist', 'admin'],
      required: true,
    },
    authorAvatar: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      minlength: [10, 'Title must be at least 10 characters'],
      maxlength: [200, 'Title cannot be more than 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Please provide content'],
      minlength: [50, 'Content must be at least 50 characters'],
      maxlength: [10000, 'Content cannot be more than 10,000 characters'],
    },
    excerpt: {
      type: String,
      maxlength: [300, 'Excerpt cannot be more than 300 characters'],
    },
    category: {
      type: String,
      enum: ['success-story', 'tips', 'experience', 'advice', 'resource', 'question'],
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    specialNeeds: [
      {
        type: String,
        enum: [
          'autism',
          'adhd',
          'down-syndrome',
          'dyslexia',
          'dysgraphia',
          'dyscalculia',
          'speech-delay',
          'apraxia',
          'stuttering',
          'cerebral-palsy',
          'vision-impairment',
          'hearing-loss',
          'anxiety',
          'depression',
          'other',
        ],
      },
    ],
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
      index: true,
    },
    moderationNotes: {
      type: String,
      default: '',
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    flaggedCount: {
      type: Number,
      default: 0,
    },
    flaggedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1, status: 1 });
postSchema.index({ specialNeeds: 1, status: 1 });
postSchema.index({ featured: 1, publishedAt: -1 });
postSchema.index({ likes: -1, publishedAt: -1 }); // For trending posts
postSchema.index({ title: 'text', content: 'text' }); // For text search

// Auto-generate excerpt if not provided
postSchema.pre('save', function (next) {
  if (!this.excerpt && this.content) {
    // Remove HTML tags and get first 150 characters
    const textOnly = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = textOnly.substring(0, 150).trim() + (textOnly.length > 150 ? '...' : '');
  }
  next();
});

// Update publishedAt when status changes to approved
postSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'approved' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const Post = mongoose.model('Post', postSchema);

export default Post;

