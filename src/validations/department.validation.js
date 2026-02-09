const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDepartment = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().optional(),
    managers: Joi.array().items(Joi.string().custom(objectId)).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const getDepartments = {
  query: Joi.object().keys({
    name: Joi.string(),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
};

const updateDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim(),
      managers: Joi.array().items(Joi.string().custom(objectId)),
      isActive: Joi.boolean(),
    })
    .min(1),
};

const deleteDepartment = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
};

const addManager = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

const removeManager = {
  params: Joi.object().keys({
    departmentId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    userId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  addManager,
  removeManager,
};

