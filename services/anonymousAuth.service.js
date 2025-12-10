import User from '../models/User.model.js';
import { generateToken } from '../utils/generateToken.js';
import crypto from 'crypto';

/**
 * Create or get anonymous user
 */
export const createAnonymousUser = async (displayName, avatarEmoji = '') => {
  // Generate a unique identifier for anonymous user
  const anonymousId = crypto.randomBytes(16).toString('hex');
  const email = `anonymous_${anonymousId}@growable.local`;

  // Check if display name is already taken by anonymous user
  const existingUser = await User.findOne({
    displayName,
    isAnonymous: true,
    email: { $regex: /^anonymous_/ },
  });

  if (existingUser) {
    // Return existing anonymous user
    const token = generateToken(existingUser._id);
    return {
      token,
      user: {
        id: existingUser._id,
        displayName: existingUser.displayName || displayName,
        avatarEmoji: existingUser.avatarEmoji || avatarEmoji,
        isAnonymous: true,
        role: existingUser.role,
      },
    };
  }

  // Create new anonymous user
  const user = await User.create({
    name: displayName,
    displayName,
    email,
    password: crypto.randomBytes(32).toString('hex'), // Random password (won't be used)
    isAnonymous: true,
    avatarEmoji: avatarEmoji || '',
    role: 'parent',
    rulesAccepted: false,
  });

  const token = generateToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      displayName: user.displayName,
      avatarEmoji: user.avatarEmoji,
      isAnonymous: true,
      role: user.role,
    },
  };
};

/**
 * Accept rules for anonymous user
 */
export const acceptRules = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.rulesAccepted = true;
  user.rulesAcceptedAt = new Date();
  await user.save();

  return user;
};

