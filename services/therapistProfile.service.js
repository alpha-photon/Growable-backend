import TherapistProfile from '../models/TherapistProfile.model.js';
import User from '../models/User.model.js';
import Review from '../models/Review.model.js';
import Appointment from '../models/Appointment.model.js';
import * as notificationService from './notification.service.js';

/**
 * Create or update therapist profile
 */
export const createOrUpdateProfile = async (userId, profileData) => {
  // Verify user is therapist or doctor
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!['therapist', 'doctor'].includes(user.role)) {
    throw new Error('Only therapists and doctors can create profiles');
  }

  // Check if profile exists
  let profile = await TherapistProfile.findOne({ userId });

  if (profile) {
    // Update existing profile
    Object.keys(profileData).forEach((key) => {
      if (profileData[key] !== undefined) {
        profile[key] = profileData[key];
      }
    });
    await profile.save();
  } else {
    // Create new profile
    profile = new TherapistProfile({
      userId,
      ...profileData,
    });
    await profile.save();
  }

  return await profile.populate('userId', 'name email avatar role');
};

/**
 * Get therapist profile by userId
 */
export const getProfileByUserId = async (userId) => {
  const profile = await TherapistProfile.findOne({ userId, isActive: true })
    .populate('userId', 'name email avatar role verified')
    .lean();

  if (!profile) {
    throw new Error('Therapist profile not found');
  }

  // Calculate stats
  const stats = await calculateProfileStats(userId);
  return { ...profile, stats };
};

/**
 * Get therapist profile by profile ID
 */
export const getProfileById = async (profileId) => {
  const profile = await TherapistProfile.findById(profileId)
    .populate('userId', 'name email avatar role verified')
    .populate('verifiedBy', 'name email')
    .lean();

  if (!profile) {
    throw new Error('Therapist profile not found');
  }

  const stats = await calculateProfileStats(profile.userId._id);
  return { ...profile, stats };
};

/**
 * Search therapists with filters
 */
export const searchTherapists = async (filters = {}, options = {}) => {
  const {
    specializations,
    city,
    state,
    consultationType,
    minRating,
    isVerified,
    searchQuery,
    page = 1,
    limit = 20,
  } = filters;

  const { sortBy = 'averageRating', sortOrder = -1 } = options;

  const query = { isActive: true };

  // Specializations filter
  if (specializations && specializations.length > 0) {
    query.specializations = { $in: specializations };
  }

  // Location filter
  if (city) {
    query['location.city'] = new RegExp(city, 'i');
  }
  if (state) {
    query['location.state'] = new RegExp(state, 'i');
  }

  // Consultation type
  if (consultationType) {
    if (consultationType === 'online') {
      query.consultationType = { $in: ['online', 'both'] };
    } else if (consultationType === 'offline') {
      query.consultationType = { $in: ['offline', 'both'] };
    }
  }

  // Rating filter
  if (minRating) {
    query.averageRating = { $gte: minRating };
  }

  // Verification filter
  if (isVerified !== undefined) {
    query.isVerified = isVerified;
  }

  // Text search - search in name, bio, and specializations
  // If searchQuery is "doctor" or "therapist", we need to handle it specially
  let searchLower = '';
  if (searchQuery) {
    searchLower = searchQuery.toLowerCase().trim();
  }

  if (searchQuery && !['doctor', 'therapist', 'dr.', 'dr'].includes(searchLower)) {
    const searchRegex = new RegExp(searchQuery, 'i');
    query.$or = [
      { 'userId.name': searchRegex },
      { professionalBio: searchRegex },
      { specializations: { $in: [searchRegex] } },
    ];
  }

  const skip = (page - 1) * limit;

  // Get all profiles - we'll filter by role after populating
  let profiles = await TherapistProfile.find(query)
    .populate('userId', 'name email avatar role verified')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit * 5) // Get more to filter by role
    .lean();

  // Filter by role if searchQuery is a role keyword
  if (searchQuery) {
    if (searchLower === 'doctor' || searchLower === 'dr' || searchLower === 'dr.') {
      profiles = profiles.filter((p) => p.userId?.role === 'doctor');
    } else if (searchLower === 'therapist') {
      profiles = profiles.filter((p) => p.userId?.role === 'therapist');
    }
  }

  // Limit to requested limit after filtering
  profiles = profiles.slice(0, limit);

  const total = await TherapistProfile.countDocuments(query);

  return {
    profiles,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Verify therapist profile (admin only)
 */
export const verifyProfile = async (profileId, adminId, verificationNotes) => {
  const profile = await TherapistProfile.findById(profileId);
  if (!profile) {
    throw new Error('Profile not found');
  }

  profile.isVerified = true;
  profile.verifiedAt = new Date();
  profile.verifiedBy = adminId;
  if (verificationNotes) {
    profile.verificationNotes = verificationNotes;
  }

  await profile.save();

  // Update user verified status
  await User.findByIdAndUpdate(profile.userId, { verified: true });

  // Send notification to therapist
  try {
    await notificationService.notifyProfileVerified(
      profile.userId,
      profile._id
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't fail the verification if notification fails
  }

  return profile;
};

/**
 * Calculate profile statistics
 */
const calculateProfileStats = async (userId) => {
  const [reviews, appointments] = await Promise.all([
    Review.find({ therapistId: userId, status: 'approved' }),
    Appointment.find({ therapistId: userId }),
  ]);

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (a) => a.status === 'completed'
  ).length;

  return {
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
    totalAppointments,
    completedAppointments,
  };
};

/**
 * Get available time slots for a therapist on a specific date
 */
export const getAvailableSlots = async (therapistId, date) => {
  const profile = await TherapistProfile.findOne({ userId: therapistId });
  if (!profile) {
    throw new Error('Therapist profile not found');
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];

  const workingHours = profile.workingHours[dayName];
  if (!workingHours || !workingHours.available) {
    return [];
  }

  // Get existing appointments for this date
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await Appointment.find({
    therapistId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['pending', 'confirmed'] },
  });

  const bookedSlots = existingAppointments.map((apt) => apt.appointmentTime);

  // Generate available slots
  const [startHour, startMinute] = workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = workingHours.end.split(':').map(Number);

  const slots = [];
  const slotDuration = profile.sessionDuration || 60;

  let currentHour = startHour;
  let currentMinute = startMinute;

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMinute < endMinute)
  ) {
    const slotTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Check if slot is not booked
    if (!bookedSlots.includes(slotTime)) {
      slots.push(slotTime);
    }

    // Move to next slot
    currentMinute += slotDuration;
    while (currentMinute >= 60) {
      currentMinute -= 60;
      currentHour += 1;
    }
  }

  return slots;
};

