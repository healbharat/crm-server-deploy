const rateLimit = require('express-rate-limit');

// Rate limiter for authenticated users (per user ID)
const userAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 failed attempts per user (easier for testing)
  skipSuccessfulRequests: true,
  message: {
    code: 429,
    message: 'Too many login attempts for this account. Please try again after 15 minutes.',
  },
  keyGenerator: (req) => {
    return req.user && req.user._id ? req.user._id.toString() : 'no-user';
  },
  skip: (req) => !req.user || !req.user._id, // Skip if no user found
});

// Rate limiter for all login attempts (per IP address)
const ipAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP (safety net for extreme abuse)
  skipSuccessfulRequests: true,
  message: {
    code: 429,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for non-existent emails (prevents enumeration)
const emailEnumerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per IP for non-existent emails
  skipSuccessfulRequests: true,
  message: {
    code: 429,
    message: 'Too many login attempts. Please try again after 1 hour or contact support if you need assistance.',
  },
  skip: (req) => req.user && req.user._id, // Only apply if user doesn't exist
});

// Combined middleware that applies multiple rate limiters
// Flow:
// 1. IP Limiter (10 attempts) - catches extreme abuse
// 2a. If valid email: User Limiter (3 attempts) - protects account
// 2b. If fake email: Enumeration Limiter (5 attempts/1hr) - prevents email discovery
const authRateLimiter = (req, res, next) => {
  // Always apply IP-based rate limiting first (safety net)
  ipAuthLimiter(req, res, (err) => {
    if (err) return next(err);

    // If user exists, apply user-based rate limiting (stricter)
    if (req.user && req.user._id) {
      return userAuthLimiter(req, res, next);
    }
    // If user doesn't exist, apply enumeration protection (will trigger before IP limit)
    return emailEnumerationLimiter(req, res, next);
  });
};

module.exports = authRateLimiter;
