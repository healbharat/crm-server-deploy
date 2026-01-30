// /controllers/authController.js
const httpStatus = require('http-status');
const axios = require('axios');
const catchAsync = require('../utils/catchAsync');
const { authService, tokenService, userRoleService } = require('../services');
const config = require('../config/config');

const registerUser = catchAsync(async (req, res) => {
  const user = await authService.registerUser(req.body);
  
  // Exclude sensitive fields from user object
  const { password: _, permissions, userSettings, ...sanitizedUser } = user;
  
  res.status(200).json({
    user: sanitizedUser,
    message: 'User registered successfully',
  });
});

const loginUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.loginUser(email, password);
  // Initialize settings if user exists
  const effectiveRole = userRoleService.getEffectiveUserRole(user);
  // if (user && effectiveRole.roleName === 'Admin') {
  //   const { orgId, id: userId } = user;
  //   await settingService.initializeSettings(orgId, userId);
  //   await settingService.initializePermissionSettings(orgId, userId);
  // }
  
  // Exclude sensitive fields from user object
  const { password: _, permissions, userSettings, ...sanitizedUser } = user;
  
  res.status(200).json({
    user: sanitizedUser,
    tokens,
    message: 'User logged in successfully',
  });
});
const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const { resetPasswordToken, user } = await tokenService.generateResetPasswordToken(req.body.email);
  req.body.name = user.name;
  const resetPasswordUrl = `${config.domainUrl}#/reset-password?token=${resetPasswordToken}`;
  req.body.text = await emailService.renderTemplate('forget-password.html', {
    resetPasswordUrl,
  });
  req.body.subject = 'Forgot password';
  req.body.senderEmail = config.email.from;
  req.body.senderName = config.email.fromName;
  const result = await emailService.sendForgotPasswordEmail(user, req.body);
  if (result.success) {
    res.status(httpStatus.OK).send({
      message: 'Reset password email sent',
    });
  } else {
    res.status(httpStatus.BAD_REQUEST).send({
      message: 'Reset password email Failed',
    });
  }
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req);
  res.status(httpStatus.OK).send({ message: 'Password reset successfully' });
});

const googleLoginUser = catchAsync(async (req, res) => {
  const { token } = req.body;
  const { user, tokens } = await authService.googleLoginUser(token);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const effectiveRole = userRoleService.getEffectiveUserRole(user);
  if (user && effectiveRole.roleName === 'Admin') {
    await settingService.initializeSettings(user.orgId, user._id ? user._id : user.id);
    await settingService.initializePermissionSettings(user.orgId, user._id ? user._id : user.id);
  }
  
  // Exclude sensitive fields from user object
  const { password: _, permissions, userSettings, ...sanitizedUser } = user;
  
  res.status(200).json({
    user: sanitizedUser,
    tokens,
    message: 'User logged in with Google successfully',
  });
});

const googleRegisterUser = catchAsync(async (req, res) => {
  const { token, organizationName } = req.body;
  try {
    const { user, tokens } = await authService.googleRegisterUser(token, organizationName);
    
    // Exclude sensitive fields from user object
    const { password: _, permissions, userSettings, ...sanitizedUser } = user;
    
    res.status(200).json({
      user: sanitizedUser,
      tokens,
      message: 'User registered with Google successfully',
    });
    await settingService.initializeSettings(user.orgId, user._id ? user._id : user.id);
    await settingService.initializePermissionSettings(user.orgId, user._id ? user._id : user.id);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Registration failed' });
  }
});

module.exports = {
  registerUser,
  loginUser,
  resetPassword,
  refreshTokens,
  forgotPassword,
  googleLoginUser,
  googleRegisterUser,
};
