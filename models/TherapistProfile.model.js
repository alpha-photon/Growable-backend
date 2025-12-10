import mongoose from 'mongoose';

const therapistProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Professional Information
    qualifications: [
      {
        degree: { type: String, required: true, trim: true },
        institution: { type: String, required: true, trim: true },
        year: { type: Number },
        certificateUrl: { type: String }, // For verification
      },
    ],
    specializations: [
      {
        type: String,
        enum: [
          'autism',
          'adhd',
          'speech-therapy',
          'occupational-therapy',
          'physical-therapy',
          'behavioral-therapy',
          'dyslexia',
          'learning-disabilities',
          'anxiety',
          'depression',
          'developmental-delays',
          'sensory-processing',
          'social-skills',
          'cognitive-therapy',
          'other',
        ],
      },
    ],
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0,
    },
    languages: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      pincode: { type: String, trim: true },
    },
    // Consultation Details
    consultationType: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'both',
    },
    consultationFee: {
      online: { type: Number, min: 0, default: 0 },
      offline: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'INR' },
    },
    sessionDuration: {
      type: Number, // in minutes
      enum: [30, 45, 60, 90],
      default: 60,
    },
    // Verification
    licenseNumber: {
      type: String,
      trim: true,
    },
    licenseDocument: {
      type: String, // URL to uploaded document
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who verified
    },
    verificationNotes: {
      type: String,
    },
    // Availability
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'on-leave', 'unavailable'],
      default: 'available',
    },
    workingHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } },
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    // Contact Information
    phoneNumber: {
      type: String,
      trim: true,
    },
    alternateEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    // Professional Bio
    professionalBio: {
      type: String,
      maxlength: [2000, 'Professional bio cannot exceed 2000 characters'],
    },
    approach: {
      type: String,
      maxlength: [1000, 'Approach description cannot exceed 1000 characters'],
    },
    // Stats (computed fields)
    totalAppointments: {
      type: Number,
      default: 0,
    },
    completedAppointments: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient searching
therapistProfileSchema.index({ specializations: 1 });
therapistProfileSchema.index({ 'location.city': 1, 'location.state': 1 });
therapistProfileSchema.index({ consultationType: 1 });
therapistProfileSchema.index({ isVerified: 1, isActive: 1 });
therapistProfileSchema.index({ averageRating: -1 });
therapistProfileSchema.index({ availabilityStatus: 1 });

// Pre-save hook to check if profile is complete
therapistProfileSchema.pre('save', function (next) {
  const requiredFields = [
    'qualifications',
    'specializations',
    'location.city',
    'consultationType',
    'professionalBio',
  ];

  const isComplete = requiredFields.every((field) => {
    const value = this.get(field);
    return value && (Array.isArray(value) ? value.length > 0 : value);
  });

  this.isProfileComplete = isComplete;
  next();
});

const TherapistProfile = mongoose.model('TherapistProfile', therapistProfileSchema);

export default TherapistProfile;

