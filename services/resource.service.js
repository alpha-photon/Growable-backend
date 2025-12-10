import Resource from '../models/Resource.model.js';
import User from '../models/User.model.js';

/**
 * Create resource
 */
export const createResource = async (therapistId, resourceData) => {
  // Verify user is therapist or doctor
  const user = await User.findById(therapistId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!['therapist', 'doctor'].includes(user.role)) {
    throw new Error('Only therapists and doctors can create resources');
  }

  const resource = new Resource({
    therapistId,
    ...resourceData,
    isApproved: true, // Auto-approve for therapists
    approvedAt: new Date(),
  });

  await resource.save();

  return await resource.populate('therapistId', 'name email avatar role');
};

/**
 * Get resources with filters
 */
export const getResources = async (filters = {}) => {
  const {
    therapistId,
    category,
    resourceType,
    accessLevel,
    status = 'published',
    search,
    page = 1,
    limit = 20,
  } = filters;

  const query = { status };

  if (therapistId) query.therapistId = therapistId;
  if (category) query.category = category;
  if (resourceType) query.resourceType = resourceType;
  if (accessLevel) query.accessLevel = accessLevel;

  if (search) {
    query.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const resources = await Resource.find(query)
    .populate('therapistId', 'name email avatar role')
    .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Resource.countDocuments(query);

  return {
    resources,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get resource by ID
 */
export const getResourceById = async (resourceId) => {
  const resource = await Resource.findById(resourceId)
    .populate('therapistId', 'name email avatar role')
    .lean();

  if (!resource) {
    throw new Error('Resource not found');
  }

  // Increment view count
  await Resource.findByIdAndUpdate(resourceId, {
    $inc: { viewCount: 1 },
  });

  return resource;
};

/**
 * Update resource
 */
export const updateResource = async (resourceId, therapistId, updateData) => {
  const resource = await Resource.findById(resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  if (resource.therapistId.toString() !== therapistId.toString()) {
    throw new Error('Not authorized to update this resource');
  }

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      resource[key] = updateData[key];
    }
  });

  await resource.save();

  return await resource.populate('therapistId', 'name email avatar role');
};

/**
 * Delete resource
 */
export const deleteResource = async (resourceId, therapistId) => {
  const resource = await Resource.findById(resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  if (resource.therapistId.toString() !== therapistId.toString()) {
    throw new Error('Not authorized to delete this resource');
  }

  await Resource.findByIdAndDelete(resourceId);

  return { success: true };
};

/**
 * Increment download count
 */
export const incrementDownloadCount = async (resourceId) => {
  await Resource.findByIdAndUpdate(resourceId, {
    $inc: { downloadCount: 1 },
  });
};

