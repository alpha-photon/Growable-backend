import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';

dotenv.config();

const checkPosts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const total = await Post.countDocuments();
    const approved = await Post.countDocuments({ status: 'approved' });
    const pending = await Post.countDocuments({ status: 'pending' });
    const rejected = await Post.countDocuments({ status: 'rejected' });
    const drafts = await Post.countDocuments({ status: 'draft' });

    console.log('📊 Post Statistics:');
    console.log(`Total Posts: ${total}`);
    console.log(`✅ Approved: ${approved} (visible on blog)`);
    console.log(`⏳ Pending: ${pending} (awaiting moderation)`);
    console.log(`❌ Rejected: ${rejected}`);
    console.log(`📝 Drafts: ${drafts}\n`);

    if (pending > 0) {
      console.log('💡 To approve pending posts, run:');
      console.log('   node scripts/approveAllPosts.js\n');
    }

    // Show pending posts
    if (pending > 0) {
      const pendingPosts = await Post.find({ status: 'pending' })
        .select('title authorName category createdAt')
        .limit(10);
      
      console.log('⏳ Pending Posts:');
      pendingPosts.forEach((post, i) => {
        console.log(`   ${i + 1}. "${post.title}" by ${post.authorName} (${post.category})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkPosts();

