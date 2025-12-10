import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ChatRoom from '../models/ChatRoom.model.js';
import User from '../models/User.model.js';

dotenv.config();

const chatRooms = [
  {
    slug: 'autism-support',
    name: 'Autism Support',
    description: 'A supportive community for parents, caregivers, and individuals affected by autism',
    topicDescription: `Welcome to the Autism Support room! This is a safe space for:
- Sharing experiences and challenges
- Getting peer support and encouragement
- Discussing strategies and tips
- Connecting with others who understand

Remember: This platform provides peer support only. No medical advice should be given. Always consult with qualified professionals for medical guidance.`,
    isPrivate: false,
    moderators: [], // Will be populated with admin users
  },
  {
    slug: 'speech-delay',
    name: 'Speech Delay Support',
    description: 'Community for parents dealing with speech and language delays',
    topicDescription: `Welcome to the Speech Delay Support room! Connect with others navigating:
- Speech therapy experiences
- Language development milestones
- Communication strategies
- Resources and recommendations

Remember: This platform provides peer support only. No medical advice should be given. Always consult with qualified speech therapists and professionals.`,
    isPrivate: false,
    moderators: [],
  },
  {
    slug: 'adhd-behaviour',
    name: 'ADHD & Behavior Support',
    description: 'Support group for ADHD and behavioral challenges',
    topicDescription: `Welcome to the ADHD & Behavior Support room! Share and learn about:
- ADHD management strategies
- Behavioral interventions
- School accommodations
- Daily routines and organization

Remember: This platform provides peer support only. No medical advice should be given. Always consult with qualified healthcare professionals.`,
    isPrivate: false,
    moderators: [],
  },
  {
    slug: 'dyslexia',
    name: 'Dyslexia Support',
    description: 'Support community for dyslexia and learning differences',
    topicDescription: `Welcome to the Dyslexia Support room! This space is for:
- Sharing learning strategies
- Discussing educational resources
- Supporting academic success
- Building confidence and self-advocacy

Remember: This platform provides peer support only. No medical advice should be given. Always consult with qualified educational specialists.`,
    isPrivate: false,
    moderators: [],
  },
  {
    slug: 'teachers',
    name: 'Teachers & Educators',
    description: 'Community for educators working with special needs students',
    topicDescription: `Welcome to the Teachers & Educators room! A space for:
- Sharing teaching strategies
- Discussing classroom accommodations
- Collaborating on resources
- Professional development discussions

Remember: This platform provides peer support only. Professional guidance should always be sought from qualified educational professionals.`,
    isPrivate: false,
    moderators: [],
  },
  {
    slug: 'general-parent-lounge',
    name: 'General Parent Lounge',
    description: 'General discussion area for all parents and caregivers',
    topicDescription: `Welcome to the General Parent Lounge! A relaxed space for:
- Casual conversations
- General parenting discussions
- Sharing stories and experiences
- Community building

Remember: This platform provides peer support only. No medical advice should be given. Always consult with qualified professionals for medical guidance.`,
    isPrivate: false,
    moderators: [],
  },
];

const seedChatRooms = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Find admin users to set as moderators
    const adminUsers = await User.find({ role: 'admin' }).limit(1);
    
    // Clear existing rooms (optional - comment out if you want to keep existing data)
    // await ChatRoom.deleteMany({});

    let created = 0;
    let updated = 0;

    for (const roomData of chatRooms) {
      const existingRoom = await ChatRoom.findOne({ slug: roomData.slug });
      
      if (existingRoom) {
        // Update existing room
        existingRoom.name = roomData.name;
        existingRoom.description = roomData.description;
        existingRoom.topicDescription = roomData.topicDescription;
        existingRoom.isActive = true;
        
        // Add admin as moderator if not already
        if (adminUsers.length > 0) {
          const adminId = adminUsers[0]._id;
          if (!existingRoom.moderators.includes(adminId)) {
            existingRoom.moderators.push(adminId);
          }
        }
        
        await existingRoom.save();
        updated++;
        console.log(`✅ Updated room: ${roomData.slug}`);
      } else {
        // Create new room
        if (adminUsers.length > 0) {
          roomData.moderators = [adminUsers[0]._id];
        }
        
        const room = new ChatRoom(roomData);
        await room.save();
        created++;
        console.log(`✅ Created room: ${roomData.slug}`);
      }
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Created: ${created} rooms`);
    console.log(`   Updated: ${updated} rooms`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding chat rooms:', error);
    process.exit(1);
  }
};

seedChatRooms();

