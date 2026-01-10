const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { dealService } = require('../services');

const createDeal = catchAsync(async (req, res) => {
  req.body.createdBy = req.user._id;
  req.body.orgId = req.orgId || req.user.orgId.id;
  const deal = await dealService.createDeal(req.body);
  res.status(httpStatus.CREATED).send(deal);
});

const getDeals = catchAsync(async (req, res) => {
  let filter = { 
    ...req.queryFilters, 
    ...pick(req.query, ['query', 'status', 'lead', 'createdBy', 'tag', 'searchTerm', 'minAmount', 'maxAmount']) 
  };
  
  // Ensure orgId is in the filter (tenant plugin will handle it, but being explicit helps)
  if (!filter.orgId) {
    filter.orgId = req.orgId || req.user.orgId?.id || req.user.orgId;
  }
  
  // Remove data field if it exists (it's used for role-based filtering but not applicable to deals directly)
  delete filter.data;
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await dealService.queryDeals(filter, options);
  res.send(result);
});

const getDeal = catchAsync(async (req, res) => {
  const deal = await dealService.getDealById(req.params.dealId);
  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Deal not found');
  }
  res.send(deal);
});

const updateDeal = catchAsync(async (req, res) => {
  req.body.updatedBy = req.user._id;
  const deal = await dealService.updateDealById(req.params.dealId, req.body);
  res.send(deal);
});

const deleteDeal = catchAsync(async (req, res) => {
  await dealService.deleteDealById(req.params.dealId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDeal,
  getDeals,
  getDeal,
  updateDeal,
  deleteDeal,
};

