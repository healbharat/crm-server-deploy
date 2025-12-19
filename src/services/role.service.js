const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Role, User } = require('../models');
const ApiError = require('../utils/ApiError');
// const { sendSMTPMail, renderTemplate } = require('./email.service');
const config = require('../config/config');
// const roleLogService = require('./roleLog.service');
// const getAllTeamMemberIds = require('../utils/getTeamMembers');
const userRoleService = require('./userRole.service');

/**
 * Create a role
 * @param {Object} roleBody
 * @param {Object} performedBy - User who performed the action
 * @param {Object} context - Additional context (IP, userAgent, etc.)
 * @returns {Promise<Role>}
 */
const createRole = async (roleBody, performedBy = null, context = {}) => {
  // Check if role name already exists for this organization
  const existingRole = await Role.findOne({
    roleName: roleBody.roleName,
    orgId: roleBody.orgId,
    isSystemRole: false,
  });

  if (existingRole) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already exists in this organization');
  }

  // Validate permissions against system roles
  await validateCustomRolePermissions(roleBody.permissions);

  const role = await Role.create(roleBody);

  // Log role creation if performedBy is provided
  // if (performedBy) {
  //   try {
  //     await roleLogService.logRoleCreation(role, performedBy, context);
  //   } catch (error) {
  //     console.error('Error logging role creation:', error.message);
  //     // Don't throw error to avoid breaking the main operation
  //   }
  // }

  return role;
};

/**
 * Query for roles with user counts and permission counts
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {string} [options.userRole] - Current user's role for filtering
 * @returns {Promise<Object[]>}
 */
const queryRoles = async (filter, options = {}) => {
  // Get user's data access configuration based on permissions
  const { user } = options;
  let dataAccess = { scope: 'organization' }; // Default for backwards compatibility
  let teamMemberIds = [];
  const roleFilter = { ...filter };

  if (user) {
    dataAccess = userRoleService.getUserDataAccessConfig(user);

    // Apply role visibility filtering based on data access scope
    if (dataAccess.scope === 'global') {
      // SuperAdmin can see all roles - no additional filter needed
    } else if (dataAccess.scope === 'organization') {
      // Admin cannot see SuperAdmin
      roleFilter.roleName = { $ne: 'SuperAdmin' };
    } else if (dataAccess.scope === 'team') {
      // Team-based access: cannot see SuperAdmin, Admin, and SalesManager
      roleFilter.roleName = {
        $nin: ['SuperAdmin', 'Admin', 'SalesManager'],
      };
      // Get team member IDs for filtering users later
      teamMemberIds = await getAllTeamMemberIds(user._id, 'user');
    } else if (dataAccess.scope === 'own') {
      // Own access: User can only see their own role
      // Get the user's first role name
      const effectiveRole = userRoleService.getEffectiveUserRole(user);
      roleFilter.roleName = effectiveRole.roleName;
    }
  }

  if (options.searchTerm) {
    roleFilter.roleName = { $regex: options.searchTerm, $options: 'i' };
  }

  let query = Role.find(roleFilter);

  // Apply sorting if provided
  if (options.sortBy) {
    const sortBy = options.sortBy.split(':');
    const sortField = sortBy[0];
    const sortOrder = sortBy[1] === 'desc' ? -1 : 1;
    query = query.sort({ [sortField]: sortOrder });
  } else {
    // Default sorting: system roles first, then by priority (ascending), then by roleName
    query = query.sort({ isSystemRole: -1, priority: 1, roleName: 1 });
  }

  const roles = await query.exec();

  // Build user match filter for aggregation
  const userMatchFilter = { status: { $ne: 'Deleted' } };
  if (options.orgId) {
    userMatchFilter.orgId = options.orgId;
  }

  // Add team member filter for TeamManagers
  if (dataAccess.scope === 'team') {
    // Include the manager themselves and all their team members
    const allTeamUserIds = [user._id.toString(), ...teamMemberIds];
    // Convert to ObjectId for MongoDB aggregation
    const objectIdArray = allTeamUserIds.map((id) => mongoose.Types.ObjectId(id));
    userMatchFilter._id = { $in: objectIdArray };
  }

  const userCounts = await User.aggregate([
    {
      $match: userMatchFilter,
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'roles',
        foreignField: '_id',
        as: 'roleDetails',
      },
    },
    {
      $match: {
        roleDetails: { $exists: true, $ne: [] },
      },
    },
    {
      $unwind: '$roleDetails',
    },
    {
      $group: {
        _id: '$roleDetails._id',
        count: { $sum: 1 },
        users: {
          $push: {
            id: '$_id',
            name: '$name',
            email: '$email',
            profileImage: '$profileImage',
          },
        },
      },
    },
  ]);

  // Create maps for easy lookup
  const userCountMap = {};
  const usersMap = {};

  userCounts.forEach((item) => {
    userCountMap[item._id.toString()] = item.count;
    usersMap[item._id.toString()] = item.users;
  });

  // Enhance roles with counts and users
  const enhancedRoles = roles.map((role) => {
    const permissions = role.permissions || {};
    const permissionsCount = Object.values(permissions).filter((permission) => permission === true).length;
    const totalPermissions = Object.keys(permissions).length;

    return {
      ...role.toObject(),
      memberCount: userCountMap[role._id.toString()] || 0,
      permissionsCount,
      totalPermissions,
      users: usersMap[role._id.toString()] || [],
    };
  });

  return enhancedRoles;
};

/**
 * Get role by id with member count
 * @param {ObjectId} id
 * @returns {Promise<Role>}
 */
const getRoleById = async (id) => {
  const role = await Role.findById(id);
  if (!role) {
    return null;
  }

  // Get user count for this role using the same approach as queryRoles
  const userCounts = await User.aggregate([
    {
      $match: {
        status: { $ne: 'Deleted' },
      },
    },
    {
      $lookup: {
        from: 'roles',
        localField: 'roles',
        foreignField: '_id',
        as: 'roleDetails',
      },
    },
    {
      $match: {
        roleDetails: { $exists: true, $ne: [] },
      },
    },
    {
      $unwind: '$roleDetails',
    },
    {
      $match: {
        'roleDetails._id': role._id,
      },
    },
    {
      $count: 'total',
    },
  ]);

  const memberCount = userCounts.length > 0 ? userCounts[0].total : 0;

  // Return role with member count
  return {
    ...role.toObject(),
    memberCount: memberCount,
  };
};

/**
 * Get role by roleName and orgId
 * @param {string} roleName
 * @param {ObjectId} orgId
 * @returns {Promise<Role>}
 */
const getRoleByNameAndOrg = async (roleName, orgId) => {
  return Role.findOne({ roleName, orgId, isSystemRole: false });
};

/**
 * Update role by id
 * @param {ObjectId} roleId
 * @param {Object} updateBody
 * @param {Object} performedBy - User who performed the action
 * @param {Object} context - Additional context (IP, userAgent, etc.)
 * @returns {Promise<Role>}
 */
const updateRoleById = async (roleId, updateBody, performedBy = null, context = {}) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Prevent updating system roles
  if (role.isSystemRole) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot update system roles');
  }

  // Check if role name already exists for this organization (excluding current role)
  if (updateBody.roleName && updateBody.roleName !== role.roleName) {
    const existingRole = await Role.findOne({
      roleName: updateBody.roleName,
      orgId: role.orgId,
      isSystemRole: false,
      _id: { $ne: roleId },
    });

    if (existingRole) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already exists in this organization');
    }
  }

  // Validate permissions if being updated
  if (updateBody.permissions) {
    await validateCustomRolePermissions(updateBody.permissions);
  }

  // Store old data for audit logging
  const oldData = {
    roleName: role.roleName,
    description: role.description,
    permissions: { ...role.permissions },
  };

  Object.assign(role, updateBody);
  await role.save();

  // Log role update if performedBy is provided
  // if (performedBy) {
  //   try {
  //     await roleLogService.logRoleUpdate(roleId, oldData, role, performedBy, context);
  //   } catch (error) {
  //     console.error('Error logging role update:', error.message);
  //     // Don't throw error to avoid breaking the main operation
  //   }
  // }

  return role;
};

/**
 * Delete role by id
 * @param {ObjectId} roleId
 * @param {Object} performedBy - User who performed the action
 * @param {Object} context - Additional context (IP, userAgent, etc.)
 * @returns {Promise<Role>}
 */
const deleteRoleById = async (roleId, performedBy = null, context = {}) => {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Prevent deleting system roles
  if (role.isSystemRole) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot delete system roles');
  }

  // Check if role is assigned to any users
  const usersWithRole = await User.find({ roles: roleId });
  if (usersWithRole.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete role that is assigned to users');
  }

  const deletedRole = await Role.findByIdAndDelete(roleId);

  // Log role deletion if performedBy is provided
  // if (performedBy) {
  //   try {
  //     await roleLogService.logRoleDeletion(deletedRole, performedBy, context);
  //   } catch (error) {
  //     console.error('Error logging role deletion:', error.message);
  //     // Don't throw error to avoid breaking the main operation
  //   }
  // }

  return deletedRole;
};


/**
 * Send role assignment emails in batches for better performance
 * @param {Array} userIds - Array of user IDs to send emails to
 * @param {Object} role - Role object
 */
const sendRoleAssignmentEmails = async (userIds, role) => {
  // try {
  //   // Get all users in a single query
  //   const users = await User.find({ _id: { $in: userIds } }).select('name email orgId');

  //   if (users.length === 0) return;

  //   // Render template once
  //   const templateData = {
  //     data: {
  //       roleName: role.roleName,
  //       name: users[0].name,
  //     },
  //     loginUrl: `${config.domainUrl}#/login`,
  //   };

  //   const htmlTemplate = await renderTemplate('role-assignment.html', templateData);

  //   // Process emails in batches of 5 to avoid overwhelming the email service
  //   const batchSize = 5;
  //   for (let i = 0; i < users.length; i += batchSize) {
  //     const batch = users.slice(i, i + batchSize);

  //     // Process batch concurrently
  //     const emailPromises = batch.map(async (user) => {
  //       try {
  //         // Use the pre-rendered template and replace user-specific data
  //         const html = htmlTemplate.replace('{{data.name}}', user.name);
  //         const recipients = [{ name: user.name, email: user.email }];

  //         return sendSMTPMail(recipients, user.orgId, null, `Role Assignment: ${role.roleName}`, html);
  //       } catch (emailError) {
  //         console.error(`Failed to send role assignment email to ${user.email}:`, emailError.message);
  //         return null;
  //       }
  //     });

  //     // Wait for batch to complete before processing next batch
  //     await Promise.allSettled(emailPromises);
  //   }
  // } catch (error) {
  //   console.error('Error in sendRoleAssignmentEmails:', error.message);
  // }
};

/**
 * Send role removal notifications to admins
 * @param {Array} affectedUsers - Users who had their role removed
 * @param {Object} role - Role that was removed
 */
const sendAdminRoleRemovalNotifications = async (affectedUsers, role) => {
  // try {
  //   if (affectedUsers.length === 0) return;

  //   // Get the organization ID from the first user
  //   const { orgId } = affectedUsers[0];

  //   // Find the Admin role (predefined system role)
  //   const adminRole = await Role.findOne({ roleName: 'Admin' });

  //   if (!adminRole) {
  //     // eslint-disable-next-line no-console
  //     console.log('No Admin role found');
  //     return;
  //   }

  //   // Get all users with Admin role in this organization
  //   // Note: User.roles is an array, so we use $in to check if adminRole._id is in the array
  //   const adminUsers = await User.find({
  //     orgId: orgId.toString(),
  //     roles: { $in: [adminRole._id.toString()] },
  //     status: 'Active',
  //   }).select('name email');

  //   if (adminUsers.length === 0) {
  //     return;
  //   }
  //   // Get current date for the notification
  //   const removalDate = new Date().toLocaleString('en-US', {
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit',
  //   });

  //   // Send email to each admin for each affected user
  //   const batchSize = 5;
  //   for (let i = 0; i < adminUsers.length; i += batchSize) {
  //     const adminBatch = adminUsers.slice(i, i + batchSize);

  //     const emailPromises = adminBatch.flatMap((admin) => {
  //       return affectedUsers.map(async (user) => {
  //         try {
  //           // Render admin notification template
  //           const adminTemplateData = {
  //             data: {
  //               adminName: admin.name,
  //               userName: user.name,
  //               roleName: role.roleName,
  //               removalDate,
  //             },
  //           };

  //           const adminHtml = await renderTemplate('admin-role-removal.html', adminTemplateData);
  //           const recipients = [{ name: admin.name, email: admin.email }];

  //           return sendSMTPMail(recipients, orgId, null, `Role Removal Alert: ${role.roleName} - ${user.name}`, adminHtml);
  //         } catch (emailError) {
  //           // eslint-disable-next-line no-console
  //           console.error(`Failed to send admin notification to ${admin.email}:`, emailError.message);
  //           return null;
  //         }
  //       });
  //     });

  //     // Wait for batch to complete before processing next batch
  //     // eslint-disable-next-line no-await-in-loop
  //     await Promise.allSettled(emailPromises);
  //   }
  // } catch (error) {
  //   // eslint-disable-next-line no-console
  //   console.error('Error in sendAdminRoleRemovalNotifications:', error.message);
  // }
};

/**
 * Send role removal emails in batches for better performance
 * @param {Array} userIds - Array of user IDs to send emails to
 * @param {Object} role - Role object
 */
const sendRoleRemovalEmails = async (userIds, role) => {
  try {
    // Get all users in a single query
    const users = await User.find({ _id: { $in: userIds } }).select('name email orgId');

    if (users.length === 0) return;

    // Only send notifications to admins (no email to users being removed)
    await sendAdminRoleRemovalNotifications(users, role);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in sendRoleRemovalEmails:', error.message);
  }
};

/**
 * Assign users to a role (replaces existing assignments)
 * @param {ObjectId} roleId
 * @param {Array} userIds
 * @param {Object} performedBy - User who performed the action
 * @param {Object} context - Additional context (IP, userAgent, etc.)
 * @returns {Promise<Object>}
 */
const assignUsersToRole = async (roleId, userIds, performedBy = null, context = {}) => {
  // Check if role exists
  const role = await getRoleById(roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  // Get all users who currently have this role
  const currentUsers = await User.find({ roles: roleId }).select('_id');
  const currentUserIds = currentUsers.map((user) => user._id.toString());

  // Find users to add and remove
  const usersToAdd = userIds.filter((userId) => !currentUserIds.includes(userId));
  const usersToRemove = currentUserIds.filter((userId) => !userIds.includes(userId));

  // Validate minimum role requirement before removing users
  if (usersToRemove.length > 0) {
    await validateMinimumRoleRequirement(usersToRemove, roleId);
  }

  let addResult = { modifiedCount: 0 };
  let removeResult = { modifiedCount: 0 };

  // Add new users to the role
  if (usersToAdd.length > 0) {
    addResult = await User.updateMany({ _id: { $in: usersToAdd } }, { $addToSet: { roles: roleId } });
  }

  // Remove users from the role
  if (usersToRemove.length > 0) {
    removeResult = await User.updateMany({ _id: { $in: usersToRemove } }, { $pull: { roles: roleId } });
  }

  const totalModified = addResult.modifiedCount + removeResult.modifiedCount;

  // Log user assignments/removals if performedBy is provided
  // if (performedBy) {
  //   try {
  //     // Log user assignments
  //     if (usersToAdd.length > 0) {
  //       await roleLogService.logUserAssignment(roleId, usersToAdd, performedBy, context);
  //     }

  //     // Log user removals
  //     if (usersToRemove.length > 0) {
  //       await roleLogService.logUserRemoval(roleId, usersToRemove, performedBy, context);
  //     }
  //   } catch (error) {
  //     console.error('Error logging user role assignments:', error.message);
  //     // Don't throw error to avoid breaking the main operation
  //   }
  // }

  // Send email notifications asynchronously to avoid blocking the response
  setImmediate(async () => {
    try {
      // Send role assignment emails
      if (usersToAdd.length > 0) {
        await sendRoleAssignmentEmails(usersToAdd, role);
      }

      // Send role removal emails
      if (usersToRemove.length > 0) {
        await sendRoleRemovalEmails(usersToRemove, role);
      }
    } catch (error) {
      console.error('Error sending role notification emails:', error.message);
    }
  });

  return {
    message: `Successfully updated user assignments for role. Added: ${addResult.modifiedCount}, Removed: ${removeResult.modifiedCount}`,
    roleId,
    assignedUsers: userIds,
    usersAdded: usersToAdd,
    usersRemoved: usersToRemove,
    totalModified,
  };
};

/**
 * Validate minimum role requirement - ensure users have at least one role
 * @param {Array} userIds - Array of user IDs to be removed from role
 * @param {ObjectId} roleId - Role ID being removed
 */
const validateMinimumRoleRequirement = async (userIds, roleId) => {
  // Get users with their current roles
  const users = await User.find({
    _id: { $in: userIds },
    status: { $ne: 'Deleted' },
  }).populate('roles', 'roleName');

  const usersWithInsufficientRoles = [];

  for (const user of users) {
    // Check if user would have zero roles after removal
    const remainingRoles = user.roles.filter((role) => role._id.toString() !== roleId.toString());

    if (remainingRoles.length === 0) {
      usersWithInsufficientRoles.push({
        userId: user._id,
        userName: user.name || user.email,
        currentRoleCount: user.roles.length,
      });
    }
  }

  if (usersWithInsufficientRoles.length > 0) {
    const userNames = usersWithInsufficientRoles.map((u) => u.userName).join(', ');
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot remove role assignment. The following users would have no roles remaining: ${userNames}. Each user must have at least one role assigned.`
    );
  }
};

/**
 * Validate custom role permissions against system roles
 * @param {Object} permissions
 */
const validateCustomRolePermissions = async (permissions) => {
  // Get all system roles to find the maximum permissions
  const systemRoles = await Role.find({ isSystemRole: true });

  if (systemRoles.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No system roles found for validation');
  }

  // Find the role with maximum permissions (SuperAdmin)
  const superAdminRole = systemRoles.find((role) => role.roleName === 'SuperAdmin');
  if (!superAdminRole) {
    throw new ApiError(httpStatus.NOT_FOUND, 'SuperAdmin role not found for validation');
  }

  // Check if custom role has any permissions that SuperAdmin doesn't have
  const invalidPermissions = [];
  Object.keys(permissions).forEach((permission) => {
    if (permissions[permission] === true && !(permission in superAdminRole.permissions)) {
      invalidPermissions.push(permission);
    }
  });

  if (invalidPermissions.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid permissions: ${invalidPermissions.join(', ')}`);
  }
};

module.exports = {
  createRole,
  queryRoles,
  getRoleById,
  getRoleByNameAndOrg,
  updateRoleById,
  deleteRoleById,
  assignUsersToRole,
  validateCustomRolePermissions,
  validateMinimumRoleRequirement,
};
