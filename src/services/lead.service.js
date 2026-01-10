const httpStatus = require('http-status');
const { Lead } = require('../models');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');

/**
 * Create a lead
 * @param {Object} leadBody
 * @returns {Promise<Lead>}
 */
const createLead = async (leadBody) => {
  const lead = await Lead.create(leadBody);
  return lead;
};

/**
 * Query for leads
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryLeads = async (filter, options) => {
  let query = {};

  // Preserve orgId from filter if it exists (tenant plugin will handle it if not present)
  if (filter.orgId) {
    query.orgId = filter.orgId;
  }

  // Add search functionality
  if (filter.query || filter.searchTerm) {
    const searchTerm = filter.query || filter.searchTerm;
    query.$or = [
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
      { company: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Add status filter
  if (filter.status) {
    query.status = filter.status;
  }

  // Add source filter
  if (filter.source) {
    query.source = filter.source;
  }

  // Add assignedTo filter
  if (filter.assignedTo) {
    query.assignedTo = filter.assignedTo;
  }

  // Add isConverted filter
  if (filter.isConverted !== undefined) {
    query.isConverted = filter.isConverted;
  }

  // Handle _id filter for single or multiple IDs
  if (filter._id) {
    query._id = filter._id;
  }

  options.populate = [
    { path: 'assignedTo', select: 'name email' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' },
    { path: 'notes.createdBy', select: 'name email' },
  ];

  const leads = await Lead.paginate(query, options);
  return leads;
};

/**
 * Get lead by id
 * @param {ObjectId} id
 * @returns {Promise<Lead>}
 */
const getLeadById = async (id) => {
  return Lead.findById(id)
    .populate({ path: 'assignedTo', select: 'name email' })
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' })
    .populate({ path: 'notes.createdBy', select: 'name email' })
    .populate({ path: 'convertedTo' });
};

/**
 * Update lead by id
 * @param {ObjectId} leadId
 * @param {Object} updateBody
 * @returns {Promise<Lead>}
 */
const updateLeadById = async (leadId, updateBody) => {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  // If status is being changed to 'Converted', set isConverted to true
  if (updateBody.status === 'Converted' && !lead.isConverted) {
    updateBody.isConverted = true;
    updateBody.convertedAt = new Date();
  }

  // If status is being changed from 'Converted' to something else, set isConverted to false
  if (lead.status === 'Converted' && updateBody.status && updateBody.status !== 'Converted') {
    updateBody.isConverted = false;
    updateBody.convertedAt = null;
  }

  Object.assign(lead, updateBody);
  await lead.save();
  return lead;
};

/**
 * Delete lead by id
 * @param {ObjectId} leadId
 * @returns {Promise<Lead>}
 */
const deleteLeadById = async (leadId) => {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  await lead.remove();
  return lead;
};

/**
 * Add note to lead
 * @param {ObjectId} leadId
 * @param {Object} noteData
 * @returns {Promise<Lead>}
 */
const addNoteToLead = async (leadId, noteData) => {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }

  lead.notes.push({
    note: noteData.note,
    createdBy: noteData.createdBy,
    createdAt: new Date(),
  });

  await lead.save();
  return lead;
};

module.exports = {
  createLead,
  queryLeads,
  getLeadById,
  updateLeadById,
  deleteLeadById,
  addNoteToLead,
};

