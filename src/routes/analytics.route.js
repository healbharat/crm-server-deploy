const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const analyticsValidation = require('../validations/analytics.validation');
const analyticsController = require('../controllers/analytics.controller');
const addRoleBasedFilters = require('../middlewares/roleBaseAuth');

const router = express.Router();

router.use(protect);
router.use(addRoleBasedFilters);

/**
 * @route GET /api/analytics/dashboard
 * @desc Get complete dashboard analytics
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/dashboard')
  .get(
    protect,
    checkPermissions(['canViewOverviews']),
    validate(analyticsValidation.getDashboardAnalytics),
    analyticsController.getDashboardAnalytics
  );

/**
 * @route GET /api/analytics/leads/total
 * @desc Get total leads count
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/leads/total')
  .get(
    protect,
    checkPermissions(['canViewLeads']),
    validate(analyticsValidation.getTotalLeads),
    analyticsController.getTotalLeads
  );

/**
 * @route GET /api/analytics/leads/new-week
 * @desc Get new leads this week
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/leads/new-week')
  .get(
    protect,
    checkPermissions(['canViewLeads']),
    validate(analyticsValidation.getNewLeadsThisWeek),
    analyticsController.getNewLeadsThisWeek
  );

/**
 * @route GET /api/analytics/deals/total
 * @desc Get total deals count
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/deals/total')
  .get(
    protect,
    checkPermissions(['canViewDeals']),
    validate(analyticsValidation.getTotalDeals),
    analyticsController.getTotalDeals
  );

/**
 * @route GET /api/analytics/deals/closed-won
 * @desc Get closed won deals count
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/deals/closed-won')
  .get(
    protect,
    checkPermissions(['canViewDeals']),
    validate(analyticsValidation.getClosedWonDeals),
    analyticsController.getClosedWonDeals
  );

/**
 * @route GET /api/analytics/deals/total-value
 * @desc Get total deal value
 * @access Private - All authenticated users (data filtered by role)
 */
router
  .route('/deals/total-value')
  .get(
    protect,
    checkPermissions(['canViewDeals']),
    validate(analyticsValidation.getTotalDealValue),
    analyticsController.getTotalDealValue
  );

/**
 * @route GET /api/analytics/users/top-performers
 * @desc Get top performing users for a specific period
 * @access Private - SuperAdmin, Admin, TeamManager, SalesManager only
 */
router
  .route('/users/top-performers')
  .get(
    protect,
    checkPermissions(['canViewUsers']),
    validate(analyticsValidation.getTopPerformingUsers),
    analyticsController.getTopPerformingUsers
  );

/**
 * @route GET /api/analytics/users/all-top-performers
 * @desc Get all top performers (monthly, quarterly, yearly)
 * @access Private - SuperAdmin, Admin, TeamManager, SalesManager only
 */
router
  .route('/users/all-top-performers')
  .get(
    protect,
    checkPermissions(['canViewUsers']),
    validate(analyticsValidation.getAllTopPerformers),
    analyticsController.getAllTopPerformers
  );

module.exports = router;





