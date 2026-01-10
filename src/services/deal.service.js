const httpStatus = require('http-status');
const { Deal } = require('../models');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

/**
 * Create a deal
 * @param {Object} dealBody
 * @returns {Promise<Deal>}
 */
const createDeal = async (dealBody) => {
  const deal = await Deal.create(dealBody);
  return deal;
};

/**
 * Query for deals
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryDeals = async (filter, options) => {
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

  // Add status filter
  if (filter.status) {
    query.status = filter.status;
  }

  // Add lead filter
  if (filter.lead) {
    query.lead = filter.lead;
  }

  // Add createdBy filter
  if (filter.createdBy) {
    query.createdBy = filter.createdBy;
  }

  // Handle _id filter for single or multiple IDs
  if (filter._id) {
    query._id = filter._id;
  }

  // Add tag filter
  if (filter.tag) {
    query.tags = { $in: [filter.tag] };
  }

  // Add amount range filters
  if (filter.minAmount !== undefined) {
    query.amount = { ...query.amount, $gte: filter.minAmount };
  }
  if (filter.maxAmount !== undefined) {
    query.amount = { ...query.amount, $lte: filter.maxAmount };
  }

  options.populate = [
    { path: 'lead', select: 'firstName lastName email company status' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' },
  ];

  const deals = await Deal.paginate(query, options);
  return deals;
};

/**
 * Get deal by id
 * @param {ObjectId} id
 * @returns {Promise<Deal>}
 */
const getDealById = async (id) => {
  return Deal.findById(id)
    .populate({ path: 'lead', select: 'firstName lastName email company status phone' })
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' });
};

/**
 * Update deal by id
 * @param {ObjectId} dealId
 * @param {Object} updateBody
 * @returns {Promise<Deal>}
 */
const updateDealById = async (dealId, updateBody) => {
  const deal = await getDealById(dealId);
  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }

  // If status is being changed to 'Closed Won' or 'Closed Lost', set actualCloseDate
  if (updateBody.status === 'Closed Won' || updateBody.status === 'Closed Lost') {
    if (!deal.actualCloseDate) {
      updateBody.actualCloseDate = new Date();
    }
  }

  Object.assign(deal, updateBody);
  await deal.save();
  return deal;
};

/**
 * Delete deal by id
 * @param {ObjectId} dealId
 * @returns {Promise<Deal>}
 */
const deleteDealById = async (dealId) => {
  const deal = await getDealById(dealId);
  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }
  await deal.remove();
  return deal;
};

module.exports = {
  createDeal,
  queryDeals,
  getDealById,
  updateDealById,
  deleteDealById,
};

