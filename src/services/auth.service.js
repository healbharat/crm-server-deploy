const mongoose = require('mongoose');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { User, Organization, Role } = require('../models');
const { tokenTypes } = require('../config/tokens');
const tokenService = require('./token.service');
const userService = require('./user.service');
// const { PLANS } = require('../constants');
// const Plan = require('../models/plan.model');
// const subscriptionHelper = require('../utils/subscription.helper');
const config = require('../config/config');
// const stripe = require('stripe')(config.stripeSecrateKey);
// const { createDefaultPipelinesForOrg } = require('../utils/defaultPipeline');
const { OAuth2Client } = require('google-auth-library');
const { aggregateUserPermissions } = require('../utils/roleUtils');

const registerUser = async (userData) => {
  const { name, email, password, department, address = {} } = userData;

  const userExists = await User.findOne({ email }).setOptions({
    skipOrgIdCheck: true,
  });
  if (userExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  let role;
  // Only create organization if it doesn't exist

  role = await Role.findOne({ roleName: 'User' }).setOptions({
    skipOrgIdCheck: true,
  });


  const user = await User.create({
    name,
    email,
    password,
    department,
    roles: [role._id],
    status: 'Active'
  });

  // await createDefaultPipelinesForOrg(org._id, user._id);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    department: user.department,
  };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email })
    .populate({
      path: 'roles',
      select: 'roleName',
      options: { skipOrgIdCheck: true },
    })
    .setOptions({
      skipOrgIdCheck: true,
    });

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }
  if (user.status !== 'Active') {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Your account is not active. Please contact support.');
  }
  // if (!user.isEmailVerified) {
  //   throw new ApiError(httpStatus.UNAUTHORIZED, 'Please verify your email address. Check your inbox for the verification link.');
  // }
  const isPasswordMatch = await user.isPasswordMatch(password);
  if (!isPasswordMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const tokens = await tokenService.generateAuthTokens(user);
  // Safely access the profileImage fileUrl if it exists
  const profileImageUrl = user.profileImage ? user.profileImage.fileUrl : '';

  // Aggregate permissions from all user roles
  const aggregatedPermissions = await aggregateUserPermissions(user.roles);

  // Add aggregated permissions to user object
  const userWithPermissions = {
    ...user.toObject(),
    id: user._id,
    permissions: aggregatedPermissions
  };

  return {
    user: userWithPermissions,
    tokens,
  };
};

const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    mongoose.Query.prototype.reqOrgId = refreshTokenDoc.orgId;
    const user = await User.findOne({ _id: refreshTokenDoc.sub });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

// Reset user password
const resetPassword = async (req) => {
  const resetPasswordToken = req.query.token;
  const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
  mongoose.Query.prototype.reqOrgId = resetPasswordTokenDoc.orgId;
  const user = await userService.getUserById(resetPasswordTokenDoc.sub);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  Object.assign(user, req.body);
  await user.save();
};

// Accept invitation
const acceptInvitation = async (inviteToken, userData) => {
  const inviteTokenDoc = await tokenService.verifyToken(inviteToken, tokenTypes.USER_INVITE_TOKEN);

  const user = await User.findById(inviteTokenDoc.sub).setOptions({
    skipOrgIdCheck: true,
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  Object.assign(user, userData);
  await user.save();
};

const acceptOrgInvitation = async (inviteToken, userData) => {
  const { firstName, lastName, password } = userData;
  const inviteTokenDoc = await tokenService.verifyToken(inviteToken, tokenTypes.ORG_INVITE_TOKEN);
  const organization = await Organization.findById(inviteTokenDoc.sub).setOptions({
    skipOrgIdCheck: true,
  });
  if (!organization) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Organization not found');
  }
  // Update the organization's status
  organization.status = 'Active';
  await organization.save();

  const userExists = await User.findOne({
    email: organization.orgEmail,
  }).setOptions({
    skipOrgIdCheck: true,
  });
  if (userExists) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists');
  }
  const role = await Role.findOne({ roleName: 'Admin' }).setOptions({
    skipOrgIdCheck: true,
  });

  const newUser = await User.create({
    name: `${firstName} ${lastName}`,
    email: organization.email,
    password,
    isEmailVerified: true,
    orgId: inviteTokenDoc.sub,
    roles: [role._id],
  });
  return newUser;
};

const verifiedEmail = async (verifyToken) => {
  const inviteTokenDoc = await tokenService.verifyToken(verifyToken, tokenTypes.VERIFY_EMAIL);
  const user = await User.findById(inviteTokenDoc.sub).setOptions({
    skipOrgIdCheck: true,
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }
  user.isEmailVerified = true;
  await user.save();
};

const googleLoginUser = async (googleToken) => {
  const client = new OAuth2Client();
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: config.googleClientId,
    });
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }
  const payload = ticket.getPayload();
  const email = payload.email;
  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Google account has no email');
  }
  // Find user by email
  let user = await User.findOne({ email }).populate({
    path: 'roles',
    select: 'roleName',
    options: { skipOrgIdCheck: true },
  }).setOptions({ skipOrgIdCheck: true });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User not found. Please Sign Up first.');
  }
  if (user.status !== 'Active') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Login user is not active');
  }
  const tokens = await tokenService.generateAuthTokens(user);

  // Aggregate permissions from all user roles
  const aggregatedPermissions = await aggregateUserPermissions(user.roles);

  // Add aggregated permissions to user object
  const userWithPermissions = {
    ...user.toObject(),
    id: user._id,
    permissions: aggregatedPermissions
  };

  return { user: userWithPermissions, tokens };
};

const googleRegisterUser = async (googleToken, organizationName) => {
  const client = new OAuth2Client();
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: config.googleClientId,
    });
  } catch (err) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid Google token');
  }
  const payload = ticket.getPayload();
  const email = payload.email;
  if (!email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Google account has no email');
  }
  let user = await User.findOne({ email }).setOptions({ skipOrgIdCheck: true });
  if (user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists.');
  }
  let org = await Organization.findOne({ organizationName }).setOptions({ skipOrgIdCheck: true });
  if (org) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Organization already exists');
  }
  org = await Organization.create({
    organizationName,
    email,
  });
  org.orgId = org._id;
  await org.save();
  const role = await Role.findOne({ roleName: 'Admin' }).setOptions({ skipOrgIdCheck: true });
  user = await User.create({
    name: payload.name || email,
    email,
    orgId: org._id,
    roles: [role],
    isOwner: true,
    isEmailVerified: true,
    status: 'Active',
  });
  // await createDefaultPipelinesForOrg(org._id, user._id);
  const tokens = await tokenService.generateAuthTokens(user);
  return { user, tokens };
};

module.exports = {
  registerUser,
  loginUser,
  refreshAuth,
  acceptInvitation,
  resetPassword,
  acceptOrgInvitation,
  verifiedEmail,
  googleLoginUser,
  googleRegisterUser,
};
