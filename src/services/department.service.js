const httpStatus = require('http-status');
const { Department } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a department
 * @param {Object} departmentBody
 * @returns {Promise<Department>}
 */
const createDepartment = async (departmentBody) => {
  const department = await Department.create(departmentBody);
  return department;
};

/**
 * Query for departments
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryDepartments = async (filter, options) => {
  const departments = await Department.paginate(filter, options);
  return departments;
};

/**
 * Get department by id
 * @param {ObjectId} id
 * @returns {Promise<Department>}
 */
const getDepartmentById = async (id) => {
  return Department.findById(id).populate('managers', 'name email');
};

/**
 * Update department by id
 * @param {ObjectId} departmentId
 * @param {Object} updateBody
 * @returns {Promise<Department>}
 */
const updateDepartmentById = async (departmentId, updateBody) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }
  Object.assign(department, updateBody);
  await department.save();
  return department;
};

/**
 * Delete department by id
 * @param {ObjectId} departmentId
 * @returns {Promise<Department>}
 */
const deleteDepartmentById = async (departmentId) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }
  await department.remove();
  return department;
};

/**
 * Add manager to department
 * @param {ObjectId} departmentId
 * @param {ObjectId} userId
 * @returns {Promise<Department>}
 */
const addManagerToDepartment = async (departmentId, userId) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  if (!department.managers.includes(userId)) {
    department.managers.push(userId);
    await department.save();
  }

  return department;
};

/**
 * Remove manager from department
 * @param {ObjectId} departmentId
 * @param {ObjectId} userId
 * @returns {Promise<Department>}
 */
const removeManagerFromDepartment = async (departmentId, userId) => {
  const department = await getDepartmentById(departmentId);
  if (!department) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
  }

  department.managers = department.managers.filter(
    managerId => managerId.toString() !== userId.toString()
  );
  await department.save();

  return department;
};

module.exports = {
  createDepartment,
  queryDepartments,
  getDepartmentById,
  updateDepartmentById,
  deleteDepartmentById,
  addManagerToDepartment,
  removeManagerFromDepartment,
};

