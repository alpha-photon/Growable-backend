import { describe, it, expect, beforeEach } from '@jest/globals';
import * as postService from '../../services/post.service.js';
import * as authService from '../../services/auth.service.js';
import Post from '../../models/Post.model.js';
import User from '../../models/User.model.js';
import mongoose from 'mongoose';

describe('Post Service', () => {
  let testUser;
  let testUserId;

  beforeEach(async () => {
    await Post.deleteMany({});
    await User.deleteMany({});

    // Create test user
    const result = await authService.registerUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'parent',
    });
    testUser = result.user;
    testUserId = result.user.id;
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const postData = {
        title: 'Test Post Title with enough characters',
        content: 'This is a test post content with enough characters to pass validation requirements.',
        category: 'success-story',
        tags: ['autism'],
        specialNeeds: ['autism'],
      };

      const result = await postService.createPost(postData, testUserId);

      expect(result.post).toHaveProperty('_id');
      expect(result.post.title).toBe(postData.title);
      expect(result.post.category).toBe('success-story');
      expect(result.post.status).toBe('pending');
    });

    it('should auto-generate excerpt if not provided', async () => {
      const postData = {
        title: 'Test Post Title with enough characters',
        content: 'This is a test post content with enough characters to pass validation requirements. '.repeat(10),
        category: 'tips',
      };

      const result = await postService.createPost(postData, testUserId);
      expect(result.post.excerpt).toBeTruthy();
      expect(result.post.excerpt.length).toBeLessThanOrEqual(153); // 150 + '...'
    });

    it('should sanitize content to prevent XSS', async () => {
      const postData = {
        title: 'Test Post',
        content: '<script>alert("xss")</script>This is a test post content with enough characters to pass validation requirements.',
        category: 'tips',
      };

      const result = await postService.createPost(postData, testUserId);
      expect(result.post.content).not.toContain('<script>');
    });

    it('should set status to pending if content needs review', async () => {
      const postData = {
        title: 'Test Post with medical claims',
        content: 'This treatment can cure autism. This is a test post content with enough characters to pass validation requirements.',
        category: 'tips',
      };

      const result = await postService.createPost(postData, testUserId);
      expect(result.post.status).toBe('pending');
      expect(result.message).toContain('review');
    });

    it('should reject post with prohibited keywords', async () => {
      const postData = {
        title: 'Test Post with bad words',
        content: 'This post contains nsfw content. This is a test post content with enough characters to pass validation requirements.',
        category: 'tips',
      };

      await expect(postService.createPost(postData, testUserId)).rejects.toThrow();
    });

    it('should increment user post count', async () => {
      const postData = {
        title: 'Test Post Title with enough characters',
        content: 'This is a test post content with enough characters to pass validation requirements.',
        category: 'tips',
      };

      const userBefore = await User.findById(testUserId);
      const initialCount = userBefore.postsCount;

      await postService.createPost(postData, testUserId);

      const userAfter = await User.findById(testUserId);
      expect(userAfter.postsCount).toBe(initialCount + 1);
    });

    it('should throw error if author not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const postData = {
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      };

      await expect(postService.createPost(postData, fakeId)).rejects.toThrow('Author not found');
    });
  });

  describe('getPosts', () => {
    beforeEach(async () => {
      // Create multiple posts
      for (let i = 0; i < 5; i++) {
        await postService.createPost({
          title: `Test Post ${i} with enough characters`,
          content: `Test content ${i} with enough characters to pass validation requirements.`,
          category: i % 2 === 0 ? 'success-story' : 'tips',
          specialNeeds: ['autism'],
        }, testUserId);
      }

      // Approve some posts
      await Post.updateMany({}, { status: 'approved', publishedAt: new Date() });
    });

    it('should get all approved posts', async () => {
      const { posts } = await postService.getPosts({}, { page: 1, limit: 10 });

      expect(posts.length).toBeGreaterThan(0);
      posts.forEach(post => {
        expect(post.status).toBe('approved');
      });
    });

    it('should filter by category', async () => {
      const { posts } = await postService.getPosts(
        { category: 'success-story' },
        { page: 1, limit: 10 }
      );

      posts.forEach(post => {
        expect(post.category).toBe('success-story');
      });
    });

    it('should filter by special needs', async () => {
      const { posts } = await postService.getPosts(
        { specialNeeds: 'autism' },
        { page: 1, limit: 10 }
      );

      posts.forEach(post => {
        expect(post.specialNeeds).toContain('autism');
      });
    });

    it('should paginate results', async () => {
      const page1 = await postService.getPosts({}, { page: 1, limit: 2 });
      const page2 = await postService.getPosts({}, { page: 2, limit: 2 });

      expect(page1.posts.length).toBeLessThanOrEqual(2);
      expect(page2.posts.length).toBeLessThanOrEqual(2);
      expect(page1.pagination.page).toBe(1);
      expect(page2.pagination.page).toBe(2);
    });

    it('should sort by latest by default', async () => {
      const { posts } = await postService.getPosts({}, { page: 1, limit: 10, sort: 'latest' });

      for (let i = 0; i < posts.length - 1; i++) {
        const date1 = new Date(posts[i].createdAt);
        const date2 = new Date(posts[i + 1].createdAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should sort by popular', async () => {
      // Create posts with different likes
      const post1 = await Post.create({
        authorId: testUserId,
        authorName: 'Test',
        authorRole: 'parent',
        title: 'Popular Post',
        content: 'Content with enough characters',
        category: 'tips',
        status: 'approved',
        likes: 10,
        publishedAt: new Date(),
      });

      const post2 = await Post.create({
        authorId: testUserId,
        authorName: 'Test',
        authorRole: 'parent',
        title: 'Less Popular Post',
        content: 'Content with enough characters',
        category: 'tips',
        status: 'approved',
        likes: 5,
        publishedAt: new Date(),
      });

      const { posts } = await postService.getPosts({}, { page: 1, limit: 10, sort: 'popular' });

      // First post should have more likes
      expect(posts[0].likes).toBeGreaterThanOrEqual(posts[1].likes);
    });
  });

  describe('getPostById', () => {
    it('should get post by ID', async () => {
      const postData = {
        title: 'Test Post Title with enough characters',
        content: 'Test content with enough characters',
        category: 'tips',
      };

      const { post } = await postService.createPost(postData, testUserId);
      const retrieved = await postService.getPostById(post._id);

      expect(retrieved._id.toString()).toBe(post._id.toString());
      expect(retrieved.title).toBe(postData.title);
    });

    it('should increment views', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved' });

      const initialViews = (await Post.findById(post._id)).views;
      await postService.getPostById(post._id);
      const afterViews = (await Post.findById(post._id)).views;

      expect(afterViews).toBe(initialViews + 1);
    });

    it('should throw error if post not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(postService.getPostById(fakeId)).rejects.toThrow('Post not found');
    });

    it('should allow author to view their own draft posts', async () => {
      const { post } = await postService.createPost({
        title: 'Draft Post',
        content: 'Test content with enough characters',
        category: 'tips',
        status: 'draft',
      }, testUserId);

      const retrieved = await postService.getPostById(post._id, testUserId);
      expect(retrieved._id.toString()).toBe(post._id.toString());
    });

    it('should not allow non-author to view draft posts', async () => {
      const { post } = await postService.createPost({
        title: 'Draft Post',
        content: 'Test content with enough characters',
        category: 'tips',
        status: 'draft',
      }, testUserId);

      const otherUserId = new mongoose.Types.ObjectId();
      await expect(postService.getPostById(post._id, otherUserId)).rejects.toThrow('Post not available');
    });
  });

  describe('updatePost', () => {
    it('should update post successfully', async () => {
      const { post } = await postService.createPost({
        title: 'Original Title with enough characters',
        content: 'Original content with enough characters',
        category: 'tips',
      }, testUserId);

      const updateData = {
        title: 'Updated Title with enough characters',
      };

      const updated = await postService.updatePost(post._id, updateData, testUserId, 'parent');
      expect(updated.title).toBe('Updated Title with enough characters');
    });

    it('should throw error if not authorized', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      const otherUserId = new mongoose.Types.ObjectId();
      await expect(
        postService.updatePost(post._id, { title: 'Updated' }, otherUserId, 'parent')
      ).rejects.toThrow('Not authorized');
    });

    it('should allow admin to update any post', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      const adminId = new mongoose.Types.ObjectId();
      const updated = await postService.updatePost(post._id, { title: 'Admin Updated' }, adminId, 'admin');
      expect(updated.title).toBe('Admin Updated');
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await postService.deletePost(post._id, testUserId, 'parent');

      const deleted = await Post.findById(post._id);
      expect(deleted).toBeNull();
    });

    it('should decrement user post count', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      const userBefore = await User.findById(testUserId);
      const countBefore = userBefore.postsCount;

      await postService.deletePost(post._id, testUserId, 'parent');

      const userAfter = await User.findById(testUserId);
      expect(userAfter.postsCount).toBe(countBefore - 1);
    });
  });

  describe('togglePostLike', () => {
    it('should like a post', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved' });

      const result = await postService.togglePostLike(post._id, testUserId);
      expect(result.liked).toBe(true);
      expect(result.likes).toBe(1);
    });

    it('should unlike a post', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved', likes: 1, likedBy: [testUserId] });

      const result = await postService.togglePostLike(post._id, testUserId);
      expect(result.liked).toBe(false);
      expect(result.likes).toBe(0);
    });
  });

  describe('flagPost', () => {
    it('should flag a post', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved' });

      const result = await postService.flagPost(post._id, testUserId);
      expect(result.message).toContain('flagged');

      const updated = await Post.findById(post._id);
      expect(updated.flaggedCount).toBe(1);
    });

    it('should auto-flag if 3+ users flag', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved' });

      // Flag by 3 different users
      for (let i = 0; i < 3; i++) {
        const userId = new mongoose.Types.ObjectId();
        await Post.findByIdAndUpdate(post._id, {
          $push: { flaggedBy: userId },
          $inc: { flaggedCount: 1 },
        });
      }

      const updated = await Post.findById(post._id);
      expect(updated.status).toBe('flagged');
    });

    it('should throw error if already flagged by user', async () => {
      const { post } = await postService.createPost({
        title: 'Test Post',
        content: 'Test content with enough characters',
        category: 'tips',
      }, testUserId);

      await Post.findByIdAndUpdate(post._id, { status: 'approved' });

      await postService.flagPost(post._id, testUserId);
      await expect(postService.flagPost(post._id, testUserId)).rejects.toThrow('already flagged');
    });
  });
});

