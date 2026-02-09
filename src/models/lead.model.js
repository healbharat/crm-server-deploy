const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');

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
  departments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
  ],
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
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

leadSchema.plugin(toJSON);
leadSchema.plugin(paginate);

// Indexes for efficient queries
leadSchema.index({ departments: 1 }); // Department-based filtering
leadSchema.index({ departments: 1, email: 1 }); // Department + email lookups
leadSchema.index({ departments: 1, status: 1 }); // Department + status filtering
leadSchema.index({ departments: 1, assignedTo: 1 }); // Department + assignedTo filtering
leadSchema.index({ departments: 1, source: 1 }); // Department + source filtering
leadSchema.index({ departments: 1, createdBy: 1 }); // Department + createdBy filtering
leadSchema.index({ company: 'text', firstName: 'text', lastName: 'text' }); // Text search
leadSchema.index({ createdAt: -1 }); // Date-based queries
leadSchema.index({ status: 1, createdAt: -1 }); // Status + date queries
leadSchema.index({ assignedTo: 1, status: 1 }); // AssignedTo + status filtering
leadSchema.index({ createdBy: 1 }); // CreatedBy filtering
leadSchema.index({ isConverted: 1 }); // Conversion status filtering
leadSchema.index({ value: -1 }); // Value-based sorting

/**
 * @typedef Lead
 */
const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;

