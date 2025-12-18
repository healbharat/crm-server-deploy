const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate, baseModelPlugin } = require('./plugins');
const tenantPlugin = require('./plugins/tenantPlugin');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error('Invalid email');
      }
    },
  },
  profileImage: String,
  password: {
    type: String,
    minlength: 6,
    private: true,
    validate: {
      validator(value) {
        return this.isInvite ? true : !!value;
      },
      message: 'Password is required for registration',
    },
  },
  roles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
    },
  ],
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['Invited', 'Inactive', 'Active', 'Deleted'],
    default: 'Active',
  },
  userSettings: {
    sidebarCompact: {
      type: Boolean,
      default: false,
    },
  },
});

userSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System',
  defaultUpdatedBy: 'System',
});
// add plugin that converts mongoose to json
userSchema.plugin(tenantPlugin);
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

userSchema.index({ orgId: 1, email: 1 }); // Multi-tenant + email lookups
userSchema.index({ orgId: 1, status: 1 }); // Multi-tenant + status filtering
userSchema.index({ orgId: 1, name: 'text' }); // Text search on names
userSchema.index({ orgId: 1, roles: 1 }); // Role-based filtering
userSchema.index({ orgId: 1, isOwner: 1 }); // Owner filtering
userSchema.index({ orgId: 1, isEmailVerified: 1 }); // Email verification status
userSchema.index({ orgId: 1, createdAt: -1 }); // Date-based queries
userSchema.index({ orgId: 1, status: 1, createdAt: -1 }); // Status + date queries
userSchema.index({ orgId: 1, roles: 1, status: 1 }); // Role + status filtering
userSchema.index({ email: 1 }); // Global email lookup (for authentication)

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } }).setOptions({
    skipOrgIdCheck: true,
  });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.methods.setInviteStatus = function (isInvite) {
  this.isInvite = isInvite;
};
userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.statics.getLeadUsers = async function (filter, orgId) {
  const pipeline = [];

  // Step 1: Match users based on filter criteria
  const matchConditions = {};

  if (filter?.assignedTo?.$in) {
    matchConditions._id = {
      $in: filter.assignedTo.$in.map((id) => mongoose.Types.ObjectId(id)),
    };
  }

  if (orgId) {
    matchConditions.orgId = mongoose.Types.ObjectId(orgId);
  }

  // Exclude users with status 'Deleted'
  matchConditions.status = { $ne: 'Deleted' };

  pipeline.push({ $match: matchConditions });

  // Lookup leads created by users
  pipeline.push({
    $lookup: {
      from: 'leads',
      localField: '_id',
      foreignField: 'assignedTo',
      as: 'lead',
    },
  });

  pipeline.push(
    {
      $match: {
        'lead.0': { $exists: true },
      },
    },
    {
      $project: {
        lead: 0,
      },
    }
  );

  // Execute the aggregation pipeline
  const result = await this.aggregate(pipeline);

  return result;
};

userSchema.statics.getDealUsers = async function (filter, orgId) {
  const pipeline = [];

  // Step 1: Build match conditions
  const matchConditions = {};

  if (filter?.assignedTo?.$in) {
    matchConditions._id = {
      $in: filter.assignedTo.$in.map((id) => mongoose.Types.ObjectId(id)),
    };
  }

  if (orgId) {
    matchConditions.orgId = mongoose.Types.ObjectId(orgId);
  }

  // Exclude users with status 'Deleted'
  matchConditions.status = { $ne: 'Deleted' };

  pipeline.push({ $match: matchConditions });

  // Lookup deals created by users
  pipeline.push({
    $lookup: {
      from: 'deals',
      localField: '_id',
      foreignField: 'assignedTo',
      as: 'deal',
    },
  });

  pipeline.push(
    {
      $match: {
        'deal.0': { $exists: true },
      },
    },
    {
      $project: {
        deal: 0,
      },
    }
  );

  // Execute the aggregation pipeline
  const result = await this.aggregate(pipeline);

  return result;
};
/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
