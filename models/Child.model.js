import mongoose from 'mongoose';

const childSchema = new mongoose.Schema(
  {
    // Parent/Guardian Information
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Basic Information
    name: {
      type: String,
      required: [true, 'Child name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
      required: true,
    },
    profilePhoto: {
      type: String, // URL to uploaded photo
    },
    // Additional Details
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    },
    allergies: [
      {
        allergen: String,
        severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        notes: String,
      },
    ],
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
      alternatePhone: String,
    },
    // Associated Professionals
    primaryDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    primaryTherapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedTherapists: [
      {
        therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        specialization: String,
        assignedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    assignedDoctors: [
      {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        specialization: String,
        assignedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    // Access Control - Who can view this child's profile
    sharedWith: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['doctor', 'therapist', 'teacher'] },
        grantedAt: { type: Date, default: Date.now },
        grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    archivedAt: {
      type: Date,
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes
    generalNotes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
childSchema.index({ parentId: 1, isActive: 1 });
childSchema.index({ primaryDoctor: 1, isActive: 1 });
childSchema.index({ primaryTherapist: 1, isActive: 1 });
childSchema.index({ 'assignedTherapists.therapistId': 1 });
childSchema.index({ 'assignedDoctors.doctorId': 1 });
childSchema.index({ 'sharedWith.userId': 1 });

// Virtual for age
childSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Ensure virtuals are included in JSON
childSchema.set('toJSON', { virtuals: true });

const Child = mongoose.model('Child', childSchema);

export default Child;

