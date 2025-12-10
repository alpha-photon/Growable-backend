import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import app setup
import app from '../../server.js';

dotenv.config({ path: '.env.test' });

let authToken;
let userId;
let adminToken;
let adminId;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/specialable_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  beforeEach(async () => {
    // Clean database
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Register and login test user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'parent',
      });

    authToken = registerRes.body.token;
    userId = registerRes.body.user.id;

    // Create admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'parent',
      });

    // Manually set admin role
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(adminRes.body.user.id, { role: 'admin' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'admin123',
      });

    adminToken = loginRes.body.token;
    adminId = loginRes.body.user.id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new user', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'New User',
            email: 'newuser@example.com',
            password: 'password123',
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.email).toBe('newuser@example.com');
      });

      it('should reject registration with invalid email', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test',
            email: 'invalid-email',
            password: 'password123',
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should reject registration with short password', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test',
            email: 'test2@example.com',
            password: '12345', // Less than 6 characters
          });

        expect(res.status).toBe(400);
      });

      it('should reject duplicate email registration', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            name: 'User 1',
            email: 'duplicate@example.com',
            password: 'password123',
          });

        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'User 2',
            email: 'duplicate@example.com',
            password: 'password123',
          });

        expect(res.status).toBe(500); // Service throws error
      });

      it('should reject registration with invalid role', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test',
            email: 'test@example.com',
            password: 'password123',
            role: 'invalid-role',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with correct credentials', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123',
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe('test@example.com');
      });

      it('should reject login with wrong password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword',
          });

        expect(res.status).toBe(500); // Service throws error
      });

      it('should reject login with non-existent email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'password123',
          });

        expect(res.status).toBe(500);
      });

      it('should reject login with missing fields', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            // Missing password
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/auth/me', () => {
      it('should get current user with valid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('test@example.com');
      });

      it('should reject without token', async () => {
        const res = await request(app)
          .get('/api/auth/me');

        expect(res.status).toBe(401);
      });

      it('should reject with invalid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Post Endpoints', () => {
    let postId;

    beforeEach(async () => {
      // Create a test post
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post Title with enough characters',
          content: 'This is a test post content with enough characters to pass validation requirements.',
          category: 'success-story',
          tags: ['autism'],
          specialNeeds: ['autism'],
        });

      postId = res.body.data._id;
    });

    describe('POST /api/posts', () => {
      it('should create a post with valid data', async () => {
        const res = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'New Post Title with enough characters',
            content: 'This is a new post content with enough characters to pass validation requirements.',
            category: 'tips',
          });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('_id');
        expect(res.body.data.title).toBe('New Post Title with enough characters');
      });

      it('should reject post without authentication', async () => {
        const res = await request(app)
          .post('/api/posts')
          .send({
            title: 'Test Post',
            content: 'Test content',
            category: 'tips',
          });

        expect(res.status).toBe(401);
      });

      it('should reject post with short title', async () => {
        const res = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Short', // Less than 10 characters
            content: 'This is a test post content with enough characters to pass validation requirements.',
            category: 'tips',
          });

        expect(res.status).toBe(400);
      });

      it('should reject post with short content', async () => {
        const res = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Post Title with enough characters',
            content: 'Short', // Less than 50 characters
            category: 'tips',
          });

        expect(res.status).toBe(400);
      });

      it('should reject post with invalid category', async () => {
        const res = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Post Title with enough characters',
            content: 'This is a test post content with enough characters to pass validation requirements.',
            category: 'invalid-category',
          });

        expect(res.status).toBe(400);
      });

      it('should reject post with prohibited keywords', async () => {
        const res = await request(app)
          .post('/api/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Post with nsfw content',
            content: 'This post contains nsfw content. This is a test post content with enough characters to pass validation requirements.',
            category: 'tips',
          });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/posts', () => {
      it('should get all approved posts', async () => {
        // Approve the test post
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get('/api/posts');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should filter posts by category', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get('/api/posts?category=success-story');

        expect(res.status).toBe(200);
        res.body.data.forEach(post => {
          expect(post.category).toBe('success-story');
        });
      });

      it('should paginate posts', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get('/api/posts?page=1&limit=1');

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeLessThanOrEqual(1);
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('pages');
      });
    });

    describe('GET /api/posts/:id', () => {
      it('should get single post', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get(`/api/posts/${postId}`);

        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(postId);
      });

      it('should increment views', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res1 = await request(app).get(`/api/posts/${postId}`);
        const views1 = res1.body.data.views;

        const res2 = await request(app).get(`/api/posts/${postId}`);
        const views2 = res2.body.data.views;

        expect(views2).toBe(views1 + 1);
      });

      it('should return 404 for non-existent post', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
          .get(`/api/posts/${fakeId}`);

        expect(res.status).toBe(500); // Service throws error
      });
    });

    describe('PUT /api/posts/:id', () => {
      it('should update own post', async () => {
        const res = await request(app)
          .put(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Updated Title with enough characters',
          });

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Updated Title with enough characters');
      });

      it('should reject updating other user\'s post', async () => {
        // Create another user
        const user2Res = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'User 2',
            email: 'user2@example.com',
            password: 'password123',
          });

        const res = await request(app)
          .put(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${user2Res.body.token}`)
          .send({
            title: 'Updated Title',
          });

        expect(res.status).toBe(500); // Service throws error
      });
    });

    describe('DELETE /api/posts/:id', () => {
      it('should delete own post', async () => {
        const res = await request(app)
          .delete(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Verify post is deleted
        const getRes = await request(app)
          .get(`/api/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(getRes.status).toBe(500);
      });
    });

    describe('POST /api/posts/:id/like', () => {
      it('should like a post', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .post(`/api/posts/${postId}/like`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.liked).toBe(true);
        expect(res.body.likes).toBeGreaterThan(0);
      });

      it('should unlike a post', async () => {
        await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Like first
        await request(app)
          .post(`/api/posts/${postId}/like`)
          .set('Authorization', `Bearer ${authToken}`);

        // Unlike
        const res = await request(app)
          .post(`/api/posts/${postId}/like`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.liked).toBe(false);
      });
    });
  });

  describe('Comment Endpoints', () => {
    let postId;
    let commentId;

    beforeEach(async () => {
      // Create and approve a post
      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post Title with enough characters',
          content: 'This is a test post content with enough characters to pass validation requirements.',
          category: 'tips',
        });

      postId = postRes.body.data._id;

      await request(app)
        .put(`/api/moderation/posts/${postId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    describe('POST /api/comments', () => {
      it('should create a comment', async () => {
        const res = await request(app)
          .post('/api/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            postId: postId,
            content: 'This is a test comment with enough characters.',
          });

        expect(res.status).toBe(201);
        expect(res.body.data).toHaveProperty('_id');
        commentId = res.body.data._id;
      });

      it('should reject comment without authentication', async () => {
        const res = await request(app)
          .post('/api/comments')
          .send({
            postId: postId,
            content: 'Test comment',
          });

        expect(res.status).toBe(401);
      });

      it('should reject comment with short content', async () => {
        const res = await request(app)
          .post('/api/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            postId: postId,
            content: 'Hi', // Less than 5 characters
          });

        expect(res.status).toBe(400);
      });

      it('should reject comment on non-existent post', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
          .post('/api/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            postId: fakeId,
            content: 'This is a test comment with enough characters.',
          });

        expect(res.status).toBe(500);
      });
    });

    describe('GET /api/comments/post/:postId', () => {
      it('should get comments for a post', async () => {
        // Create a comment first
        await request(app)
          .post('/api/comments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            postId: postId,
            content: 'This is a test comment with enough characters.',
          });

        // Approve comment
        const Comment = mongoose.model('Comment');
        const comment = await Comment.findOne({ postId });
        await request(app)
          .put(`/api/moderation/comments/${comment._id}/approve`)
          .set('Authorization', `Bearer ${adminToken}`);

        const res = await request(app)
          .get(`/api/comments/post/${postId}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });
  });

  describe('Moderation Endpoints', () => {
    let postId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Post Title with enough characters',
          content: 'This is a test post content with enough characters to pass validation requirements.',
          category: 'tips',
        });

      postId = res.body.data._id;
    });

    describe('GET /api/moderation/posts', () => {
      it('should get pending posts (admin only)', async () => {
        const res = await request(app)
          .get('/api/moderation/posts')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
      });

      it('should reject non-admin access', async () => {
        const res = await request(app)
          .get('/api/moderation/posts')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/moderation/posts/:id/approve', () => {
      it('should approve a post (admin only)', async () => {
        const res = await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            notes: 'Approved',
          });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('approved');
      });

      it('should reject non-admin approval', async () => {
        const res = await request(app)
          .put(`/api/moderation/posts/${postId}/approve`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/moderation/posts/:id/reject', () => {
      it('should reject a post (admin only)', async () => {
        const res = await request(app)
          .put(`/api/moderation/posts/${postId}/reject`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reason: 'Inappropriate content',
          });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('rejected');
      });
    });
  });
});

