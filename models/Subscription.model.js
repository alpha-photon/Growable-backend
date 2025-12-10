import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Subscription must belong to a user'],
      index: true,
    },
    plan: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      required: [true, 'Please select a subscription plan'],
    },
    userType: {
      type: String,
      enum: ['doctor', 'parent'],
      required: [true, 'User type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Subscription amount is required'],
    },
    discount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount after discount is required'],
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending'],
      default: 'pending',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpaySubscriptionId: {
      type: String,
      index: true,
    },
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    nextBillingDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active subscriptions lookup
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
  return (
    this.status === 'active' &&
    this.endDate > new Date()
  );
};

// Method to check if subscription is expired
subscriptionSchema.methods.isExpired = function () {
  return this.endDate <= new Date();
};

// Static method to get base price for user type
subscriptionSchema.statics.getBasePrice = function (userType) {
  const prices = {
    doctor: 399,
    parent: 299,
  };
  return prices[userType] || 0;
};

// Static method to calculate price with discount
subscriptionSchema.statics.calculatePrice = function (userType, plan) {
  const basePrice = this.getBasePrice(userType);
  let monthlyPrice = basePrice;
  let discount = 0;

  if (plan === 'quarterly') {
    monthlyPrice = basePrice * 3;
    discount = monthlyPrice * 0.05; // 5% discount
  } else if (plan === 'yearly') {
    monthlyPrice = basePrice * 12;
    discount = monthlyPrice * 0.05; // 5% discount
  }

  const finalAmount = monthlyPrice - discount;

  return {
    basePrice,
    monthlyPrice,
    discount,
    finalAmount,
  };
};

// Pre-save hook to calculate end date (only if not already set)
subscriptionSchema.pre('save', function (next) {
  // Only calculate if endDate is not set and we have plan and startDate
  if (!this.endDate && this.plan && this.startDate) {
    const start = new Date(this.startDate);
    let endDate = new Date(start);

    switch (this.plan) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    this.endDate = endDate;
    if (!this.nextBillingDate) {
      this.nextBillingDate = endDate;
    }
  }
  next();
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;

