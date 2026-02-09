const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    department: Joi.string().custom(objectId).required(),
    address: Joi.object({
      street: Joi.string().allow(null, ''),
      city: Joi.string().allow(null, ''),
      state: Joi.string().allow(null, ''),
      postalCode: Joi.string().allow(null, ''),
      country: Joi.string().allow(null, ''),
    }).optional(),
    recaptchaResponse: Joi.string().allow(null, ''),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const googleLogin = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const googleRegister = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    organizationName: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  refreshTokens,
  forgotPassword,
  resetPassword,
  googleLogin,
  googleRegister,
};
