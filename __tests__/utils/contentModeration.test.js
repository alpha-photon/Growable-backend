import { describe, it, expect } from '@jest/globals';
import {
  checkProhibitedContent,
  checkMedicalClaims,
  validateContentLength,
  sanitizeContent,
  moderateContent,
  generateExcerpt,
} from '../../utils/contentModeration.js';

describe('Content Moderation Utils', () => {
  describe('checkProhibitedContent', () => {
    it('should detect prohibited keywords', () => {
      const result = checkProhibitedContent('This post contains nsfw content');
      expect(result.hasProhibitedContent).toBe(true);
      expect(result.flaggedKeywords).toContain('nsfw');
    });

    it('should pass clean content', () => {
      const result = checkProhibitedContent('This is a clean post about autism support');
      expect(result.hasProhibitedContent).toBe(false);
    });

    it('should detect profanity', () => {
      const result = checkProhibitedContent('This is a stupid post');
      expect(result.hasProhibitedContent).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result = checkProhibitedContent('This post contains NSFW content');
      expect(result.hasProhibitedContent).toBe(true);
    });
  });

  describe('checkMedicalClaims', () => {
    it('should detect medical claims', () => {
      expect(checkMedicalClaims('This treatment can cure autism')).toBe(true);
      expect(checkMedicalClaims('This medicine is guaranteed to work')).toBe(true);
    });

    it('should not flag non-medical content', () => {
      expect(checkMedicalClaims('This is a helpful tip for parents')).toBe(false);
    });
  });

  describe('validateContentLength', () => {
    it('should validate correct lengths', () => {
      const result = validateContentLength(
        'Valid Title with enough characters',
        'This is valid content with enough characters to pass validation requirements.'
      );
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject short title', () => {
      const result = validateContentLength('Short', 'Valid content with enough characters');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be at least 10 characters');
    });

    it('should reject long title', () => {
      const longTitle = 'a'.repeat(201);
      const result = validateContentLength(longTitle, 'Valid content');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title must be less than 200 characters');
    });

    it('should reject short content', () => {
      const result = validateContentLength('Valid Title', 'Short');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content must be at least 50 characters');
    });

    it('should reject long content', () => {
      const longContent = 'a'.repeat(10001);
      const result = validateContentLength('Valid Title', longContent);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Content must be less than 10,000 characters');
    });
  });

  describe('sanitizeContent', () => {
    it('should remove script tags', () => {
      const content = '<script>alert("xss")</script>Safe content';
      const sanitized = sanitizeContent(content);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('should remove event handlers', () => {
      const content = '<div onclick="alert(1)">Content</div>';
      const sanitized = sanitizeContent(content);
      expect(sanitized).not.toContain('onclick');
    });

    it('should preserve safe HTML', () => {
      const content = '<p>Safe paragraph</p><strong>Bold text</strong>';
      const sanitized = sanitizeContent(content);
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });
  });

  describe('moderateContent', () => {
    it('should approve clean content', () => {
      const result = moderateContent(
        'Valid Title with enough characters',
        'This is clean content with enough characters to pass validation requirements.'
      );
      expect(result.approved).toBe(true);
      expect(result.needsReview).toBe(false);
    });

    it('should reject content with prohibited keywords', () => {
      const result = moderateContent(
        'Title with nsfw',
        'This content contains nsfw material. This is a test post content with enough characters to pass validation requirements.'
      );
      expect(result.approved).toBe(false);
    });

    it('should flag content with medical claims', () => {
      const result = moderateContent(
        'Title about treatment',
        'This treatment can cure autism. This is a test post content with enough characters to pass validation requirements.'
      );
      expect(result.approved).toBe(true);
      expect(result.needsReview).toBe(true);
    });

    it('should sanitize content', () => {
      const result = moderateContent(
        'Valid Title',
        '<script>alert("xss")</script>This is a test post content with enough characters to pass validation requirements.'
      );
      expect(result.sanitizedContent).not.toContain('<script>');
    });
  });

  describe('generateExcerpt', () => {
    it('should generate excerpt from content', () => {
      const content = 'This is a long content that should be truncated to create an excerpt for display purposes.';
      const excerpt = generateExcerpt(content, 50);
      expect(excerpt.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(excerpt).toContain('...');
    });

    it('should not truncate short content', () => {
      const content = 'Short content';
      const excerpt = generateExcerpt(content, 50);
      expect(excerpt).toBe(content);
      expect(excerpt).not.toContain('...');
    });

    it('should remove HTML tags from excerpt', () => {
      const content = '<p>This is a <strong>test</strong> content</p>';
      const excerpt = generateExcerpt(content, 50);
      expect(excerpt).not.toContain('<p>');
      expect(excerpt).not.toContain('<strong>');
    });
  });
});

