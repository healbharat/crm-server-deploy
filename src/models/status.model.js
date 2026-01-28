const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');
const tenantPlugin = require('./plugins/tenantPlugin');

const statusSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  associatedTo: {
    type: String,
    required: true,
    enum: ['lead', 'deal'],
    trim: true,
  },
  color: {
    type: String,
    trim: true,
    validate: {
      validator: function(value) {
        // Validate hex color format (e.g., #FFFFFF or #FFF)
        return !value || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
      },
      message: 'Color must be a valid hex color code (e.g., #FFFFFF or #FFF)',
    },
  },
  description: {
    type: String,
    trim: true,
  },
});

statusSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});

statusSchema.plugin(tenantPlugin);
statusSchema.plugin(toJSON);
statusSchema.plugin(paginate);

// Indexes for efficient queries
statusSchema.index({ orgId: 1, name: 1 }); // Multi-tenant + name lookups
statusSchema.index({ orgId: 1, associatedTo: 1 }); // Multi-tenant + associatedTo filtering
statusSchema.index({ orgId: 1, name: 'text', description: 'text' }); // Text search
statusSchema.index({ orgId: 1, createdAt: -1 }); // Date-based queries
statusSchema.index({ orgId: 1, associatedTo: 1, createdAt: -1 }); // associatedTo + date queries

/**
 * @typedef Status
 */
const Status = mongoose.model('Status', statusSchema);

module.exports = Status;

