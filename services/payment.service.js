import crypto from 'crypto';
import Payment from '../models/Payment.model.js';
import Subscription from '../models/Subscription.model.js';

// Initialize Razorpay (dynamic import to handle missing package)
let Razorpay;
let razorpay;
let razorpayInitialized = false;

try {
  const razorpayModule = await import('razorpay');
  Razorpay = razorpayModule.default || razorpayModule;
  
  // Check if Razorpay keys are configured
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn('⚠️  Razorpay keys not configured in .env file');
    console.warn('   Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
    razorpay = null;
  } else if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id' || 
             process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
    console.warn('⚠️  Razorpay keys are using placeholder values');
    console.warn('   Please update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env with actual values');
    razorpay = null;
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    razorpayInitialized = true;
    console.log('✅ Razorpay initialized successfully');
  }
} catch (error) {
  console.warn('⚠️  Razorpay package not found or initialization failed.');
  console.warn('   Error:', error.message || error);
  console.warn('   To enable payments, run: npm install razorpay');
  razorpay = null;
}

/**
 * Create a Razorpay order
 */
export const createOrder = async (amount, currency = 'INR', receipt = null) => {
  if (!razorpay || !razorpayInitialized) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file');
    }
    if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id' || 
        process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
      throw new Error('Razorpay keys are using placeholder values. Please update .env file with actual Razorpay credentials');
    }
    throw new Error('Razorpay is not initialized. Please install razorpay package: npm install razorpay');
  }
  
  try {
    const options = {
      amount: amount * 100, // Convert to paise (Razorpay expects amount in smallest currency unit)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    const errorMessage = error.message || error.description || error.error?.description || 'Unknown error';
    const errorCode = error.error?.code || error.code || 'UNKNOWN';
    throw new Error(`Failed to create payment order: ${errorMessage} (Code: ${errorCode})`);
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpaySignature;
    return isAuthentic;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Create payment record
 */
export const createPaymentRecord = async (paymentData) => {
  try {
    const payment = await Payment.create(paymentData);
    return payment;
  } catch (error) {
    console.error('Error creating payment record:', error);
    throw new Error(`Failed to create payment record: ${error.message}`);
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (paymentId, updateData) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw new Error(`Failed to update payment status: ${error.message}`);
  }
};

/**
 * Get payment by Razorpay order ID
 */
export const getPaymentByOrderId = async (razorpayOrderId) => {
  try {
    const payment = await Payment.findOne({ razorpayOrderId });
    return payment;
  } catch (error) {
    console.error('Error fetching payment by order ID:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId)
      .populate('user', 'name email role')
      .populate('subscription');
    return payment;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Get user payments
 */
export const getUserPayments = async (userId, limit = 10, skip = 0) => {
  try {
    const payments = await Payment.find({ user: userId })
      .populate('subscription')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Payment.countDocuments({ user: userId });

    return {
      payments,
      total,
      limit,
      skip,
    };
  } catch (error) {
    console.error('Error fetching user payments:', error);
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }
};

/**
 * Process refund (if needed in future)
 */
export const processRefund = async (paymentId, amount = null) => {
  try {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    if (payment.razorpayPaymentId) {
      const refundAmount = amount || payment.amount;
      const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: refundAmount * 100, // Convert to paise
      });

      payment.refundAmount = refundAmount;
      payment.refundedAt = new Date();
      payment.status = 'refunded';
      await payment.save();

      return {
        success: true,
        refundId: refund.id,
        amount: refundAmount,
      };
    }

    throw new Error('Razorpay payment ID not found');
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error(`Failed to process refund: ${error.message}`);
  }
};

export default {
  createOrder,
  verifyPayment,
  createPaymentRecord,
  updatePaymentStatus,
  getPaymentByOrderId,
  getPaymentById,
  getUserPayments,
  processRefund,
};

