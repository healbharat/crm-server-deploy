function addOrgIdMiddleware(schema) {
  // Helper function to check if orgId should be enforced
  const checkOrgId = function (next) {
    const userRole = this.options.reqUserRole;

    // Skip orgId check for SuperAdmin, if model is Role, or skipOrgIdCheck is set
    if (userRole === 'SuperAdmin' || this.options.skipOrgIdCheck || this.model.modelName === 'Role') {
      return next();
    }

    // Check for orgId in both query conditions and updates
    const query = this.getQuery();
    const update = this.getUpdate && this.getUpdate(); // Only check for updates if they exist

    if (!query.orgId && (!update || !update.orgId)) {
      return next(new Error('orgId is required for all queries and updates'));
    }

    next();
  };

  // Apply middleware to all 'find' and 'update' operations
  schema.pre(/^find/, checkOrgId);
  schema.pre(/^update/, checkOrgId);
}

module.exports = addOrgIdMiddleware;
