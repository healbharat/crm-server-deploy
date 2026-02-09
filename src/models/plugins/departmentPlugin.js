/**
 * Department-based access control plugin
 * Automatically filters queries based on user's department access
 */
function departmentPlugin(schema) {
  // Pre-save middleware to set departments if not already set
  schema.pre('save', function (next) {
    if ((!this.departments || this.departments.length === 0) && this.reqDepartments) {
      this.departments = Array.isArray(this.reqDepartments) ? this.reqDepartments : [this.reqDepartments];
    }
    next();
  });

  // Middleware to apply department-based filtering to queries
  const applyDepartmentFilter = function (next) {
    const userRole = this.options.reqUserRole;
    const allowedDepartments = this.options.reqDepartments;
    const skipDepartmentCheck = this.options.skipDepartmentCheck;

    // Skip department check for SuperAdmin, Admin, or when explicitly requested
    if (skipDepartmentCheck || userRole === 'SuperAdmin' || userRole === 'Admin') {
      return next();
    }

    // Skip for Role model
    if (this.model.modelName === 'Role' || this.model.modelName === 'Department') {
      return next();
    }

    // Apply department filter if not already in query and departments are provided
    if (!this.getQuery().departments && allowedDepartments && allowedDepartments.length > 0) {
      this.where({ departments: { $in: allowedDepartments } });
    }

    next();
  };

  // Apply to any queries that start with 'find' or 'update'
  schema.pre(/^find/, applyDepartmentFilter);
  schema.pre(/^update/, applyDepartmentFilter);
  schema.pre(/^countDocuments/, applyDepartmentFilter);
}

module.exports = departmentPlugin;

