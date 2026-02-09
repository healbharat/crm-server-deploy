const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');

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
  departments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
  ],
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

dealSchema.plugin(toJSON);
dealSchema.plugin(paginate);

// Indexes for efficient queries
dealSchema.index({ departments: 1 }); // Department-based filtering
dealSchema.index({ departments: 1, name: 1 }); // Department + name lookups
dealSchema.index({ departments: 1, status: 1 }); // Department + status filtering
dealSchema.index({ departments: 1, lead: 1 }); // Department + lead filtering
dealSchema.index({ departments: 1, createdBy: 1 }); // Department + createdBy filtering
dealSchema.index({ name: 'text', description: 'text' }); // Text search
dealSchema.index({ createdAt: -1 }); // Date-based queries
dealSchema.index({ status: 1, createdAt: -1 }); // Status + date queries
dealSchema.index({ createdBy: 1 }); // CreatedBy filtering
dealSchema.index({ amount: -1 }); // Amount-based sorting
dealSchema.index({ expectedCloseDate: 1 }); // Expected close date queries

/**
 * @typedef Deal
 */
const Deal = mongoose.model('Deal', dealSchema);

module.exports = Deal;

