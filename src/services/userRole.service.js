const { User } = require('../models');
const { 
  getFirstRole, 
  getFirstRoleName, 
  hasRole, 
  getAllRoleNames, 
  hasAnyRole, 
  hasAllRoles,
  aggregateUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserDataAccess
} = require('../utils/roleUtils');

/**
 * Get user with populated roles
 * @param {ObjectId} userId - User ID
 * @returns {Promise<User>} - User with populated roles
 */
const getUserWithRoles = async (userId) => {
  const user = await User.findById(userId).populate('roles', 'roleName permissions');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

/**
 * Get the first role for a user (for backward compatibility)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object|null>} - The first role or null
 */
const getFirstUserRole = async (userId) => {
  const user = await getUserWithRoles(userId);
  return getFirstRole(user.roles);
};

/**
 * Get the first role name for a user (for backward compatibility)
 * @param {ObjectId} userId - User ID
 * @returns {Promise<string|null>} - The first role name or null
 */
const getFirstUserRoleName = async (userId) => {
  const user = await getUserWithRoles(userId);
  return getFirstRoleName(user.roles);
};

/**
 * Check if user has a specific role
 * @param {ObjectId} userId - User ID
 * @param {string} roleName - Role name to check for
 * @returns {Promise<boolean>} - True if user has the role
 */
const userHasRole = async (userId, roleName) => {
  const user = await getUserWithRoles(userId);
  return hasRole(user.roles, roleName);
};

/**
 * Get all role names for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Array>} - Array of role names
 */
const getUserRoleNames = async (userId) => {
  const user = await getUserWithRoles(userId);
  return getAllRoleNames(user.roles);
};

/**
 * Check if user has any of the specified roles
 * @param {ObjectId} userId - User ID
 * @param {Array} roleNames - Array of role names to check for
 * @returns {Promise<boolean>} - True if user has any of the roles
 */
const userHasAnyRole = async (userId, roleNames) => {
  const user = await getUserWithRoles(userId);
  return hasAnyRole(user.roles, roleNames);
};

/**
 * Check if user has all of the specified roles
 * @param {ObjectId} userId - User ID
 * @param {Array} roleNames - Array of role names to check for
 * @returns {Promise<boolean>} - True if user has all of the roles
 */
const userHasAllRoles = async (userId, roleNames) => {
  const user = await getUserWithRoles(userId);
  return hasAllRoles(user.roles, roleNames);
};

/**
 * Get user's effective role information for authorization
 * This is the main function to use instead of user.roles[0].roleName
 * @param {User} user - User object (can be from req.user)
 * @returns {Object} - Object containing effective role information
 */
const getEffectiveUserRole = (user) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return {
      role: null,
      roleName: null,
      allRoles: [],
      allRoleNames: [],
      permissions: {}
    };
  }

  const firstRole = getFirstRole(user.roles);
  const allRoleNames = getAllRoleNames(user.roles);
  const aggregatedPermissions = aggregateUserPermissions(user.roles);

  return {
    role: firstRole,
    roleName: firstRole ? firstRole.roleName : null,
    allRoles: user.roles,
    allRoleNames: allRoleNames,
    permissions: aggregatedPermissions
  };
};

/**
 * Get user's aggregated permissions from all roles
 * @param {User} user - User object (can be from req.user)
 * @returns {Object} - Aggregated permissions object
 */
const getUserPermissions = (user) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return {};
  }
  return aggregateUserPermissions(user.roles);
};

/**
 * Check if user has a specific permission
 * @param {User} user - User object (can be from req.user)
 * @param {string} permission - Permission to check for
 * @returns {boolean} - True if user has the permission
 */
const userHasPermission = (user, permission) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }
  return hasPermission(user.roles, permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {User} user - User object (can be from req.user)
 * @param {Array} permissions - Array of permissions to check for
 * @returns {boolean} - True if user has any of the permissions
 */
const userHasAnyPermission = (user, permissions) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }
  return hasAnyPermission(user.roles, permissions);
};

/**
 * Check if user has all of the specified permissions
 * @param {User} user - User object (can be from req.user)
 * @param {Array} permissions - Array of permissions to check for
 * @returns {boolean} - True if user has all of the permissions
 */
const userHasAllPermissions = (user, permissions) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }
  return hasAllPermissions(user.roles, permissions);
};

/**
 * Get user's data access configuration based on permissions
 * @param {User} user - User object (can be from req.user)
 * @returns {Object} - Data access configuration
 */
const getUserDataAccessConfig = (user) => {
  if (!user || !user.roles || user.roles.length === 0) {
    return { scope: 'own', userIds: [user.id] };
  }
  return getUserDataAccess(user.roles, user.id);
};

module.exports = {
  getUserWithRoles,
  getFirstUserRole,
  getFirstUserRoleName,
  userHasRole,
  getUserRoleNames,
  userHasAnyRole,
  userHasAllRoles,
  getEffectiveUserRole,
  getUserPermissions,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
  getUserDataAccessConfig,
  // Legacy exports for backward compatibility
  getHighestPriorityUserRole: getFirstUserRole,
  getHighestPriorityUserRoleName: getFirstUserRoleName,
};
