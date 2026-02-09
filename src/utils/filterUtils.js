/**
 * Apply department-based access control filters to query
 * @param {Object} filter - Base filter object
 * @param {Object} queryFilters - Query filters from middleware containing access level info
 * @returns {Object} - Updated filter with access control
 */
function applyDepartmentFilter(filter, queryFilters) {
  if (!queryFilters) {
    return filter;
  }

  const { accessLevel, userId, departments } = queryFilters;

  // SuperAdmin and Admin can see everything - no additional filters
  if (accessLevel === 'global' || accessLevel === 'admin') {
    return filter;
  }

  // Department manager can see all data in their department(s)
  if (accessLevel === 'department' && departments && departments.length > 0) {
    filter.departments = { $in: departments };
    return filter;
  }

  // Team member can see data in their department that they created or are assigned to
  if (accessLevel === 'team' && departments && departments.length > 0) {
    filter.$and = [
      { departments: { $in: departments } },
      {
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ]
      }
    ];
    return filter;
  }

  // Own: User can only see their own data in their department
  if (accessLevel === 'own' && departments && departments.length > 0) {
    filter.$and = [
      { departments: { $in: departments } },
      {
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ]
      }
    ];
    return filter;
  }

  // Fallback: only show user's own data
  if (userId) {
    filter.$or = [
      { createdBy: userId },
      { assignedTo: userId }
    ];
  }

  return filter;
}

/**
 * Legacy function for backward compatibility
 * Apply filter data to a specific key
 * @param {Object} filter - Filter object
 * @param {string} key - Key to apply filter to
 * @returns {Object} - Updated filter
 */
function applyFilter(filter, key) {
  if (filter.data) {
    if (Array.isArray(filter.data)) {
      filter[key] = { $in: filter.data };
    } else {
      filter[key] = filter.data;
    }
    delete filter.data;
  }
  return filter;
}

module.exports = { applyFilter, applyDepartmentFilter };
