const httpStatus = require('http-status');
const { User, Team, Role } = require('../models');
const ApiError = require('../utils/ApiError');
// const { uploadToS3 } = require('../utils/s3bucket');
const Organization = require('../models/organization.model');

const checkUniqueFieldForOrg = async (field, value, orgId, excludeId = null) => {
  const filter = { [field]: value, orgId };
  if (excludeId) {
    filter._id = { $ne: excludeId }; // Exclude the current document during update
  }
  const existingDocument = await User.findOne(filter);
  if (existingDocument) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} "${value}" already exists`);
  }
};

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  await checkUniqueFieldForOrg('name', userBody.name, userBody.orgId);
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = new User(userBody);
  user.setInviteStatus(true);
  await user.save();

  return user;
};

/**
 * Create test user method
 */
const createTestUser = async () => {
  let regularUser = await User.findOne({ email: 'myleaduser@yopmail.com' });

  // Create a regular user
  if (!regularUser) {
    regularUser = new User({
      name: 'Regular User',
      email: 'myleaduser@yopmail.com',
      password: 'user@zt9EB*fW5n3na7W',
      role: 'user',
    });
  } else {
    regularUser.role = 'user';
    regularUser.password = 'user@zt9EB*fW5n3na7W';
  }

  await regularUser.save();

  let adminUser = await User.findOne({ email: 'myleadadmin@yopmail.com' });
  // create admin user
  if (!adminUser) {
    adminUser = new User({
      name: 'Admin User',
      email: 'myleadadmin@yopmail.com',
      password: '@zt9EB*fW5n3na7W',
      role: 'admin',
    });
  } else {
    adminUser.role = 'admin';
    adminUser.password = '@zt9EB*fW5n3na7W';
  }

  await adminUser.save();
  return [regularUser, adminUser];
};
const getRoles = async (orgId = null) => {
  // Build query to get system roles and custom roles for the organization
  const query = {
    $or: [
      { isSystemRole: true }, // Always include system roles
      { isSystemRole: false, orgId: orgId } // Include custom roles for the specific organization
    ]
  };
  
  const roles = await Role.find(query);
  return roles;
};
/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  let query = {};

  // Add search by name functionality
  if (filter.query) {
    query = {
      ...query,
      name: { $regex: filter.query, $options: 'i' },
    };
  }

  // Add other filters as needed
  if (filter.query) {
    query = { ...query /* Add other query filters */ };
  }
  if (filter.role) {
    query = { ...query /* Add role filter */ };
  }
  if (filter.status) {
    if (filter.status === 'Deleted') {
      query = { ...query, status: 'Deleted' };
    } else {
      query = { ...query, status: { $ne: 'Deleted' } };
    }
  }

  if (filter._id) {
    query._id = filter._id;
  }
  const users = await User.paginate(query, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id).populate({path:'roles',select:'roleName'}).populate('orgId');
};

/**
 * Get user by id
 * @param {Array} ids
 * @returns {Promise<User>}
 */
const getUserByIds = async (ids) => {
  return User.find({ _id: { $in: ids } });
};
/**
 * Get all users without pagination
 * @returns {Promise<User[]>}
 */
const getAllUsers = async (filter = {}) => {
  if (filter.query) {
    const regex = new RegExp(filter.query, 'i'); // Case-insensitive regex
    modifiedFilter.$or = [
      { name: { $regex: regex } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ['$name'] },
            regex,
          },
        },
      },
    ];
    delete modifiedFilter.query;
  }

  return User.find(filter).exec();
};

const getTeamUsers = async (userId) => {
  try {
    // Get the current user first
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return [];
    }

    const teams = await Team.find({ members: userId }).populate('members');
    
    // Flatten the members array and ensure unique members using Set
    const teamMembers = teams.flatMap((team) => team.members);
    
    // Create a Set to ensure uniqueness based on user ID
    const uniqueUsersMap = new Map();
    
    // Add current user first
    uniqueUsersMap.set(currentUser._id.toString(), currentUser);
    
    // Add team members
    teamMembers.forEach(member => {
      if (member && member._id) {
        uniqueUsersMap.set(member._id.toString(), member);
      }
    });
    
    return Array.from(uniqueUsersMap.values());
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
};

/**
 * Get all users without pagination
 * @returns {Promise<User[]>}
 */
const getAllNormalUsers = async () => {
  return User.find({ status: 'Active' })
    .populate({
      path: 'roles',
      select: 'roleName id',
    })
    .exec();
};
/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email }).setOptions({
    skipOrgIdCheck: true,
  });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.name) {
    await checkUniqueFieldForOrg("name", updateBody.name, user.orgId, userId);
  }
  if(user.profileImage !== updateBody.profileImage) {
  if (updateBody.profileImage !== '' && updateBody.profileImage) {
    const base64String = updateBody.profileImage;
    const binaryData = Buffer.from(base64String, 'base64');
    const { name } = updateBody;
    const timestamp = Date.now();
    const key = `users_photos/${name}_${timestamp}.jpg`;
    // const photoUrl = await uploadToS3(key, binaryData);
    // updateBody.profileImage = photoUrl;
  }
}
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  let adminRole;
  let userRoleIds = user.roles.map(role => role.id.toString());
  let hasAdminRole = false;
  if (updateBody.isOwner !== undefined || updateBody.roles) {
    const roles = await getRoles(user.orgId);
    adminRole = roles.find(role => role.roleName === 'Admin')?.id;
    hasAdminRole = userRoleIds.includes(adminRole.toString());
  }

  if (updateBody.isOwner !== undefined && updateBody.isOwner !== user.isOwner) {
    if (updateBody.isOwner === true && !hasAdminRole) {
      user.roles = [adminRole, ...userRoleIds];
    } else if (updateBody.isOwner === false && userRoleIds.length > 1 && hasAdminRole) {
      user.roles = userRoleIds.filter(roleId => roleId !== adminRole.toString());
    }
  }
  if (user.isOwner && updateBody.roles) {
    const updatedRoleIds = updateBody.roles.map(role => role.toString());
    if (!updatedRoleIds.includes(adminRole.toString())) {
      updateBody.roles = [adminRole, ...updatedRoleIds];
    }
  }


  Object.assign(user, updateBody);
  await user.save();
  return user;
};
const updateUserPasswordById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const isOldPasswordCorrect = await user.isPasswordMatch(updateBody.oldPassword);
  if (!isOldPasswordCorrect) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Old password is incorrect');
  }

  const isNewPasswordDifferent = !(await user.isPasswordMatch(updateBody.password));
  if (!isNewPasswordDifferent) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'New password must be different from the old password');
  }

  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  delete updateBody.oldPassword;
  Object.assign(user, updateBody);
  await user.save();

  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

module.exports = {
  createUser,
  getRoles,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
  createTestUser,
  updateUserPasswordById,
  getAllUsers,
  getAllNormalUsers,
  getTeamUsers,
  getUserByIds
};
