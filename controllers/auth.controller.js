import * as authService from '../services/auth.service.js';
import * as anonymousAuthService from '../services/anonymousAuth.service.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const result = await authService.registerUser({ name, email, password, role });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.loginUser(email, password);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user._id);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const user = await authService.updateUserProfile(req.user._id, req.body);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        postsCount: user.postsCount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create anonymous user session
 * @route   POST /api/auth/anonymous
 * @access  Public
 */
export const createAnonymous = async (req, res, next) => {
  try {
    const { displayName, avatarEmoji = '' } = req.body;

    if (!displayName || displayName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Display name must be at least 2 characters',
      });
    }

    const result = await anonymousAuthService.createAnonymousUser(displayName.trim(), avatarEmoji);

    // Set HttpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept community rules
 * @route   POST /api/auth/accept-rules
 * @access  Private
 */
export const acceptRules = async (req, res, next) => {
  try {
    const user = await anonymousAuthService.acceptRules(req.user._id);

    res.json({
      success: true,
      message: 'Rules accepted successfully',
      user: {
        id: user._id,
        rulesAccepted: user.rulesAccepted,
        rulesAcceptedAt: user.rulesAcceptedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

