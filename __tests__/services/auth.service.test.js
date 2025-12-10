import { describe, it, expect, beforeEach } from '@jest/globals';
import * as authService from '../../services/auth.service.js';
import User from '../../models/User.model.js';
import mongoose from 'mongoose';

describe('Auth Service', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'parent',
      };

      const result = await authService.registerUser(userData);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe('parent');

      // Verify user is saved in database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user.name).toBe('Test User');
    });

    it('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await authService.registerUser(userData);

      const user = await User.findOne({ email: 'test@example.com' }).select('+password');
      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should default role to parent if not provided', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authService.registerUser(userData);
      expect(result.user.role).toBe('parent');
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      await authService.registerUser(userData);

      // Try to register again with same email
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should handle case-insensitive email duplicates', async () => {
      const userData1 = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const userData2 = {
        name: 'Test User 2',
        email: 'TEST@EXAMPLE.COM',
        password: 'password123',
      };

      await authService.registerUser(userData1);
      await expect(authService.registerUser(userData2)).rejects.toThrow();
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await authService.registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should login user with correct credentials', async () => {
      const result = await authService.loginUser('test@example.com', 'password123');

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for incorrect password', async () => {
      await expect(
        authService.loginUser('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.loginUser('nonexistent@example.com', 'password123')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error if user is blocked', async () => {
      const user = await User.findOne({ email: 'test@example.com' });
      user.blocked = true;
      await user.save();

      await expect(
        authService.loginUser('test@example.com', 'password123')
      ).rejects.toThrow('Your account has been blocked');
    });

    it('should handle case-insensitive email', async () => {
      const result = await authService.loginUser('TEST@EXAMPLE.COM', 'password123');
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const { user } = await authService.registerUser(userData);
      const currentUser = await authService.getCurrentUser(user.id);

      expect(currentUser.email).toBe('test@example.com');
      expect(currentUser.name).toBe('Test User');
    });

    it('should throw error if user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(authService.getCurrentUser(fakeId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const { user } = await authService.registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      const updated = await authService.updateUserProfile(user.id, updateData);

      expect(updated.name).toBe('Updated Name');
      expect(updated.bio).toBe('Updated bio');
    });

    it('should update only provided fields', async () => {
      const { user } = await authService.registerUser({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

      const updateData = {
        name: 'Updated Name',
      };

      const updated = await authService.updateUserProfile(user.id, updateData);

      expect(updated.name).toBe('Updated Name');
      // Email should remain unchanged
      expect(updated.email).toBe('test@example.com');
    });

    it('should throw error if user not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        authService.updateUserProfile(fakeId, { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });
  });
});

