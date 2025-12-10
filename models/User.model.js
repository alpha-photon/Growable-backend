import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: function() {
        return !this.isAnonymous;
      },
      unique: true,
      sparse: true, // Allow null values for anonymous users
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: function() {
        return !this.isAnonymous;
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    isAnonymous: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot be more than 50 characters'],
    },
    avatarEmoji: {
      type: String,
      default: '',
      maxlength: [10, 'Avatar emoji cannot exceed 10 characters'],
    },
    role: {
      type: String,
      enum: ['parent', 'teacher', 'therapist', 'doctor', 'admin'],
      default: 'parent',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
      default: '',
    },
    verified: {
      type: Boolean,
      default: false,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    chatMessageCount: {
      type: Number,
      default: 0,
    },
    helpfulUpvotes: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    rulesAccepted: {
      type: Boolean,
      default: false,
    },
    rulesAcceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for non-anonymous users)
userSchema.pre('save', async function (next) {
  if (this.isAnonymous || !this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Set display name from name if not provided
userSchema.pre('save', function (next) {
  if (!this.displayName && this.name) {
    this.displayName = this.name;
  }
  if (this.isAnonymous && !this.displayName) {
    this.displayName = 'Anonymous User';
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;

