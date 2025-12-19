const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().custom(password),
    name: Joi.string().required(),
    roles: Joi.array().items(Joi.string().custom(objectId)),
    profileImage: Joi.string().allow(''),
    status: Joi.string().default('Active'),
    orgId: Joi.string().custom(objectId),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    searchTerm: Joi.string(),
    id: Joi.string(),
    query: Joi.string(),
    roles: Joi.string(),
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      roles: Joi.array().items(Joi.string().custom(objectId)),
      profileImage: Joi.string().allow(''),
      status: Joi.string(),
      orgId: Joi.string().custom(objectId),
      isOwner: Joi.boolean(),
      userSettings: Joi.object().keys({
        sidebarCompact: Joi.boolean(),
      }),
    })
    .min(1),
};
const updateUserPassword = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      password: Joi.string().custom(password),
      oldPassword: Joi.string().required(),
    })
    .min(1),
};
const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserPassword,
};
