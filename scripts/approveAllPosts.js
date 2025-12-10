import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const approveAllPosts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all pending posts
    const pendingPosts = await Post.find({ status: 'pending' });
    console.log(`Found ${pendingPosts.length} pending posts`);

    if (pendingPosts.length === 0) {
      console.log('No pending posts to approve');
      process.exit(0);
    }

    // Approve all pending posts
    const result = await Post.updateMany(
      { status: 'pending' },
      { 
        status: 'approved',
        publishedAt: new Date()
      }
    );

    console.log(`✅ Approved ${result.modifiedCount} posts`);
    console.log('Posts are now visible on the blog page');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

approveAllPosts();

