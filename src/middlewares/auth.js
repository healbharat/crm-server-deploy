const passport = require('passport');
const mongoose = require('mongoose');

const protect = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      // Check if the JWT strategy sent a specific error message
      const message = info.message || 'Unauthorized';
      return res.status(401).json({ message });
    }

    // Check if any of the user's roles is superAdmin
    const isSuperAdmin = user.roles.some((role) => role.roleName === 'SuperAdmin');

    // Attach the authenticated user to the request object
    req.user = user;

    if (isSuperAdmin) {
      const selectedOrgId = req.headers['x-org-id'];

      // Only set req.orgId if x-org-id is provided (i.e., if an organization is selected)
      if (selectedOrgId) {
        mongoose.Query.prototype.options.reqUserRole = '';
        req.orgId = selectedOrgId;
        mongoose.Query.prototype.reqOrgId = req.orgId;
      } else {
        // No orgId in headers means unrestricted access for SuperAdmin
        mongoose.Query.prototype.reqOrgId = null;
        mongoose.Query.prototype.options.reqUserRole = 'SuperAdmin';
      }
    } else {
      // Other users have their orgId added to queries by default
      req.orgId = user.orgId.id.toString();
      mongoose.Query.prototype.reqOrgId = req.orgId;
      mongoose.Query.prototype.options.reqUserRole = '';
    }

    next();
  })(req, res, next);
};

// /middleware/authorize.js
const checkPermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // const user = await User.findById(req.user._id).populate('roles');
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userPermissions = new Set();
      if (user.roles && Array.isArray(user.roles)) {
        user.roles.forEach((role) => {
          if (role && role.permissions && typeof role.permissions === 'object') {
            Object.keys(role.permissions).forEach((permission) => {
              if (role.permissions[permission]) {
                userPermissions.add(permission);
              }
            });
          }
        });
      }

      const hasPermission = requiredPermissions.some((permission) => userPermissions.has(permission));

      if (!hasPermission) {
        return res.status(403).json({ message: 'Access Denied: Insufficient Permissions' });
      }

      next();
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
};

module.exports = {
  protect,
  checkPermissions,
};
