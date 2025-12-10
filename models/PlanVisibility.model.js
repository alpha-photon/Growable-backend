import mongoose from 'mongoose';

const planVisibilitySchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ['doctor', 'parent', 'all'],
      required: [true, 'User type is required'],
      index: true,
    },
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: [true, 'Plan is required'],
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    customPrice: {
      type: Number,
      default: null, // If null, use default pricing
    },
    customDiscount: {
      type: Number,
      default: null, // If null, use default discount (5%)
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    order: {
      type: Number,
      default: 0, // For ordering plans
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique userType + plan combination
planVisibilitySchema.index({ userType: 1, plan: 1 }, { unique: true });

// Static method to get visible plans for user type
planVisibilitySchema.statics.getVisiblePlans = async function (userType) {
  const plans = await this.find({
    $or: [{ userType }, { userType: 'all' }],
    isVisible: true,
  }).sort({ order: 1 });

  return plans;
};

// Static method to get default plan for user type
planVisibilitySchema.statics.getDefaultPlan = async function (userType) {
  const plan = await this.findOne({
    $or: [{ userType }, { userType: 'all' }],
    isVisible: true,
    isDefault: true,
  });

  return plan;
};

const PlanVisibility = mongoose.model('PlanVisibility', planVisibilitySchema);

export default PlanVisibility;

