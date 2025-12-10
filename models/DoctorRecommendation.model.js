import mongoose from 'mongoose';

const doctorRecommendationSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
      index: true,
    },
    // Doctor Information
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Recommendation Details
    title: {
      type: String,
      required: [true, 'Recommendation title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    recommendation: {
      type: String,
      required: [true, 'Recommendation is required'],
      maxlength: [2000, 'Recommendation cannot exceed 2000 characters'],
    },
    // Category
    category: {
      type: String,
      enum: [
        'medication',
        'therapy',
        'lifestyle',
        'diet',
        'exercise',
        'medical-test',
        'follow-up',
        'referral',
        'monitoring',
        'other',
      ],
    },
    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    // Dates
    recommendedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'not-followed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    completedDate: {
      type: Date,
    },
    // Related Entities
    relatedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    relatedMedicalHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalHistory',
    },
    // Medication Specific
    medication: {
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String,
    },
    // Therapy Specific
    therapy: {
      type: String,
      frequency: String,
      duration: String,
      therapistSpecialization: String,
    },
    // Follow-up
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    // Notes
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    parentNotes: {
      type: String,
      maxlength: [1000, 'Parent notes cannot exceed 1000 characters'],
    },
    // Tags
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
doctorRecommendationSchema.index({ childId: 1, status: 1, recommendedDate: -1 });
doctorRecommendationSchema.index({ doctorId: 1, recommendedDate: -1 });
doctorRecommendationSchema.index({ relatedAppointmentId: 1 });

const DoctorRecommendation = mongoose.model('DoctorRecommendation', doctorRecommendationSchema);

export default DoctorRecommendation;

