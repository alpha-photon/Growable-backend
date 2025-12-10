import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/auth.routes.js';
import postRoutes from './routes/posts.routes.js';
import commentRoutes from './routes/comments.routes.js';
import userRoutes from './routes/users.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import chatRoutes from './routes/chat.routes.js';
import chatModerationRoutes from './routes/chatModeration.routes.js';
import timeRoutes from './routes/time.routes.js';
import therapistProfileRoutes from './routes/therapistProfile.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import reviewRoutes from './routes/review.routes.js';
import resourceRoutes from './routes/resource.routes.js';
import messageRoutes from './routes/message.routes.js';
import childRoutes from './routes/child.routes.js';
import patientRoutes from './routes/patient.routes.js';
import adminRoutes from './routes/admin.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { sanitizeBody, sanitizeQuery, sanitizeParams } from './middleware/sanitize.middleware.js';
import { initializeSocket } from './socket/socketServer.js';
import http from 'http';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS - will be applied in middleware

// CORS configuration - Allow all origins
app.use(cors({
  origin: true, // Allow all origins (reflects the request origin)
  credentials: true,
}));

// Rate limiting - Different limits for different endpoint types
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes for general endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient limit for read-only endpoints like time sync
const readOnlyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for read-only endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting selectively
app.use('/api/auth', authLimiter);
app.use('/api/time', readOnlyLimiter); // Time sync endpoint gets lenient limit
app.use('/api/', generalLimiter); // All other API endpoints

// Cookie parser middleware
app.use(cookieParser());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all inputs
app.use(sanitizeBody);
app.use(sanitizeQuery);
app.use(sanitizeParams);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'GrowAble Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat/moderation', chatModerationRoutes);
app.use('/api', timeRoutes);
app.use('/api/therapist', therapistProfileRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/children', childRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error(`   Please check:`);
    console.error(`   1. MongoDB is running locally, OR`);
    console.error(`   2. Update MONGODB_URI in .env with MongoDB Atlas connection string`);
    console.error(`   3. Check network connectivity`);
    console.error(`\n   Current MONGODB_URI: ${process.env.MONGODB_URI}`);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Create HTTP server
    const httpServer = http.createServer(app);
    
    // Initialize Socket.io
    const io = initializeSocket(httpServer);
    
    // Make io available to app for use in routes if needed
    app.set('io', io);
    
    // Set io instance for notification emitter
    const { setIOInstance } = await import('./utils/notificationEmitter.js');
    setIOInstance(io);
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.io server initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Export app for testing
export default app;

