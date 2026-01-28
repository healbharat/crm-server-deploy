const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createStatus = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    associatedTo: Joi.string().valid('lead', 'deal').required(),
    color: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #FFFFFF or #FFF)',
    }),
    description: Joi.string().trim().allow('').optional(),
  }),
};

const getStatuses = {
  query: Joi.object().keys({
    searchTerm: Joi.string(),
    id: Joi.string(),
    query: Joi.string(),
    associatedTo: Joi.string().valid('lead', 'deal'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getStatus = {
  params: Joi.object().keys({
    statusId: Joi.string().custom(objectId).required(),
  }),
};

const updateStatus = {
  params: Joi.object().keys({
    statusId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      associatedTo: Joi.string().valid('lead', 'deal'),
      color: Joi.string().trim().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional().messages({
        'string.pattern.base': 'Color must be a valid hex color code (e.g., #FFFFFF or #FFF)',
      }),
      description: Joi.string().trim().allow(''),
    })
    .min(1),
};

const deleteStatus = {
  params: Joi.object().keys({
    statusId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createStatus,
  getStatuses,
  getStatus,
  updateStatus,
  deleteStatus,
};

