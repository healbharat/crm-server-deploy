const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { leadService } = require('../services');
const { applyDepartmentFilter } = require('../utils/filterUtils');

const createLead = catchAsync(async (req, res) => {
  req.body.createdBy = req.user._id;
  
  // Set initial department from user's department
  const userDepartment = req.user.department?._id || req.user.department;
  if (userDepartment && !req.body.departments) {
    req.body.departments = [userDepartment];
  }
  
  const lead = await leadService.createLead(req.body);
  res.status(httpStatus.CREATED).send(lead);
});

const getLeads = catchAsync(async (req, res) => {
  let filter = { 
    ...pick(req.query, ['query', 'status', 'source', 'assignedTo', 'isConverted', 'searchTerm']) 
  };
  
  // Apply department-based access control
  filter = applyDepartmentFilter(filter, req.queryFilters);
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await leadService.queryLeads(filter, options);
  res.send(result);
});

const getLead = catchAsync(async (req, res) => {
  const lead = await leadService.getLeadById(req.params.leadId);
  if (!lead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  
  // Check access based on department and ownership
  const hasAccess = checkLeadAccess(lead, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this lead');
  }
  
  res.send(lead);
});

const updateLead = catchAsync(async (req, res) => {
  // First check if user has access to this lead
  const existingLead = await leadService.getLeadById(req.params.leadId);
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  
  const hasAccess = checkLeadAccess(existingLead, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to update this lead');
  }
  
  req.body.updatedBy = req.user._id;
  const lead = await leadService.updateLeadById(req.params.leadId, req.body);
  res.send(lead);
});

const deleteLead = catchAsync(async (req, res) => {
  // First check if user has access to this lead
  const existingLead = await leadService.getLeadById(req.params.leadId);
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  
  const hasAccess = checkLeadAccess(existingLead, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to delete this lead');
  }
  
  await leadService.deleteLeadById(req.params.leadId);
  res.status(httpStatus.NO_CONTENT).send();
});

const addNote = catchAsync(async (req, res) => {
  // First check if user has access to this lead
  const existingLead = await leadService.getLeadById(req.params.leadId);
  if (!existingLead) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lead not found');
  }
  
  const hasAccess = checkLeadAccess(existingLead, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to add notes to this lead');
  }
  
  const noteData = {
    note: req.body.note,
    createdBy: req.user._id,
  };
  const lead = await leadService.addNoteToLead(req.params.leadId, noteData);
  res.status(httpStatus.CREATED).send(lead);
});

/**
 * Check if user has access to a lead based on department and ownership
 * @param {Object} lead - Lead object
 * @param {Object} user - User object
 * @param {Object} queryFilters - Query filters from middleware
 * @returns {boolean}
 */
function checkLeadAccess(lead, user, queryFilters) {
  const accessLevel = queryFilters?.accessLevel;
  const userId = user.id || user._id;
  const userDepartment = user.department?._id || user.department;
  
  // SuperAdmin and Admin have access to everything
  if (accessLevel === 'global' || accessLevel === 'admin') {
    return true;
  }
  
  // Check if lead is in user's department
  const leadDepartments = lead.departments || [];
  const isInUserDepartment = leadDepartments.some(
    dept => dept.toString() === userDepartment?.toString()
  );
  
  // Department manager can access all leads in their department
  if (accessLevel === 'department' && isInUserDepartment) {
    return true;
  }
  
  // Team member or own: check if user created or is assigned to the lead
  const createdById = lead.createdBy?._id || lead.createdBy;
  const assignedToId = lead.assignedTo?._id || lead.assignedTo;
  
  const isCreator = createdById?.toString() === userId.toString();
  const isAssigned = assignedToId?.toString() === userId.toString();
  
  if ((accessLevel === 'team' || accessLevel === 'own') && isInUserDepartment && (isCreator || isAssigned)) {
    return true;
  }
  
  return false;
}

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addNote,
};
