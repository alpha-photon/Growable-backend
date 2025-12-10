import User from '../models/User.model.js';
import Post from '../models/Post.model.js';
import Comment from '../models/Comment.model.js';
import Appointment from '../models/Appointment.model.js';
import Child from '../models/Child.model.js';
import ChatRoom from '../models/ChatRoom.model.js';
import ChatMessage from '../models/ChatMessage.model.js';
import TherapistProfile from '../models/TherapistProfile.model.js';

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalPosts,
    totalComments,
    totalAppointments,
    totalChildren,
    totalChatRooms,
    pendingPosts,
    pendingComments,
    flaggedMessages,
    usersByRole,
    activeUsers24h,
    activeUsers7d,
    activeUsers30d,
  ] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Comment.countDocuments(),
    Appointment.countDocuments(),
    Child.countDocuments(),
    ChatRoom.countDocuments(),
    Post.countDocuments({ status: 'pending' }),
    Comment.countDocuments({ status: 'pending' }),
    ChatMessage.countDocuments({ isFlagged: true, needsReview: true }),
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]),
    User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
    User.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  return {
    totalUsers,
    totalPosts,
    totalComments,
    totalAppointments,
    totalChildren,
    totalChatRooms,
    pendingPosts,
    pendingComments,
    flaggedMessages,
    usersByRole: usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    activeUsers24h,
    activeUsers7d,
    activeUsers30d,
  };
};

/**
 * Get analytics data
 */
export const getAnalytics = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [userGrowth, postGrowth, engagement] = await Promise.all([
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]),
    Post.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'approved',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]),
    Post.aggregate([
      {
        $match: {
          status: 'approved',
        },
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: '$likes' },
          totalComments: { $sum: '$commentsCount' },
          totalViews: { $sum: '$views' },
        },
      },
    ]),
  ]);

  return {
    userGrowth: userGrowth.map((item) => ({
      date: item._id,
      count: item.count,
    })),
    postGrowth: postGrowth.map((item) => ({
      date: item._id,
      count: item.count,
    })),
    engagement: engagement[0] || {
      totalLikes: 0,
      totalComments: 0,
      totalViews: 0,
    },
  };
};

/**
 * Get all users with filters
 */
export const getAllUsers = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, role, search, blocked } = filters;
  const skip = (page - 1) * limit;

  const query = {};

  if (role) {
    query.role = role;
  }

  if (blocked !== undefined) {
    query.blocked = blocked === 'true';
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Update user
 */
export const updateUser = async (userId, updateData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Block user
 */
export const blockUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { blocked: true } },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Unblock user
 */
export const unblockUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { blocked: false } },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Delete user
 */
export const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return { message: 'User deleted successfully' };
};

/**
 * Get all posts with filters
 */
export const getAllPosts = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, status, search } = filters;
  const skip = (page - 1) * limit;

  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }

  const [posts, total] = await Promise.all([
    Post.find(query)
      .populate('authorId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(query),
  ]);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all comments with filters
 */
export const getAllComments = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, status } = filters;
  const skip = (page - 1) * limit;

  const query = {};

  if (status) {
    query.status = status;
  }

  const [comments, total] = await Promise.all([
    Comment.find(query)
      .populate('authorId', 'name email role')
      .populate('postId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(query),
  ]);

  return {
    comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all chat rooms
 */
export const getAllChatRooms = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const [rooms, total] = await Promise.all([
    ChatRoom.find({})
      .populate('moderators', 'name email')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatRoom.countDocuments(),
  ]);

  return {
    rooms,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all chat messages with filters
 */
export const getAllChatMessages = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, roomId, flagged } = filters;
  const skip = (page - 1) * limit;

  const query = { isDeleted: false };

  if (roomId) {
    query.room = roomId;
  }

  if (flagged === 'true') {
    query.isFlagged = true;
    query.needsReview = true;
  }

  const [messages, total] = await Promise.all([
    ChatMessage.find(query)
      .populate('user', 'name email role')
      .populate('room', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChatMessage.countDocuments(query),
  ]);

  return {
    messages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all appointments
 */
export const getAllAppointments = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, status } = filters;
  const skip = (page - 1) * limit;

  const query = {};

  if (status) {
    query.status = status;
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate('therapistId', 'name email')
      .populate('patientId', 'name email')
      .populate('childId', 'name')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query),
  ]);

  return {
    appointments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all children
 */
export const getAllChildren = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const [children, total] = await Promise.all([
    Child.find({})
      .populate('parentId', 'name email')
      .populate('primaryDoctor', 'name email')
      .populate('primaryTherapist', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Child.countDocuments(),
  ]);

  return {
    children,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all therapist profiles with filters
 */
export const getAllTherapistProfiles = async (filters = {}, options = {}) => {
  const { page = 1, limit = 20, isVerified, search, role } = filters;
  const skip = (page - 1) * limit;

  const query = {};

  if (isVerified !== undefined) {
    query.isVerified = isVerified === 'true';
  }

  // Build user query for role and search
  const userQuery = { role: { $in: ['therapist', 'doctor'] } };
  
  if (role) {
    userQuery.role = role;
  }

  if (search) {
    userQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // If we have role or search, filter by userId
  if (role || search) {
    const users = await User.find(userQuery).select('_id');
    if (users.length > 0) {
      query.userId = { $in: users.map(u => u._id) };
    } else {
      // No users found, return empty result
      return {
        profiles: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }
  }

  const [profiles, total] = await Promise.all([
    TherapistProfile.find(query)
      .populate('userId', 'name email role avatar')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    TherapistProfile.countDocuments(query),
  ]);

  return {
    profiles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get therapist profile by ID
 */
export const getTherapistProfileById = async (profileId) => {
  const profile = await TherapistProfile.findById(profileId)
    .populate('userId', 'name email role avatar')
    .populate('verifiedBy', 'name email');
  
  if (!profile) {
    throw new Error('Therapist profile not found');
  }
  
  return profile;
};

/**
 * Unverify therapist profile
 */
export const unverifyProfile = async (profileId, adminId, reason) => {
  const profile = await TherapistProfile.findById(profileId);
  
  if (!profile) {
    throw new Error('Therapist profile not found');
  }

  profile.isVerified = false;
  profile.verifiedAt = null;
  profile.verifiedBy = null;
  if (reason) {
    profile.verificationNotes = reason;
  }

  await profile.save();
  return await profile.populate('userId', 'name email role avatar');
};

/**
 * Bulk approve posts
 */
export const bulkApprovePosts = async (postIds, adminId, notes) => {
  const result = await Post.updateMany(
    { _id: { $in: postIds } },
    {
      $set: {
        status: 'approved',
        publishedAt: new Date(),
        moderationNotes: notes || '',
      },
    }
  );
  return result;
};

/**
 * Bulk reject posts
 */
export const bulkRejectPosts = async (postIds, adminId, reason) => {
  const result = await Post.updateMany(
    { _id: { $in: postIds } },
    {
      $set: {
        status: 'rejected',
        moderationNotes: reason || '',
      },
    }
  );
  return result;
};

/**
 * Bulk approve comments
 */
export const bulkApproveComments = async (commentIds) => {
  const result = await Comment.updateMany(
    { _id: { $in: commentIds } },
    { $set: { status: 'approved' } }
  );
  return result;
};

/**
 * Bulk reject comments
 */
export const bulkRejectComments = async (commentIds) => {
  const result = await Comment.updateMany(
    { _id: { $in: commentIds } },
    { $set: { status: 'rejected' } }
  );
  return result;
};

/**
 * Bulk block users
 */
export const bulkBlockUsers = async (userIds) => {
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { blocked: true } }
  );
  return result;
};

/**
 * Bulk unblock users
 */
export const bulkUnblockUsers = async (userIds) => {
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: { blocked: false } }
  );
  return result;
};

/**
 * Export users to CSV format
 */
export const exportUsers = async (filters = {}) => {
  const query = {};
  
  if (filters.role) {
    query.role = filters.role;
  }
  
  if (filters.blocked !== undefined) {
    query.blocked = filters.blocked === 'true';
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .lean();

  // Convert to CSV format
  const headers = ['Name', 'Email', 'Role', 'Verified', 'Blocked', 'Posts Count', 'Created At'];
  const rows = users.map(user => [
    user.name || '',
    user.email || '',
    user.role || '',
    user.verified ? 'Yes' : 'No',
    user.blocked ? 'Yes' : 'No',
    user.postsCount || 0,
    new Date(user.createdAt).toISOString(),
  ]);

  return { headers, rows };
};

/**
 * Export posts to CSV format
 */
export const exportPosts = async (filters = {}) => {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  const posts = await Post.find(query)
    .populate('authorId', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  const headers = ['Title', 'Author', 'Category', 'Status', 'Likes', 'Views', 'Comments', 'Created At'];
  const rows = posts.map(post => [
    post.title || '',
    post.authorName || post.authorId?.name || '',
    post.category || '',
    post.status || '',
    post.likes || 0,
    post.views || 0,
    post.commentsCount || 0,
    new Date(post.createdAt).toISOString(),
  ]);

  return { headers, rows };
};

