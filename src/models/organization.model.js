const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');

const organizationSchema = new mongoose.Schema({
  organizationName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
  },
  organizationLogo: {
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
  organizationPhone: {
    type: String,
    trim: true,
  },
  size: {
    type: Number,
  },
  customerId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Invited', 'Inactive', 'Active', 'Deleted'],
    default: 'Active',
  },
});

organizationSchema.plugin(baseModelPlugin, {
  orgIdRequired: false,
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});
organizationSchema.plugin(toJSON);
organizationSchema.plugin(paginate);
const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;
