const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');
const tenantPlugin = require('./plugins/tenantPlugin');

const leadSchema = mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate(value) {
      if (value && !validator.isEmail(value)) {
        throw new Error('Invalid email');
      }
    },
  },
  phone: {
    type: String,
    trim: true,
  },
  company: {
    type: String,
    trim: true,
  },
  jobTitle: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost', 'Dead'],
    default: 'New',
  },
  source: {
    type: String,
    trim: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  value: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  website: {
    type: String,
    trim: true,
    validate(value) {
      if (value && !validator.isURL(value)) {
        throw new Error('Invalid URL');
      }
    },
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  notes: [
    {
      note: String,
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isConverted: {
    type: Boolean,
    default: false,
  },
  convertedAt: {
    type: Date,
  },
  convertedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal', // Reference to Deal model if exists
  },
});

leadSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});

leadSchema.plugin(tenantPlugin);
leadSchema.plugin(toJSON);
leadSchema.plugin(paginate);

// Indexes for efficient queries
leadSchema.index({ orgId: 1, email: 1 }); // Multi-tenant + email lookups
leadSchema.index({ orgId: 1, status: 1 }); // Multi-tenant + status filtering
leadSchema.index({ orgId: 1, assignedTo: 1 }); // Multi-tenant + assignedTo filtering
leadSchema.index({ orgId: 1, source: 1 }); // Multi-tenant + source filtering
leadSchema.index({ orgId: 1, company: 'text', firstName: 'text', lastName: 'text' }); // Text search
leadSchema.index({ orgId: 1, createdAt: -1 }); // Date-based queries
leadSchema.index({ orgId: 1, status: 1, createdAt: -1 }); // Status + date queries
leadSchema.index({ orgId: 1, assignedTo: 1, status: 1 }); // AssignedTo + status filtering
leadSchema.index({ orgId: 1, isConverted: 1 }); // Conversion status filtering
leadSchema.index({ orgId: 1, value: -1 }); // Value-based sorting

/**
 * @typedef Lead
 */
const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;

