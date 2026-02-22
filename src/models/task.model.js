const mongoose = require('mongoose');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');

const taskSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['todo', 'done'],
    default: 'todo',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  associatedLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
  },
  associatedDeal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
  },
  dueDate: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
});

taskSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});

taskSchema.plugin(toJSON);
taskSchema.plugin(paginate);

// Indexes for efficient queries
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ associatedLead: 1 });
taskSchema.index({ associatedDeal: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ name: 'text', description: 'text' });

/**
 * @typedef Task
 */
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
