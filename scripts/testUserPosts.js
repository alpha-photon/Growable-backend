import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../models/Post.model.js';
import User from '../models/User.model.js';

dotenv.config();

const testUserPosts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find().select('name email _id');
    console.log('👥 Users in database:');
    users.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.name} (${user.email}) - ID: ${user._id}`);
    });

    console.log('\n📝 Posts by user:');
    for (const user of users) {
      const posts = await Post.find({ authorId: user._id });
      console.log(`\n   ${user.name}:`);
      if (posts.length === 0) {
        console.log('      No posts');
      } else {
        posts.forEach((post, i) => {
          console.log(`      ${i + 1}. "${post.title}" - Status: ${post.status}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testUserPosts();

