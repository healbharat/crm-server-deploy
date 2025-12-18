const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { userRoleService } = require('../services');

/**
 * Middleware to add role-based filters to queries
 * Sets req.queryFilters.data based on user's data access scope
 */
const addRoleBasedFilters = async (req, res, next) => {
  const { user } = req;

  if (!user) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  req.queryFilters = req.queryFilters || {};

  try {
    // Get user's data access configuration based on permissions
    const dataAccess = userRoleService.getUserDataAccessConfig(user);

    switch (dataAccess.scope) {
      case 'global': {
        // SuperAdmin can see all data across all organizations
        // No additional filtering needed - user can access all records
        break;
      }

      case 'organization': {
        // Admin can see all data in their own organization
        // No additional filtering needed - user can access all records in their org
        break;
      }

      case 'team': {
        // Use the correct user ID (try both id and _id)
        const currentUserId = user.id || user._id;

        // Ensure userIds is an array and filter out undefined values
        const userIds = dataAccess.userIds
          ? Array.isArray(dataAccess.userIds)
            ? dataAccess.userIds
            : [dataAccess.userIds]
          : [currentUserId];

        // Filter out any undefined values
        const validUserIds = userIds.filter((id) => id !== undefined && id !== null);

        if (validUserIds.length === 0) {
          // If no valid user IDs, just use current user
          req.queryFilters.data = [currentUserId];
          break;
        }

        const teamMemberIds=[];

        // Always include the user's own ID, plus any team members found
        const teamUserIds = [currentUserId];
        if (teamMemberIds && teamMemberIds.length > 0) {
          // Filter out the user's own ID from team members to avoid duplicates
          const otherTeamMembers = teamMemberIds.filter((id) => id && id.toString() !== currentUserId.toString());
          teamUserIds.push(...otherTeamMembers);
        }

        req.queryFilters.data = teamUserIds;
        break;
      }

      case 'own':
      default: {
        // User can only see their own data
        const currentUserId = user.id || user._id;
        req.queryFilters.data = currentUserId;
        break;
      }
    }

    next();
  } catch (error) {
    console.error('Role-based auth error:', error);
    next(error);
  }
};

module.exports = addRoleBasedFilters;
