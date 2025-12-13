import express from 'express';
import upload from '../middleware/upload.middleware.js';
import { protect } from '../middleware/auth.middleware.js';
import FileUpload from '../models/FileUpload.model.js';
import FormData from 'form-data';
import axios from 'axios';
import path from 'path';

const router = express.Router();

// S3 Upload API Configuration
const S3_UPLOAD_API_URL = 'https://api.apexcode.in/core-be/api/s3/upload';
const DEFAULT_BUCKET_KEY = 'erp-dev-institute';

/**
 * Upload file to S3 via API
 */
const uploadToS3 = async (file, options = {}) => {
  const {
    bucketKey = DEFAULT_BUCKET_KEY,
    folder = 'uploads',
    filename = null,
    refreshToken = null,
  } = options;

  const formData = new FormData();
  formData.append('bucketKey', bucketKey);
  formData.append('folder', folder);
  formData.append('filename', filename || file.originalname);
  formData.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const headers = {
    ...formData.getHeaders(),
    accept: '*/*',
  };

  // Add refreshToken cookie if provided
  if (refreshToken) {
    headers.Cookie = `refreshToken=${refreshToken}`;
  }

  const response = await axios.post(S3_UPLOAD_API_URL, formData, {
    headers,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return response.data;
};

/**
 * Determine folder based on upload context
 */
const getFolderForContext = (context = 'other') => {
  const folderMap = {
    post: 'posts',
    message: 'messages',
    profile: 'profiles',
    'institute-logo': 'institute-logos',
    resource: 'resources',
    'session-note': 'session-notes',
    other: 'uploads',
  };
  return folderMap[context] || 'uploads';
};

/**
 * @route   POST /api/upload/image
 * @desc    Upload single image to S3
 * @access  Private
 */
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Get upload context from query params or body
    const uploadContext = req.query.context || req.body.context || 'other';
    const folder = getFolderForContext(uploadContext);
    
    // Generate unique filename
    const fileExt = path.extname(req.file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

    // Get refreshToken from cookies
    const refreshToken = req.cookies?.refreshToken || null;

    // Upload to S3
    let fileUrl;
    try {
      const s3Response = await uploadToS3(req.file, {
        bucketKey: DEFAULT_BUCKET_KEY,
        folder,
        filename,
        refreshToken,
      });

      // Extract URL from S3 response (handle different response formats)
      if (typeof s3Response === 'string') {
        fileUrl = s3Response;
      } else if (s3Response.url) {
        fileUrl = s3Response.url;
      } else if (s3Response.data?.url) {
        fileUrl = s3Response.data.url;
      } else if (s3Response.location) {
        fileUrl = s3Response.location;
      } else if (s3Response.data?.location) {
        fileUrl = s3Response.data.location;
      } else {
        throw new Error('Invalid response format from S3 API');
      }
    } catch (s3Error) {
      console.error('S3 upload error:', s3Error.response?.data || s3Error.message);
      throw new Error(
        s3Error.response?.data?.message || 
        s3Error.message || 
        'Failed to upload file to S3 storage'
      );
    }

    // Save file metadata to database
    const fileUpload = await FileUpload.create({
      uploadedBy: req.user._id,
      url: fileUrl,
      bucketKey: DEFAULT_BUCKET_KEY,
      folder,
      filename,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadContext,
      relatedEntityType: req.body.relatedEntityType || null,
      relatedEntityId: req.body.relatedEntityId || null,
    });

    // Return response in compatible format
    res.json({
      success: true,
      data: {
        url: fileUrl,
        publicId: fileUpload._id.toString(), // Use DB ID as publicId for compatibility
        id: fileUpload._id.toString(),
        width: null, // S3 doesn't provide dimensions, can be extracted later if needed
        height: null,
        format: path.extname(req.file.originalname).slice(1),
        bytes: req.file.size,
        uploadContext,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images to S3
 * @access  Private
 */
router.post('/images', protect, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    // Get upload context from query params or body
    const uploadContext = req.query.context || req.body.context || 'other';
    const folder = getFolderForContext(uploadContext);
    
    // Get refreshToken from cookies
    const refreshToken = req.cookies?.refreshToken || null;

    // Upload all images to S3
    const uploadPromises = req.files.map(async (file) => {
      const fileExt = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

      // Upload to S3
      let fileUrl;
      try {
        const s3Response = await uploadToS3(file, {
          bucketKey: DEFAULT_BUCKET_KEY,
          folder,
          filename,
          refreshToken,
        });

        // Extract URL from S3 response (handle different response formats)
        if (typeof s3Response === 'string') {
          fileUrl = s3Response;
        } else if (s3Response.url) {
          fileUrl = s3Response.url;
        } else if (s3Response.data?.url) {
          fileUrl = s3Response.data.url;
        } else if (s3Response.location) {
          fileUrl = s3Response.location;
        } else if (s3Response.data?.location) {
          fileUrl = s3Response.data.location;
        } else {
          throw new Error('Invalid response format from S3 API');
        }
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error.response?.data || s3Error.message);
        throw new Error(
          s3Error.response?.data?.message || 
          s3Error.message || 
          'Failed to upload file to S3 storage'
        );
      }

      // Save file metadata to database
      const fileUpload = await FileUpload.create({
        uploadedBy: req.user._id,
        url: fileUrl,
        bucketKey: DEFAULT_BUCKET_KEY,
        folder,
        filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadContext,
        relatedEntityType: req.body.relatedEntityType || null,
        relatedEntityId: req.body.relatedEntityId || null,
      });

      return {
        url: fileUrl,
        publicId: fileUpload._id.toString(),
        id: fileUpload._id.toString(),
        width: null,
        height: null,
        format: path.extname(file.originalname).slice(1),
        bytes: file.size,
        uploadContext,
      };
    });

    const uploadedImages = await Promise.all(uploadPromises);

    res.json({
      success: true,
      count: uploadedImages.length,
      data: uploadedImages,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   DELETE /api/upload/image/:publicId
 * @desc    Delete image record from database
 * @access  Private
 * @note    Actual file deletion from S3 should be handled separately if needed
 */
router.delete('/image/:publicId', protect, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Find and verify ownership
    const fileUpload = await FileUpload.findById(publicId);
    
    if (!fileUpload) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Verify ownership (only allow deletion by uploader)
    if (fileUpload.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file',
      });
    }

    // Delete from database
    await FileUpload.findByIdAndDelete(publicId);
    
    res.json({
      success: true,
      message: 'File record deleted successfully',
      note: 'File may still exist in S3 storage',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;

