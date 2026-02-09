const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');

const departmentSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  managers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
});

departmentSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});

departmentSchema.plugin(toJSON);
departmentSchema.plugin(paginate);

// Indexes for efficient queries
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1 });
departmentSchema.index({ managers: 1 });

/**
 * @typedef Department
 */
const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;

