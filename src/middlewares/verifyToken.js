// verifyToken.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];

  if (!token) {
    return next(new ApiError(401, 'Unauthorized: Token not provided'));
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return next(new ApiError(401, 'Unauthorized: Invalid token'));
    }
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
