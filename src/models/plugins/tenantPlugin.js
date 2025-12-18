function tenantPlugin(schema) {
  // Pre-save middleware to set orgId if it's not already set
  schema.pre('save', function (next) {
    if (!this.orgId && this.reqOrgId) {
      this.orgId = this.reqOrgId; // Set orgId from request context
    }
    next();
  });

  // Middleware to apply orgId to all find and update queries
  const applyOrgIdFilter = function (next) {
    console.log('calling tenant.......................');
    if (this.options.reqUserRole !== 'SuperAdmin' && this.model.modelName !== 'Role' && !this.options.skipOrgIdCheck) {
      if (!this.getQuery().orgId && this.reqOrgId) {
        this.where({ orgId: this.reqOrgId });
      }
    }
    next();
  };

  // Apply to any queries that start with 'find' or 'update'
  schema.pre(/^find/, applyOrgIdFilter);
  schema.pre(/^update/, applyOrgIdFilter);
  schema.pre(/^countDocuments/, applyOrgIdFilter);
}

module.exports = tenantPlugin;
