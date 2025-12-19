const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, userRoleService } = require('../services');
const { applyFilter } = require('../utils/filterUtils');
const { Team } = require('../models');
const mongoose = require('mongoose');

const createUser = catchAsync(async (req, res) => {
  req.body.createdBy = req.user._id;
  req.body.orgId = req.orgId || req.user.orgId.id;
  const user = await userService.createUser(req.body);
  // if (user.status === 'Invited') {
  //   const userInviteToken = await tokenService.generateUserInviteToken(user);
  //   const inviteUrl = `${config.resetPasswordUrl}#/user-invited?token=${userInviteToken}`;
  //   const data = {
  //     name: user.name,
  //   };
  //   const mailBody = await emailService.renderTemplate('user-invitation.html', { inviteUrl, data });
  //   const mailData = {
  //     email: user.email,
  //     name: user.name,
  //     subject: 'User Invitation Mail',
  //     text: mailBody,
  //     orgId: user.orgId,
  //     createdBy: req.user._id,
  //   };
  //   const result = await emailService.sendInvitationEmail(mailData);
  //   if (!result.success) {
  //     return res.status(httpStatus.CREATED).send({ user, message: 'User created but invitation mail failed' });
  //   }
  //   return res.status(httpStatus.CREATED).send({ user, message: 'User created and invited successfully' });
  // }
  res.status(httpStatus.CREATED).send(user);
});
const getRoles = catchAsync(async (req, res) => {
  // Use the new role priority system to get the effective role
  const effectiveRole = userRoleService.getEffectiveUserRole(req.user);
  const userRole = effectiveRole.roleName;
  let roles;
  // Get organization ID from request or user
  const orgId = req.orgId || req.user.orgId?.id || req.user.orgId;
  const allRoles = await userService.getRoles(orgId);
  if (userRole) {
    switch (userRole) {
      case 'SuperAdmin':
        // SuperAdmin can see all roles
        roles = allRoles;
        break;

      case 'Admin':
        // OrgAdmin cannot see SuperAdmin
        roles = allRoles.filter((role) => role.roleName !== 'SuperAdmin');
        break;

      case 'TeamManager':
        // TeamManager cannot see SuperAdmin and OrgAdmin
        roles = allRoles.filter(
          (role) => role.roleName !== 'SuperAdmin' && role.roleName !== 'Admin' && role.roleName !== 'SalesManager'
        );
        break;

      case 'SalesManager':
        // SalesManager cannot see SuperAdmin and OrgAdmin
        roles = allRoles.filter((role) => role.roleName !== 'SuperAdmin' && role.roleName !== 'Admin');
        break;

      case 'User':
        // User can only see their own role
        roles = allRoles.filter((role) => role.roleName === 'User' );
        break;

        case 'WorkflowManager':
          // User can only see their own role
          roles = allRoles.filter((role) => role.roleName === 'WorkflowManager' );
          break;

          case 'DealManager':
            // User can only see their own role
            roles = allRoles.filter((role) => role.roleName === 'DealManager' );
            break;

      default:
        roles = userRoles.map((r) => ({ roleName: r.roleName }));
        break;
    }
  } else {
    roles = [];
  }
  res.status(httpStatus.OK).send(roles);
});
const getAllRoles = catchAsync(async (req, res) => {
  const userRoles = req.user.roles;
  const userRole = userRoles && userRoles.length > 0 ? userRoles[0].roleName : null;
  let roles;
  // Get organization ID from request or user
  const orgId = req.orgId || req.user.orgId?.id || req.user.orgId;
  const allRoles = await userService.getRoles(orgId);
  if (userRole) {
    switch (userRole) {
      case 'SuperAdmin':
        roles = allRoles;
        break;

      default:
        roles = allRoles.filter((role) => role.roleName !== 'SuperAdmin');
        break;
    }
  } else {
    roles = [];
  }
  res.status(httpStatus.OK).send(roles);
});
const getUsers = catchAsync(async (req, res) => {
  let filter = { ...req.queryFilters, ...pick(req.query, ['query', 'role', 'status', 'searchTerm']) };
  filter = applyFilter(filter, '_id');
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  if (filter.status === 'Deleted') {
    if (!options.sortBy) {
      options.sortBy = 'updatedAt:desc';
    }
    const result = await userService.queryUsers(filter, options);
    res.send(result);
  } else {
    filter.status = { $ne: 'Deleted' };
    delete filter.data;
    options.populate = [{path: 'roles', select: 'roleName id'}];
    const result = await userService.queryUsers(filter, options);
    res.send(result);
  }
});

const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const getAllUsers = catchAsync(async (req, res) => {
  let filter = { ...req.queryFilters };
  filter = applyFilter(filter, '_id');
  filter.status = 'Active';

  if (req.query.query) {
    filter.$or = [{ name: { $regex: `\\b${req.query.query}`, $options: 'i' } }];
  }

  if (req.user.roles[0].roleName === 'User' || req.user.roles[0].roleName === 'WorkflowManager' || req.user.roles[0].roleName === 'DealManager') {
    const teams = await Team.find({ members: { $in: [req.user._id] } }).lean();
    const userTeamMembersSet = new Set();

    for (const team of teams) {
      team.members.forEach((memberId) => {
        userTeamMembersSet.add(memberId.toString());
      });
    }

    const userTeamMemberArray = [...userTeamMembersSet];
    const objectIds = userTeamMemberArray.map((id) => mongoose.Types.ObjectId(id));

    filter._id = { $in: objectIds };
  }

  delete filter.data;
  const users = await userService.getAllUsers(filter);
  res.send(users);
});

const getTeamUsers = catchAsync(async (req, res) => {
  const users = await userService.getTeamUsers(req.user._id);
  res.send(users);
});
const getAllNormalUsers = catchAsync(async (req, res) => {
  const users = await userService.getAllNormalUsers();
  res.send(users);
});
const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});
const updateUserPassword = catchAsync(async (req, res) => {
  const user = await userService.updateUserPasswordById(req.params.userId, req.body);
  res.send(user);
});
const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getRoles,
  getUser,
  updateUser,
  deleteUser,
  updateUserPassword,
  getAllUsers,
  getAllNormalUsers,
  getTeamUsers,
  getAllRoles,
};
