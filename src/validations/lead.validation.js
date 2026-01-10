const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createLead = {
  body: Joi.object().keys({
    firstName: Joi.string().trim(),
    lastName: Joi.string().trim(),
    email: Joi.string().email().trim().lowercase(),
    phone: Joi.string().trim(),
    company: Joi.string().trim(),
    jobTitle: Joi.string().trim(),
    status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'Dead'),
    source: Joi.string().trim(),
    assignedTo: Joi.string().custom(objectId),
    value: Joi.number().min(0),
    currency: Joi.string().trim(),
    description: Joi.string().trim(),
    address: Joi.object({
      street: Joi.string().allow(null, ''),
      city: Joi.string().allow(null, ''),
      state: Joi.string().allow(null, ''),
      postalCode: Joi.string().allow(null, ''),
      country: Joi.string().allow(null, ''),
    }).optional(),
    website: Joi.string().uri().allow('', null).trim().optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
  }),
};

const getLeads = {
  query: Joi.object().keys({
    searchTerm: Joi.string(),
    id: Joi.string(),
    query: Joi.string(),
    status: Joi.string(),
    source: Joi.string(),
    assignedTo: Joi.string().custom(objectId),
    isConverted: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getLead = {
  params: Joi.object().keys({
    leadId: Joi.string().custom(objectId).required(),
  }),
};

const updateLead = {
  params: Joi.object().keys({
    leadId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      firstName: Joi.string().trim(),
      lastName: Joi.string().trim(),
      email: Joi.string().email().trim().lowercase(),
      phone: Joi.string().trim(),
      company: Joi.string().trim(),
      jobTitle: Joi.string().trim(),
      status: Joi.string().valid('New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'Dead'),
      source: Joi.string().trim(),
      assignedTo: Joi.string().custom(objectId),
      value: Joi.number().min(0),
      currency: Joi.string().trim(),
      description: Joi.string().trim(),
      address: Joi.object({
        street: Joi.string().allow(null, ''),
        city: Joi.string().allow(null, ''),
        state: Joi.string().allow(null, ''),
        postalCode: Joi.string().allow(null, ''),
        country: Joi.string().allow(null, ''),
      }).optional(),
      website: Joi.string().uri().allow('', null).trim(),
      tags: Joi.array().items(Joi.string().trim()),
      isConverted: Joi.boolean(),
      convertedTo: Joi.string().custom(objectId),
    })
    .min(1),
};

const deleteLead = {
  params: Joi.object().keys({
    leadId: Joi.string().custom(objectId).required(),
  }),
};

const addNote = {
  params: Joi.object().keys({
    leadId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    note: Joi.string().required(),
  }),
};

module.exports = {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addNote,
};

