const httpStatus = require('http-status');
const { Task } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a task
 * @param {Object} taskBody
 * @returns {Promise<Task>}
 */
const createTask = async (taskBody) => {
  const task = await Task.create(taskBody);
  return task;
};

/**
 * Query for tasks
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTasks = async (filter, options) => {
  let query = {};

  if (filter.assignedTo) {
    query.assignedTo = filter.assignedTo;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.priority) {
    query.priority = filter.priority;
  }

  if (filter.associatedLead) {
    query.associatedLead = filter.associatedLead;
  }

  if (filter.associatedDeal) {
    query.associatedDeal = filter.associatedDeal;
  }

  if (filter.createdBy) {
    query.createdBy = filter.createdBy;
  }

  if (filter.dueDate) {
    query.dueDate = filter.dueDate;
  }

  if (filter.query || filter.searchTerm) {
    const searchTerm = filter.query || filter.searchTerm;
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  options.populate = [
    { path: 'assignedTo', select: 'name email' },
    { path: 'associatedLead', select: 'firstName lastName company email' },
    { path: 'associatedDeal', select: 'name amount' },
    { path: 'createdBy', select: 'name email' },
    { path: 'updatedBy', select: 'name email' },
  ];

  const tasks = await Task.paginate(query, options);
  return tasks;
};

/**
 * Get task by id
 * @param {ObjectId} id
 * @returns {Promise<Task>}
 */
const getTaskById = async (id) => {
  return Task.findById(id)
    .populate({ path: 'assignedTo', select: 'name email' })
    .populate({ path: 'associatedLead', select: 'firstName lastName company email' })
    .populate({ path: 'associatedDeal', select: 'name amount' })
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' });
};

/**
 * Update task by id
 * @param {ObjectId} taskId
 * @param {Object} updateBody
 * @returns {Promise<Task>}
 */
const updateTaskById = async (taskId, updateBody) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  Object.assign(task, updateBody);
  await task.save();
  return task;
};

/**
 * Delete task by id
 * @param {ObjectId} taskId
 * @returns {Promise<Task>}
 */
const deleteTaskById = async (taskId) => {
  const task = await getTaskById(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  await task.remove();
  return task;
};

/**
 * Get tasks due today
 * @param {Object} filter - Additional filter criteria
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksDueToday = async (filter, options) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayFilter = {
    ...filter,
    dueDate: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  };

  return queryTasks(todayFilter, options);
};

/**
 * Get overdue tasks
 * @param {Object} filter - Additional filter criteria
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getOverdueTasks = async (filter, options) => {
  const now = new Date();
  
  const overdueFilter = {
    ...filter,
    status: 'todo',
    dueDate: {
      $lt: now,
    },
  };

  return queryTasks(overdueFilter, options);
};

module.exports = {
  createTask,
  queryTasks,
  getTaskById,
  updateTaskById,
  deleteTaskById,
  getTasksDueToday,
  getOverdueTasks,
};
