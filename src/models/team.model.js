const mongoose = require('mongoose');

const { Schema } = mongoose;
const { toJSON, paginate, baseModelPlugin } = require('./plugins');
const tenantPlugin = require('./plugins/tenantPlugin');

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  icon: {
    type: String,
    trim: true,
  },
  bgIconColor: {
    type: String,
    trim: true,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
    },
  ],
  managers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model
    },
  ],
});

teamSchema.plugin(baseModelPlugin, {
  defaultCreatedBy: 'System', // Optional: Set a default createdBy value
  defaultUpdatedBy: 'System', // Optional: Set a default updatedBy value
});

teamSchema.plugin(tenantPlugin);
teamSchema.plugin(toJSON);
teamSchema.plugin(paginate);

teamSchema.index({ orgId: 1, teamName: 1 }); // Multi-tenant + team name filtering
teamSchema.index({ orgId: 1, owner: 1 }); // Multi-tenant + owner filtering
teamSchema.index({ orgId: 1, members: 1 }); // Multi-tenant + member filtering
teamSchema.index({ orgId: 1, managers: 1 }); // Multi-tenant + manager filtering
teamSchema.index({ orgId: 1, memberCount: 1 }); // Multi-tenant + member count filtering
teamSchema.index({ orgId: 1, createdDate: -1 }); // Multi-tenant + creation date sorting
teamSchema.index({ orgId: 1, teamName: 'text' }); // Text search on team names
teamSchema.index({ orgId: 1, owner: 1, memberCount: 1 }); // Owner + member count filtering
teamSchema.index({ orgId: 1, managers: 1, memberCount: 1 }); // Manager + member count filtering
teamSchema.index({ orgId: 1, members: 1, managers: 1 }); // Member + manager filtering
teamSchema.index({ orgId: 1, teamName: 1, owner: 1 }); // Team name + owner filtering
teamSchema.index({ orgId: 1, createdDate: -1, memberCount: 1 }); // Creation date + member count sorting
teamSchema.index({ orgId: 1, owner: 1, createdDate: -1 }); // Owner + creation date sorting
teamSchema.index({ orgId: 1, managers: 1, createdDate: -1 }); // Manager + creation date sorting

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
