const mongoose = require('mongoose');

module.exports = function baseModelPlugin(schema, options = {}) {
  schema.add({
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: options.orgIdRequired !== false,
    },
    updatedAt: {
      type: Date,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  });

  schema.pre('save', function (next) {
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    if (!this.createdBy && options && options.defaultCreatedBy) {
      this.createdBy = options.defaultCreatedBy;
    }
    this.updatedAt = new Date();
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.$set) {
      update.$set.updatedAt = new Date();
      if (!update.$set.updatedBy && options && options.defaultUpdatedBy) {
        update.$set.updatedBy = options.defaultUpdatedBy;
      }
    }
    next();
  });
};
