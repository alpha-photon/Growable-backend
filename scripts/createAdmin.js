import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'admin@gmail.com';
    const password = 'admin123';
    const name = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      // Update existing user to admin if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.password = password; // Will be hashed by pre-save hook
        existingAdmin.verified = true;
        await existingAdmin.save();
        console.log('✅ Existing user updated to admin role');
      } else {
        // Update password if needed
        existingAdmin.password = password; // Will be hashed by pre-save hook
        existingAdmin.verified = true;
        await existingAdmin.save();
        console.log('✅ Admin user already exists, password updated');
      }
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`👤 Role: admin`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create new admin user
    const admin = await User.create({
      name,
      email,
      password, // Will be automatically hashed by pre-save hook
      role: 'admin',
      verified: true,
      rulesAccepted: true,
      rulesAcceptedAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Role: admin`);
    console.log(`🆔 User ID: ${admin._id}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();

