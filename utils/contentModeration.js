import Filter from 'bad-words';

// Initialize bad words filter
const filter = new Filter();

// Prohibited keywords (NSFW, spam, etc.)
const PROHIBITED_KEYWORDS = [
  'nsfw', 'porn', 'xxx', 'adult', 'explicit',
  'hate', 'kill', 'die', 'stupid', 'idiot',
  'buy now', 'click here', 'free money', 'get rich',
];

// Medical claim keywords (requires review)
const MEDICAL_CLAIM_KEYWORDS = [
  'cure', 'treatment', 'medicine', 'drug', 'therapy',
  'diagnosis', 'prescription', 'doctor', 'medical advice',
  'guaranteed', '100% effective', 'miracle',
];

/**
 * Check for prohibited content
 */
export const checkProhibitedContent = (text) => {
  const lowerText = text.toLowerCase();
  const flaggedKeywords = [];

  // Check prohibited keywords
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      flaggedKeywords.push(keyword);
    }
  }

  // Check for bad words
  if (filter.isProfane(text)) {
    flaggedKeywords.push('profanity');
  }

  return {
    hasProhibitedContent: flaggedKeywords.length > 0,
    flaggedKeywords,
  };
};

/**
 * Check for medical claims
 */
export const checkMedicalClaims = (text) => {
  const lowerText = text.toLowerCase();
  return MEDICAL_CLAIM_KEYWORDS.some(keyword =>
    lowerText.includes(keyword.toLowerCase())
  );
};

/**
 * Validate content length
 */
export const validateContentLength = (title, content) => {
  const errors = [];

  if (!title || title.length < 10) {
    errors.push('Title must be at least 10 characters');
  }
  if (title && title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  if (!content || content.length < 50) {
    errors.push('Content must be at least 50 characters');
  }
  if (content && content.length > 10000) {
    errors.push('Content must be less than 10,000 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize HTML content (basic XSS prevention)
 */
export const sanitizeContent = (content) => {
  // Remove script tags
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  return sanitized;
};

/**
 * Comprehensive moderation check
 */
export const moderateContent = (title, content) => {
  // Validate length
  const lengthCheck = validateContentLength(title, content);
  if (!lengthCheck.valid) {
    return {
      approved: false,
      needsReview: false,
      reason: lengthCheck.errors.join(', '),
    };
  }

  // Sanitize content
  const sanitizedTitle = sanitizeContent(title);
  const sanitizedContent = sanitizeContent(content);

  // Check prohibited content
  const fullText = `${sanitizedTitle} ${sanitizedContent}`;
  const prohibitedCheck = checkProhibitedContent(fullText);

  if (prohibitedCheck.hasProhibitedContent) {
    return {
      approved: false,
      needsReview: true,
      reason: `Content contains inappropriate keywords: ${prohibitedCheck.flaggedKeywords.join(', ')}`,
      flaggedKeywords: prohibitedCheck.flaggedKeywords,
    };
  }

  // Check for medical claims
  const hasMedicalClaims = checkMedicalClaims(fullText);

  return {
    approved: true,
    needsReview: hasMedicalClaims,
    reason: hasMedicalClaims
      ? 'Content contains medical claims and will be reviewed by moderators'
      : undefined,
    sanitizedTitle,
    sanitizedContent,
  };
};

/**
 * Generate excerpt from content
 */
export const generateExcerpt = (content, maxLength = 150) => {
  // Remove HTML tags
  const textOnly = content.replace(/<[^>]*>/g, '');

  if (textOnly.length <= maxLength) {
    return textOnly;
  }

  return textOnly.substring(0, maxLength).trim() + '...';
};

