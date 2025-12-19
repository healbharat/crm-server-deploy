const express = require('express');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/auth.validation');
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/verifyToken');
const checkUserExists = require('../middlewares/checkUserExists');

const authRateLimiter = require('../middlewares/rateLimiter'); // Import the rate limiter

const router = express.Router();
router.post('/register', checkUserExists, authRateLimiter, validate(authValidation.register), authController.registerUser);
router.post('/login', checkUserExists, authRateLimiter, validate(authValidation.login), authController.loginUser);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshTokens);
router.post(
  '/forgot-password',
  checkUserExists,
  authRateLimiter,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);
router.post('/google-login', validate(authValidation.googleLogin), authController.googleLoginUser);
router.post('/google-register', validate(authValidation.googleRegister), authController.googleRegisterUser);
router.get('/healthCheck', (req, res) => {
  res.status(200).json({ status: 'Healthy', message: 'Service is up and running' });
});

module.exports = router;
