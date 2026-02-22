const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { dealService } = require('../services');
const { applyDepartmentFilter } = require('../utils/filterUtils');

const createDeal = catchAsync(async (req, res) => {
  req.body.createdBy = req.user._id;
  
  // Set initial department from user's department
  const userDepartment = req.user.department?._id || req.user.department;
  if (userDepartment && !req.body.departments) {
    req.body.departments = [userDepartment];
  }
  
  const deal = await dealService.createDeal(req.body);
  res.status(httpStatus.CREATED).send(deal);
});

const getDeals = catchAsync(async (req, res) => {
  let filter = { 
    ...pick(req.query, ['query', 'status', 'lead', 'createdBy', 'tag', 'searchTerm', 'minAmount', 'maxAmount']) 
  };
  
  // Apply department-based access control
  filter = applyDepartmentFilter(filter, req.queryFilters);
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await dealService.queryDeals(filter, options);
  res.send(result);
});

const getDeal = catchAsync(async (req, res) => {
  const deal = await dealService.getDealById(req.params.dealId);
  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }
  
  // Check access based on department and ownership
  const hasAccess = checkDealAccess(deal, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this deal');
  }
  
  res.send(deal);
});

const updateDeal = catchAsync(async (req, res) => {
  // First check if user has access to this deal
  const existingDeal = await dealService.getDealById(req.params.dealId);
  if (!existingDeal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }
  
  const hasAccess = checkDealAccess(existingDeal, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to update this deal');
  }
  
  req.body.updatedBy = req.user._id;
  const deal = await dealService.updateDealById(req.params.dealId, req.body);
  res.send(deal);
});

const deleteDeal = catchAsync(async (req, res) => {
  // First check if user has access to this deal
  const existingDeal = await dealService.getDealById(req.params.dealId);
  if (!existingDeal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }
  
  const hasAccess = checkDealAccess(existingDeal, req.user, req.queryFilters);
  if (!hasAccess) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to delete this deal');
  }
  
  await dealService.deleteDealById(req.params.dealId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Check if user has access to a deal based on department and ownership
 * @param {Object} deal - Deal object
 * @param {Object} user - User object
 * @param {Object} queryFilters - Query filters from middleware
 * @returns {boolean}
 */
function checkDealAccess(deal, user, queryFilters) {
  const accessLevel = queryFilters?.accessLevel;
  const userId = user.id || user._id;
  const userDepartment = user.department?._id || user.department;
  
  // SuperAdmin and Admin have access to everything
  if (accessLevel === 'global' || accessLevel === 'admin') {
    return true;
  }
  
  // Check if deal is in user's department
  const dealDepartments = deal.departments || [];
  const isInUserDepartment = dealDepartments.some(dept => {
    const deptId = dept._id || dept;
    return deptId.toString() === userDepartment?.toString();
  });
  
  // Department manager can access all deals in their department
  if (accessLevel === 'department' && isInUserDepartment) {
    return true;
  }
  
  // Team member or own: check if user created the deal
  const createdById = deal.createdBy?._id || deal.createdBy;
  const isCreator = createdById?.toString() === userId.toString();
  
  if ((accessLevel === 'team' || accessLevel === 'own') && isInUserDepartment && isCreator) {
    return true;
  }
  
  return false;
}

module.exports = {
  createDeal,
  getDeals,
  getDeal,
  updateDeal,
  deleteDeal,
};
