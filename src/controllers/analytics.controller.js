const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const analyticsService = require('../services/analytics.service');
const ApiError = require('../utils/ApiError');

/**
 * Get dashboard analytics
 * @route GET /api/analytics/dashboard
 * @access Private - All authenticated users
 */
const getDashboardAnalytics = catchAsync(async (req, res) => {
  const analytics = await analyticsService.getDashboardAnalytics(req.user);
  res.status(httpStatus.OK).send(analytics);
});

/**
 * Get total leads count
 * @route GET /api/analytics/leads/total
 * @access Private - All authenticated users
 */
const getTotalLeads = catchAsync(async (req, res) => {
  const filter = await analyticsService.buildUserFilter(req.user);
  const count = await analyticsService.getTotalLeads(filter);
  res.status(httpStatus.OK).send({ count });
});

/**
 * Get new leads this week
 * @route GET /api/analytics/leads/new-week
 * @access Private - All authenticated users
 */
const getNewLeadsThisWeek = catchAsync(async (req, res) => {
  const filter = await analyticsService.buildUserFilter(req.user);
  const count = await analyticsService.getNewLeadsThisWeek(filter);
  res.status(httpStatus.OK).send({ count });
});

/**
 * Get total deals count
 * @route GET /api/analytics/deals/total
 * @access Private - All authenticated users
 */
const getTotalDeals = catchAsync(async (req, res) => {
  const filter = await analyticsService.buildUserFilter(req.user);
  const count = await analyticsService.getTotalDeals(filter);
  res.status(httpStatus.OK).send({ count });
});

/**
 * Get closed won deals count
 * @route GET /api/analytics/deals/closed-won
 * @access Private - All authenticated users
 */
const getClosedWonDeals = catchAsync(async (req, res) => {
  const filter = await analyticsService.buildUserFilter(req.user);
  const count = await analyticsService.getClosedWonDeals(filter);
  res.status(httpStatus.OK).send({ count });
});

/**
 * Get total deal value
 * @route GET /api/analytics/deals/total-value
 * @access Private - All authenticated users
 */
const getTotalDealValue = catchAsync(async (req, res) => {
  const filter = await analyticsService.buildUserFilter(req.user);
  const totalValue = await analyticsService.getTotalDealValue(filter);
  res.status(httpStatus.OK).send({ totalValue });
});

/**
 * Get top performing users
 * @route GET /api/analytics/users/top-performers
 * @access Private - SuperAdmin, Admin, TeamManager, SalesManager only
 */
const getTopPerformingUsers = catchAsync(async (req, res) => {
  const { period } = req.query;
  
  // Validate period
  const validPeriods = ['monthly', 'quarterly', 'yearly'];
  if (period && !validPeriods.includes(period)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid period. Must be one of: monthly, quarterly, yearly');
  }
  
  // Check if user has permission to view top performers
  const effectiveRole = req.user.roles && req.user.roles.length > 0 ? req.user.roles[0].roleName : null;
  const canSeeTopPerformers = ['SuperAdmin', 'Admin', 'TeamManager', 'SalesManager'].includes(effectiveRole);
  
  if (!canSeeTopPerformers) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to view top performers');
  }
  
  const filter = await analyticsService.buildUserFilter(req.user);
  const topPerformers = await analyticsService.getTopPerformingUsers(filter, period || 'monthly');
  
  res.status(httpStatus.OK).send({ 
    period: period || 'monthly',
    topPerformers 
  });
});

/**
 * Get all top performers (monthly, quarterly, yearly)
 * @route GET /api/analytics/users/all-top-performers
 * @access Private - SuperAdmin, Admin, TeamManager, SalesManager only
 */
const getAllTopPerformers = catchAsync(async (req, res) => {
  // Check if user has permission to view top performers
  const effectiveRole = req.user.roles && req.user.roles.length > 0 ? req.user.roles[0].roleName : null;
  const canSeeTopPerformers = ['SuperAdmin', 'Admin', 'TeamManager', 'SalesManager'].includes(effectiveRole);
  
  if (!canSeeTopPerformers) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to view top performers');
  }
  
  const filter = await analyticsService.buildUserFilter(req.user);
  
  const topPerformers = {
    monthly: await analyticsService.getTopPerformingUsers(filter, 'monthly'),
    quarterly: await analyticsService.getTopPerformingUsers(filter, 'quarterly'),
    yearly: await analyticsService.getTopPerformingUsers(filter, 'yearly')
  };
  
  res.status(httpStatus.OK).send(topPerformers);
});

module.exports = {
  getDashboardAnalytics,
  getTotalLeads,
  getNewLeadsThisWeek,
  getTotalDeals,
  getClosedWonDeals,
  getTotalDealValue,
  getTopPerformingUsers,
  getAllTopPerformers
};





