const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');
const tenantPlugin = require('./plugins/tenantPlugin');

const dealSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
  },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status',
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  expectedCloseDate: {
    type: Date,
  },
  actualCloseDate: {
    type: Date,
  },
});

dealSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});

dealSchema.plugin(tenantPlugin);
dealSchema.plugin(toJSON);
dealSchema.plugin(paginate);

// Indexes for efficient queries
dealSchema.index({ orgId: 1, name: 1 }); // Multi-tenant + name lookups
dealSchema.index({ orgId: 1, status: 1 }); // Multi-tenant + status filtering
dealSchema.index({ orgId: 1, lead: 1 }); // Multi-tenant + lead filtering
dealSchema.index({ orgId: 1, createdBy: 1 }); // Multi-tenant + createdBy filtering
dealSchema.index({ orgId: 1, name: 'text', description: 'text' }); // Text search
dealSchema.index({ orgId: 1, createdAt: -1 }); // Date-based queries
dealSchema.index({ orgId: 1, status: 1, createdAt: -1 }); // Status + date queries
dealSchema.index({ orgId: 1, amount: -1 }); // Amount-based sorting
dealSchema.index({ orgId: 1, expectedCloseDate: 1 }); // Expected close date queries

/**
 * @typedef Deal
 */
const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;

