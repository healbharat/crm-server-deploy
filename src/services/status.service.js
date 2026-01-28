const httpStatus = require('http-status');
const { Status } = require('../models');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

/**
 * Create a status
 * @param {Object} statusBody
 * @returns {Promise<Status>}
 */
const createStatus = async (statusBody) => {
  // Check if status name already exists for this organization and associatedTo
  const existingStatus = await Status.findOne({
    name: statusBody.name,
    associatedTo: statusBody.associatedTo,
    orgId: statusBody.orgId,
  });

  if (existingStatus) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Status with name "${statusBody.name}" already exists for ${statusBody.associatedTo} in this organization`
    );
  }

  const status = await Status.create(statusBody);
  return status;
};

/**
 * Query for statuses
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryStatuses = async (filter, options) => {
  let query = {};

  // Preserve orgId from filter if it exists (tenant plugin will handle it if not present)
  if (filter.orgId) {
    query.orgId = filter.orgId;
  }

  // Add search functionality
  if (filter.query || filter.searchTerm) {
    const searchTerm = filter.query || filter.searchTerm;
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Add associatedTo filter
  if (filter.associatedTo) {
    query.associatedTo = filter.associatedTo;
  }

  // Handle _id filter for single or multiple IDs
  if (filter._id) {
    query._id = filter._id;
  }

  options.populate = [
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' },
  ];

  const statuses = await Status.paginate(query, options);
  return statuses;
};

/**
 * Get status by id
 * @param {ObjectId} id
 * @returns {Promise<Status>}
 */
const getStatusById = async (id) => {
  return Status.findById(id)
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' });
};

/**
 * Update status by id
 * @param {ObjectId} statusId
 * @param {Object} updateBody
 * @returns {Promise<Status>}
 */
const updateStatusById = async (statusId, updateBody) => {
  const status = await getStatusById(statusId);
  if (!status) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Status not found');
  }

  // Check if updating name would create a duplicate for the same associatedTo and orgId
  if (updateBody.name || updateBody.associatedTo) {
    const nameToCheck = updateBody.name || status.name;
    const associatedToToCheck = updateBody.associatedTo || status.associatedTo;
    
    const existingStatus = await Status.findOne({
      name: nameToCheck,
      associatedTo: associatedToToCheck,
      orgId: status.orgId,
      _id: { $ne: statusId },
    });

    if (existingStatus) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Status with name "${nameToCheck}" already exists for ${associatedToToCheck} in this organization`
      );
    }
  }

  Object.assign(status, updateBody);
  await status.save();
  return status;
};

/**
 * Delete status by id
 * @param {ObjectId} statusId
 * @returns {Promise<Status>}
 */
const deleteStatusById = async (statusId) => {
  const status = await getStatusById(statusId);
  if (!status) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Status not found');
  }
  await status.remove();
  return status;
};

module.exports = {
  createStatus,
  queryStatuses,
  getStatusById,
  updateStatusById,
  deleteStatusById,
};

