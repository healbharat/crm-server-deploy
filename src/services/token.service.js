const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../config/config');
const userService = require('./user.service');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * * @param {string} orgId
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, orgId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    orgId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};


/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

const verifyToken = async (token, type) => {
  try {
    // Fetch token document from the database
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found');
    }
    if (tokenDoc.blacklisted) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token has already been used');
    }

    // Verify the token
    const payload = jwt.verify(token, config.jwt.secret);

    // Check token type
    if (payload.type !== type) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
    }

    // Blacklist the token and save it
    tokenDoc.blacklisted = true;
    await tokenDoc.save();

    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(httpStatus.REQUEST_TIMEOUT, 'Token has expired');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token verification failed');
  }
};


/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, user.orgId, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, user.orgId, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, user.orgId, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return { resetPasswordToken, user };
};

const generateVerifyEmailToken = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This email is already verified');
  }
  const expires = moment().add(24, 'hours');
  const verifyEmailToken = generateToken(user.id, user.orgId, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return { verifyEmailToken, user };
};
/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateUserInviteToken = async (user) => {
  const expires = moment().add(24, 'hours');
  const userInviteToken = generateToken(user.id, user.orgId, expires, tokenTypes.USER_INVITE_TOKEN);
  await saveToken(userInviteToken, user.id, expires, tokenTypes.USER_INVITE_TOKEN);
  return userInviteToken;
};
const generateOrganizationInviteToken = async (userId, org) => {
  const expires = moment().add(24, 'hours');
  const payload = {
    sub: org.id,
    orgId: org.orgId,
    orgName: org.organizationName,
    iat: moment().unix(),
    exp: expires.unix(),
    type: tokenTypes.ORG_INVITE_TOKEN,
  };
  const orgInviteToken = jwt.sign(payload, config.jwt.secret);
  await saveToken(orgInviteToken, userId, expires, tokenTypes.ORG_INVITE_TOKEN);
  return orgInviteToken;
};
module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  generateUserInviteToken,
  generateOrganizationInviteToken,
};
