const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createTask = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().optional(),
    status: Joi.string().valid('todo', 'done').optional(),
    assignedTo: Joi.string().custom(objectId).optional(),
    associatedLead: Joi.string().custom(objectId).optional(),
    associatedDeal: Joi.string().custom(objectId).optional(),
    dueDate: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
  }),
};

const getTasks = {
  query: Joi.object().keys({
    assignedTo: Joi.string().custom(objectId),
    status: Joi.string().valid('todo', 'done'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    associatedLead: Joi.string().custom(objectId),
    associatedDeal: Joi.string().custom(objectId),
    createdBy: Joi.string().custom(objectId),
    dueDate: Joi.date(),
    searchTerm: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
};

const updateTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim(),
      status: Joi.string().valid('todo', 'done'),
      assignedTo: Joi.string().custom(objectId),
      associatedLead: Joi.string().custom(objectId),
      associatedDeal: Joi.string().custom(objectId),
      dueDate: Joi.date(),
      priority: Joi.string().valid('low', 'medium', 'high'),
    })
    .min(1),
};

const deleteTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required(),
  }),
};

const getTasksDueToday = {
  query: Joi.object().keys({
    assignedTo: Joi.string().custom(objectId),
    status: Joi.string().valid('todo', 'done'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getOverdueTasks = {
  query: Joi.object().keys({
    assignedTo: Joi.string().custom(objectId),
    priority: Joi.string().valid('low', 'medium', 'high'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  getTasksDueToday,
  getOverdueTasks,
};
