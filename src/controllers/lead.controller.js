const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leadService } = require('../services');
const { applyFilter } = require('../utils/filterUtils');

const createLead = catchAsync(async (req, res) => {
  req.body.createdBy = req.user._id;
  req.body.orgId = req.orgId || req.user.orgId.id;
  const lead = await leadService.createLead(req.body);
  res.status(httpStatus.CREATED).send(lead);
});

const getLeads = catchAsync(async (req, res) => {
  let filter = { ...req.queryFilters, ...pick(req.query, ['query', 'status', 'source', 'assignedTo', 'isConverted', 'searchTerm']) };
  
  // Ensure orgId is in the filter (tenant plugin will handle it, but being explicit helps)
  if (!filter.orgId) {
    filter.orgId = req.orgId || req.user.orgId?.id || req.user.orgId;
  }
  
  // Remove data field if it exists (it's used for role-based filtering but not applicable to leads directly)
  delete filter.data;
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await leadService.queryLeads(filter, options);
  res.send(result);
});

const getLead = catchAsync(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  res.send(lead);
});

const updateLead = catchAsync(async (req, res) => {
  req.body.updatedBy = req.user._id;
  const lead = await leadService.updateLeadById(req.params.leadId, req.body);
  res.send(lead);
});

const deleteLead = catchAsync(async (req, res) => {
  await leadService.deleteLeadById(req.params.leadId);
  res.status(httpStatus.NO_CONTENT).send();
});

const addNote = catchAsync(async (req, res) => {
  const noteData = {
    note: req.body.note,
    createdBy: req.user._id,
  };
  const lead = await leadService.addNoteToLead(req.params.leadId, noteData);
  res.status(httpStatus.CREATED).send(lead);
});

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addNote,
};

