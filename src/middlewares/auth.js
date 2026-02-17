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

    // Check if any of the user's roles is superAdmin or Admin
    const isSuperAdmin = user.roles.some((role) => role.roleName === 'SuperAdmin');
    const isAdmin = user.roles.some((role) => role.roleName === 'Admin');

    // Attach the authenticated user to the request object
    req.user = user;

    // Set user role for query filtering
    if (isSuperAdmin) {
      mongoose.Query.prototype.options.reqUserRole = 'SuperAdmin';
      mongoose.Query.prototype.options.skipDepartmentCheck = true;
      mongoose.Query.prototype.options.reqDepartments = []; // Clear departments for SuperAdmin
    } else if (isAdmin) {
      mongoose.Query.prototype.options.reqUserRole = 'Admin';
      mongoose.Query.prototype.options.skipDepartmentCheck = true;
      mongoose.Query.prototype.options.reqDepartments = []; // Clear departments for Admin
    } else {
      // Regular users - set department-based filtering
      mongoose.Query.prototype.options.reqUserRole = '';
      mongoose.Query.prototype.options.skipDepartmentCheck = false;
      
      // Set user's department(s) for query filtering
      if (user.department) {
        const departments = Array.isArray(user.department) ? user.department : [user.department];
        mongoose.Query.prototype.options.reqDepartments = departments.map(d => 
          typeof d === 'object' ? d._id || d.id : d
        );
      } else {
        mongoose.Query.prototype.options.reqDepartments = [];
      }
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
