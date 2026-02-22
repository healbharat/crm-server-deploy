const Joi = require('joi');

const getDashboardAnalytics = {
  query: Joi.object().keys({
    // No query parameters needed for dashboard analytics
  }),
};

const getTopPerformingUsers = {
  query: Joi.object().keys({
    period: Joi.string().valid('monthly', 'quarterly', 'yearly').optional(),
  }),
};

const getTotalLeads = {
  query: Joi.object().keys({}),
};

const getNewLeadsThisWeek = {
  query: Joi.object().keys({}),
};

const getTotalDeals = {
  query: Joi.object().keys({}),
};

const getClosedWonDeals = {
  query: Joi.object().keys({}),
};

const getTotalDealValue = {
  query: Joi.object().keys({}),
};

const getAllTopPerformers = {
  query: Joi.object().keys({}),
};

module.exports = {
  getDashboardAnalytics,
  getTopPerformingUsers,
  getTotalLeads,
  getNewLeadsThisWeek,
  getTotalDeals,
  getClosedWonDeals,
  getTotalDealValue,
  getAllTopPerformers
};





