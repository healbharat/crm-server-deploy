const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createDeal = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().optional(),
    amount: Joi.number().min(0).required(),
    currency: Joi.string().trim().optional(),
    lead: Joi.string().custom(objectId).required(),
    status: Joi.string().valid(
      'Qualification',
      'Needs Analysis',
      'Value Proposition',
      'Id. Decision Makers',
      'Perception Analysis',
      'Proposal/Price Quote',
      'Negotiation/Review',
      'Closed Won',
      'Closed Lost'
    ).optional(),
    tags: Joi.array().items(Joi.string().trim()).optional(),
    expectedCloseDate: Joi.date().optional(),
  }),
};

const getDeals = {
  query: Joi.object().keys({
    searchTerm: Joi.string(),
    id: Joi.string(),
    query: Joi.string(),
    status: Joi.string(),
    lead: Joi.string().custom(objectId),
    createdBy: Joi.string().custom(objectId),
    tag: Joi.string(),
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(0),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getDeal = {
  params: Joi.object().keys({
    dealId: Joi.string().custom(objectId).required(),
  }),
};

const updateDeal = {
  params: Joi.object().keys({
    dealId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim(),
      amount: Joi.number().min(0),
      currency: Joi.string().trim(),
      lead: Joi.string().custom(objectId),
      status: Joi.string().valid(
        'Qualification',
        'Needs Analysis',
        'Value Proposition',
        'Id. Decision Makers',
        'Perception Analysis',
        'Proposal/Price Quote',
        'Negotiation/Review',
        'Closed Won',
        'Closed Lost'
      ),
      tags: Joi.array().items(Joi.string().trim()),
      expectedCloseDate: Joi.date().optional(),
      actualCloseDate: Joi.date().optional(),
    })
    .min(1),
};

const deleteDeal = {
  params: Joi.object().keys({
    dealId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createDeal,
  getDeals,
  getDeal,
  updateDeal,
  deleteDeal,
};

