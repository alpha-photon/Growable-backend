import * as resourceService from '../services/resource.service.js';

/**
 * @route   POST /api/resources
 * @desc    Create resource
 * @access  Private (Therapist/Doctor only)
 */
export const createResource = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!['therapist', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only therapists and doctors can create resources',
      });
    }

    const resource = await resourceService.createResource(req.user._id, req.body);

    res.status(201).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/resources
 * @desc    Get resources with filters
 * @access  Public
 */
export const getResources = async (req, res, next) => {
  try {
    const filters = {
      therapistId: req.query.therapistId,
      category: req.query.category,
      resourceType: req.query.resourceType,
      accessLevel: req.query.accessLevel,
      status: req.query.status || 'published',
      search: req.query.search,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await resourceService.getResources(filters);

    res.json({
      success: true,
      data: result.resources,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/resources/:id
 * @desc    Get resource by ID
 * @access  Public
 */
export const getResourceById = async (req, res, next) => {
  try {
    const resource = await resourceService.getResourceById(req.params.id);

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   PUT /api/resources/:id
 * @desc    Update resource
 * @access  Private (Therapist/Doctor - owner only)
 */
export const updateResource = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const resource = await resourceService.updateResource(
      req.params.id,
      req.user._id,
      req.body
    );

    res.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   DELETE /api/resources/:id
 * @desc    Delete resource
 * @access  Private (Therapist/Doctor - owner only)
 */
export const deleteResource = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    await resourceService.deleteResource(req.params.id, req.user._id);

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Resource not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/resources/:id/download
 * @desc    Track resource download
 * @access  Public
 */
export const trackDownload = async (req, res, next) => {
  try {
    await resourceService.incrementDownloadCount(req.params.id);

    res.json({
      success: true,
      message: 'Download tracked',
    });
  } catch (error) {
    next(error);
  }
};

