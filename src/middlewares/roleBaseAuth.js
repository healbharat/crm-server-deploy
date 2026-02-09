const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { userRoleService } = require('../services');
const { Department } = require('../models');

/**
 * Middleware to add role-based filters to queries
 * Sets req.queryFilters based on user's data access scope
 * Implements department-based access control
 */
const addRoleBasedFilters = async (req, res, next) => {
  const { user } = req;

  if (!user) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }

  req.queryFilters = req.queryFilters || {};

  try {
    // Check if user is a department manager
    const isManager = await isDepartmentManager(user);

    // Get user's data access configuration based on permissions
    const dataAccess = userRoleService.getUserDataAccessConfig(user, isManager);

    switch (dataAccess.scope) {
      case 'global': {
        // SuperAdmin can see all data
        // No additional filtering needed
        req.queryFilters.accessLevel = 'global';
        break;
      }

      case 'admin': {
        // Admin can see all data in the organization
        // No additional filtering needed
        req.queryFilters.accessLevel = 'admin';
        break;
      }

      case 'department': {
        // Department manager can see all data in their department
        const currentUserId = user.id || user._id;
        const userDepartment = user.department?._id || user.department;

        req.queryFilters.accessLevel = 'department';
        req.queryFilters.departments = userDepartment ? [userDepartment] : [];
        req.queryFilters.userId = currentUserId;
        break;
      }

      case 'team': {
        // Team member can see their own data and data assigned to them
        const currentUserId = user.id || user._id;
        const userDepartment = user.department?._id || user.department;

        req.queryFilters.accessLevel = 'team';
        req.queryFilters.departments = userDepartment ? [userDepartment] : [];
        req.queryFilters.userId = currentUserId;
        break;
      }

      case 'own':
      default: {
        // User can only see their own data
        const currentUserId = user.id || user._id;
        const userDepartment = user.department?._id || user.department;

        req.queryFilters.accessLevel = 'own';
        req.queryFilters.userId = currentUserId;
        req.queryFilters.departments = userDepartment ? [userDepartment] : [];
        break;
      }
    }

    next();
  } catch (error) {
    console.error('Role-based auth error:', error);
    next(error);
  }
};

/**
 * Check if user is a department manager
 * @param {Object} user - User object
 * @returns {Promise<boolean>}
 */
const isDepartmentManager = async (user) => {
  try {
    const userId = user.id || user._id;
    const userDepartment = user.department?._id || user.department;

    if (!userDepartment) {
      return false;
    }

    const department = await Department.findById(userDepartment).select('managers');
    
    if (!department) {
      return false;
    }

    return department.managers.some(managerId => managerId.toString() === userId.toString());
  } catch (error) {
    console.error('Error checking department manager status:', error);
    return false;
  }
};

module.exports = addRoleBasedFilters;
