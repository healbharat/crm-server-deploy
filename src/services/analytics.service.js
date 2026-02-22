const mongoose = require('mongoose');
const { Lead, Deal, User, Status, Team } = require('../models');

/**
 * Get total number of leads captured
 * @param {Object} filter - Filter object with userId and role info
 * @returns {Promise<number>}
 */
const getTotalLeads = async (filter) => {
  const query = buildLeadQuery(filter);
  return Lead.countDocuments(query);
};

/**
 * Get new leads created in the last week
 * @param {Object} filter - Filter object with userId and role info
 * @returns {Promise<number>}
 */
const getNewLeadsThisWeek = async (filter) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const query = buildLeadQuery(filter);
  query.createdAt = { $gte: oneWeekAgo };
  
  return Lead.countDocuments(query);
};

/**
 * Get total number of deals
 * @param {Object} filter - Filter object with userId and role info
 * @returns {Promise<number>}
 */
const getTotalDeals = async (filter) => {
  const query = buildDealQuery(filter);
  return Deal.countDocuments(query);
};

/**
 * Get number of closed won deals
 * @param {Object} filter - Filter object with userId and role info
 * @returns {Promise<number>}
 */
const getClosedWonDeals = async (filter) => {
  const query = buildDealQuery(filter);
  
  // Find status with name 'Closed Won' or 'closed-won'
  const closedWonStatus = await Status.findOne({
    associatedTo: 'deal',
    name: { $regex: /^closed[- ]?won$/i }
  });
  
  if (closedWonStatus) {
    query.status = closedWonStatus._id;
  }
  
  return Deal.countDocuments(query);
};

/**
 * Get total cost/value of all deals
 * @param {Object} filter - Filter object with userId and role info
 * @returns {Promise<number>}
 */
const getTotalDealValue = async (filter) => {
  const query = buildDealQuery(filter);
  
  const result = await Deal.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$amount' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].totalValue : 0;
};

/**
 * Get top 5 performing users for a given time period
 * @param {Object} filter - Filter object with userId and role info
 * @param {string} period - 'monthly', 'quarterly', or 'yearly'
 * @returns {Promise<Array>}
 */
const getTopPerformingUsers = async (filter, period = 'monthly') => {
  const dateFilter = getDateFilterForPeriod(period);
  const query = buildDealQuery(filter);
  
  // Add date filter
  if (dateFilter) {
    query.createdAt = dateFilter;
  }
  
  // Build the aggregation pipeline
  const pipeline = [
    { $match: query },
    {
      $group: {
        _id: '$createdBy',
        totalAmount: { $sum: '$amount' },
        dealCount: { $sum: 1 }
      }
    },
    { $sort: { totalAmount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        userId: '$_id',
        userName: '$userInfo.name',
        userEmail: '$userInfo.email',
        totalAmount: 1,
        dealCount: 1,
        _id: 0
      }
    }
  ];
  
  return Deal.aggregate(pipeline);
};

/**
 * Get complete dashboard analytics
 * @param {Object} user - User object from request
 * @returns {Promise<Object>}
 */
const getDashboardAnalytics = async (user) => {
  const filter = await buildUserFilter(user);
  
  // Determine if user can see top performers
  const effectiveRole = user.roles && user.roles.length > 0 ? user.roles[0].roleName : null;
  const canSeeTopPerformers = ['SuperAdmin', 'Admin', 'TeamManager', 'SalesManager'].includes(effectiveRole);
  
  const analytics = {
    totalLeads: await getTotalLeads(filter),
    newLeadsThisWeek: await getNewLeadsThisWeek(filter),
    totalDeals: await getTotalDeals(filter),
    closedWonDeals: await getClosedWonDeals(filter),
    totalDealValue: await getTotalDealValue(filter)
  };
  
  // Add top performers only for authorized roles
  if (canSeeTopPerformers) {
    analytics.topPerformers = {
      monthly: await getTopPerformingUsers(filter, 'monthly'),
      quarterly: await getTopPerformingUsers(filter, 'quarterly'),
      yearly: await getTopPerformingUsers(filter, 'yearly')
    };
  }
  
  return analytics;
};

/**
 * Build user filter based on role and permissions
 * @param {Object} user - User object from request
 * @returns {Promise<Object>}
 */
const buildUserFilter = async (user) => {
  const filter = {
    userId: user._id,
    role: null,
    teamMemberIds: [],
    departmentId: user.department?._id || user.department
  };
  
  if (!user.roles || user.roles.length === 0) {
    filter.role = 'User';
    return filter;
  }
  
  const effectiveRole = user.roles[0].roleName;
  filter.role = effectiveRole;
  
  // SuperAdmin and Admin can see all data
  if (effectiveRole === 'SuperAdmin' || effectiveRole === 'Admin') {
    filter.scope = 'all';
    return filter;
  }
  
  // TeamManager can see their team's data
  if (effectiveRole === 'TeamManager' || effectiveRole === 'SalesManager') {
    const teams = await Team.find({
      $or: [
        { managers: user._id },
        { owner: user._id }
      ]
    }).lean();
    
    const teamMemberIds = new Set();
    teams.forEach(team => {
      if (team.members && Array.isArray(team.members)) {
        team.members.forEach(memberId => {
          teamMemberIds.add(memberId.toString());
        });
      }
    });
    
    filter.scope = 'team';
    filter.teamMemberIds = Array.from(teamMemberIds);
    return filter;
  }
  
  // Regular users can only see their own data
  filter.scope = 'own';
  return filter;
};

/**
 * Build lead query based on user filter
 * @param {Object} filter - User filter object
 * @returns {Object}
 */
const buildLeadQuery = (filter) => {
  const query = {};
  
  if (filter.scope === 'all') {
    // No additional filters for SuperAdmin/Admin
    return query;
  }
  
  if (filter.scope === 'team') {
    // TeamManager sees their team's leads
    const userIds = [filter.userId, ...filter.teamMemberIds].map(id => 
      mongoose.Types.ObjectId(id)
    );
    query.$or = [
      { createdBy: { $in: userIds } },
      { assignedTo: { $in: userIds } }
    ];
    return query;
  }
  
  // Regular user sees only their own leads
  query.$or = [
    { createdBy: mongoose.Types.ObjectId(filter.userId) },
    { assignedTo: mongoose.Types.ObjectId(filter.userId) }
  ];
  
  return query;
};

/**
 * Build deal query based on user filter
 * @param {Object} filter - User filter object
 * @returns {Object}
 */
const buildDealQuery = (filter) => {
  const query = {};
  
  if (filter.scope === 'all') {
    // No additional filters for SuperAdmin/Admin
    return query;
  }
  
  if (filter.scope === 'team') {
    // TeamManager sees their team's deals
    const userIds = [filter.userId, ...filter.teamMemberIds].map(id => 
      mongoose.Types.ObjectId(id)
    );
    query.createdBy = { $in: userIds };
    return query;
  }
  
  // Regular user sees only their own deals
  query.createdBy = mongoose.Types.ObjectId(filter.userId);
  
  return query;
};

/**
 * Get date filter for the specified period
 * @param {string} period - 'monthly', 'quarterly', or 'yearly'
 * @returns {Object}
 */
const getDateFilterForPeriod = (period) => {
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return null;
  }
  
  return { $gte: startDate };
};

module.exports = {
  getTotalLeads,
  getNewLeadsThisWeek,
  getTotalDeals,
  getClosedWonDeals,
  getTotalDealValue,
  getTopPerformingUsers,
  getDashboardAnalytics,
  buildUserFilter
};

