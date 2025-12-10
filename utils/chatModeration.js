import Filter from 'bad-words';
import { checkMedicalClaims } from './contentModeration.js';

// Initialize bad words filter
const filter = new Filter();

// Medical keywords that should flag messages for review
const MEDICAL_KEYWORDS = [
  'cure', 'treatment', 'medicine', 'drug', 'prescription',
  'diagnosis', 'diagnose', 'symptom', 'therapy', 'therapist',
  'doctor', 'physician', 'medical advice', 'clinical',
  'guaranteed', '100% effective', 'miracle', 'heal', 'remedy',
  'medication', 'dosage', 'side effect', 'allergy',
];

// Rate limiting storage (in-memory, could be Redis in production)
const messageRateLimits = new Map(); // userId -> { count, resetAt }

/**
 * Check for profanity in message
 */
export const checkProfanity = (text) => {
  return filter.isProfane(text);
};

/**
 * Check for medical keywords that need moderation review
 */
export const checkMedicalKeywords = (text) => {
  const lowerText = text.toLowerCase();
  const flaggedKeywords = [];

  for (const keyword of MEDICAL_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      flaggedKeywords.push(keyword);
    }
  }

  return {
    hasMedicalKeywords: flaggedKeywords.length > 0,
    flaggedKeywords,
  };
};

/**
 * Rate limit messages per user
 * @param {string} userId - User ID
 * @param {number} maxMessages - Maximum messages allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit status
 */
export const checkRateLimit = (userId, maxMessages = 5, windowMs = 10000) => {
  const now = Date.now();
  const userLimit = messageRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Reset or initialize
    messageRateLimits.set(userId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxMessages - 1,
      resetAt: now + windowMs,
    };
  }

  if (userLimit.count >= maxMessages) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: userLimit.resetAt,
      message: `Rate limit exceeded. Please wait ${Math.ceil((userLimit.resetAt - now) / 1000)} seconds.`,
    };
  }

  userLimit.count += 1;
  messageRateLimits.set(userId, userLimit);

  return {
    allowed: true,
    remaining: maxMessages - userLimit.count,
    resetAt: userLimit.resetAt,
  };
};

/**
 * Comprehensive message moderation
 */
export const moderateMessage = (content, userId) => {
  const result = {
    approved: true,
    needsReview: false,
    flaggedReason: null,
    flaggedKeywords: [],
    sanitizedContent: content.trim(),
  };

  // Check rate limit
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return {
      approved: false,
      needsReview: false,
      flaggedReason: 'rate_limit',
      message: rateLimit.message,
    };
  }

  // Check profanity
  if (checkProfanity(content)) {
    result.approved = false;
    result.needsReview = true;
    result.flaggedReason = 'profanity';
    result.flaggedKeywords.push('profanity');
  }

  // Check medical keywords
  const medicalCheck = checkMedicalKeywords(content);
  if (medicalCheck.hasMedicalKeywords) {
    result.needsReview = true;
    if (!result.flaggedReason) {
      result.flaggedReason = 'medical_advice';
    }
    result.flaggedKeywords.push(...medicalCheck.flaggedKeywords);
  }

  // Basic sanitization (remove script tags, etc.)
  result.sanitizedContent = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();

  return result;
};

/**
 * Clear rate limit for user (used when mute/ban is lifted)
 */
export const clearRateLimit = (userId) => {
  messageRateLimits.delete(userId);
};

/**
 * Clear all expired rate limits (cleanup function)
 */
export const clearExpiredRateLimits = () => {
  const now = Date.now();
  for (const [userId, limit] of messageRateLimits.entries()) {
    if (now > limit.resetAt) {
      messageRateLimits.delete(userId);
    }
  }
};

// Clean up expired rate limits every 5 minutes
setInterval(clearExpiredRateLimits, 5 * 60 * 1000);

