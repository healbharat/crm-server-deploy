// Placeholder utility functions for role management

function isAdmin(role) {
    // Example implementation
    return role === 'admin';
}

function isUser(role) {
    // Example implementation
    return role === 'user';
}

// Add more role-related utilities as needed
const Role = require('../models/role.model');
/**
 * Get the first role from user's roles array (for backward compatibility)
 * @param {Array} userRoles - Array of role objects with populated roleName
 * @returns {Object|null} - The first role or null
 */
const getFirstRole = (userRoles) => {
  if (!userRoles || userRoles.length === 0) {
    return null;
  }
  return userRoles[0];
};

/**
 * Get the first role name from user's roles array (for backward compatibility)
 * @param {Array} userRoles - Array of role objects with populated roleName
 * @returns {string|null} - The first role name or null
 */
const getFirstRoleName = (userRoles) => {
  const firstRole = getFirstRole(userRoles);
  return firstRole ? firstRole.roleName : null;
};

/**
 * Aggregate permissions from all user roles
 * If any role has a permission set to true, the aggregated permission will be true
 * @param {Array} userRoles - Array of role objects (can be with or without populated permissions)
 * @returns {Object} - Aggregated permissions object
 */
const aggregateUserPermissions = async (userRoles) => {
  if (!userRoles || userRoles.length === 0) {
    return {};
  }

  const aggregatedPermissions = {};

  // Get role IDs from user roles
  const roleIds = userRoles.map(role => role._id || role);

  // Fetch roles with permissions from database
  const rolesWithPermissions = await Role.find({ _id: { $in: roleIds } })
    .select('permissions')
    .setOptions({ skipOrgIdCheck: true });

  rolesWithPermissions.forEach(role => {
    if (role.permissions) {
      Object.keys(role.permissions).forEach(permission => {
        // If permission is true in any role, set it to true in aggregated permissions
        if (role.permissions[permission] === true) {
          aggregatedPermissions[permission] = true;
        }
      });
    }
  });

  return aggregatedPermissions;
};

/**
 * Check if user has a specific permission based on aggregated permissions
 * @param {Array} userRoles - Array of role objects with populated permissions
 * @param {string} permission - The permission to check for
 * @returns {boolean} - True if user has the permission
 */
const hasPermission = (userRoles, permission) => {
  if (!userRoles || userRoles.length === 0 || !permission) {
    return false;
  }

  return userRoles.some(role => 
    role.permissions && role.permissions[permission] === true
  );
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} userRoles - Array of role objects with populated permissions
 * @param {Array} permissions - Array of permissions to check for
 * @returns {boolean} - True if user has any of the specified permissions
 */
const hasAnyPermission = (userRoles, permissions) => {
  if (!userRoles || userRoles.length === 0 || !permissions || permissions.length === 0) {
    return false;
  }

  return permissions.some(permission => hasPermission(userRoles, permission));
};

/**
 * Check if user has all of the specified permissions
 * @param {Array} userRoles - Array of role objects with populated permissions
 * @param {Array} permissions - Array of permissions to check for
 * @returns {boolean} - True if user has all of the specified permissions
 */
const hasAllPermissions = (userRoles, permissions) => {
  if (!userRoles || userRoles.length === 0 || !permissions || permissions.length === 0) {
    return false;
  }

  return permissions.every(permission => hasPermission(userRoles, permission));
};

/**
 * Get user's data access level based on permissions and department
 * Returns the appropriate filter for data access
 * @param {Array} userRoles - Array of role objects with populated permissions
 * @param {string} userId - User ID for filtering
 * @param {string|Array} userDepartment - User's department ID(s)
 * @param {boolean} isManager - Whether user is a department manager
 * @returns {Object} - Data access configuration
 */
const getUserDataAccess = (userRoles, userId, userDepartment = null, isManager = false) => {
  if (!userRoles || userRoles.length === 0) {
    return { 
      scope: 'own', 
      userIds: [userId],
      departments: userDepartment ? (Array.isArray(userDepartment) ? userDepartment : [userDepartment]) : []
    };
  }

  // Check for global access (SuperAdmin by role name or permission)
  if (hasRole(userRoles, 'SuperAdmin') || hasPermission(userRoles, 'canViewOrganizations')) {
    return { scope: 'global', userIds: null, departments: null };
  }

  // Check for admin access (Admin by role name or permission)
  if (hasRole(userRoles, 'Admin') || hasPermission(userRoles, 'canViewOwnOrganization')) {
    return { scope: 'admin', userIds: null, departments: null };
  }

  // Check for department manager access
  if (isManager || hasPermission(userRoles, 'canManageTeams')) {
    return { 
      scope: 'department', 
      userIds: userId,
      departments: userDepartment ? (Array.isArray(userDepartment) ? userDepartment : [userDepartment]) : []
    };
  }

  // Check for team-level access
  if (hasPermission(userRoles, 'canViewTeams')) {
    return { 
      scope: 'team', 
      userIds: userId,
      departments: userDepartment ? (Array.isArray(userDepartment) ? userDepartment : [userDepartment]) : []
    };
  }

  // Default to own data only
  return { 
    scope: 'own', 
    userIds: [userId],
    departments: userDepartment ? (Array.isArray(userDepartment) ? userDepartment : [userDepartment]) : []
  };
};

/**
 * Check if user has a specific role (considering priority)
 * @param {Array} userRoles - Array of role objects with populated roleName and priority
 * @param {string} roleName - The role name to check for
 * @returns {boolean} - True if user has the specified role
 */
const hasRole = (userRoles, roleName) => {
  if (!userRoles || userRoles.length === 0) {
    return false;
  }
  return userRoles.some(role => role.roleName === roleName);
};

/**
 * Get all role names from user's roles array
 * @param {Array} userRoles - Array of role objects with populated roleName
 * @returns {Array} - Array of role names
 */
const getAllRoleNames = (userRoles) => {
  if (!userRoles || userRoles.length === 0) {
    return [];
  }
  return userRoles.map(role => role.roleName);
};

/**
 * Check if user has any of the specified roles
 * @param {Array} userRoles - Array of role objects with populated roleName
 * @param {Array} roleNames - Array of role names to check for
 * @returns {boolean} - True if user has any of the specified roles
 */
const hasAnyRole = (userRoles, roleNames) => {
  if (!userRoles || userRoles.length === 0 || !roleNames || roleNames.length === 0) {
    return false;
  }
  const userRoleNames = getAllRoleNames(userRoles);
  return roleNames.some(roleName => userRoleNames.includes(roleName));
};

/**
 * Check if user has all of the specified roles
 * @param {Array} userRoles - Array of role objects with populated roleName
 * @param {Array} roleNames - Array of role names to check for
 * @returns {boolean} - True if user has all of the specified roles
 */
const hasAllRoles = (userRoles, roleNames) => {
  if (!userRoles || userRoles.length === 0 || !roleNames || roleNames.length === 0) {
    return false;
  }
  const userRoleNames = getAllRoleNames(userRoles);
  return roleNames.every(roleName => userRoleNames.includes(roleName));
};

module.exports = {
  isAdmin,
  isUser,
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
  getUserDataAccess,
  // Legacy exports for backward compatibility
  getHighestPriorityRole: getFirstRole,
  getHighestPriorityRoleName: getFirstRoleName,
};
