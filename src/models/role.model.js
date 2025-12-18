const mongoose = require('mongoose');
const { baseModelPlugin } = require('./plugins');

const roleSchema = new mongoose.Schema(
  {
    roleName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    isSystemRole: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    permissions: {
      canViewOrganizations: { type: Boolean, default: false },
      canViewOwnOrganization: { type: Boolean, default: false },
      canCreateOrganizations: { type: Boolean, default: false },
      canUpdateOrganizations: { type: Boolean, default: false },
      canDeleteOrganizations: { type: Boolean, default: false },
      canViewRoles: { type: Boolean, default: false },
      canManageRoles: { type: Boolean, default: false },
      canViewUsers: { type: Boolean, default: false },
      canViewManageOwnUser: { type: Boolean, default: true },
      canUpdateUser: { type: Boolean, default: false },
      canDeleteUser: { type: Boolean, default: false },
      canCreateUser: { type: Boolean, default: false },
      canViewLeads: { type: Boolean, default: false },
      canManageLeads: { type: Boolean, default: false },
      canViewTeams: { type: Boolean, default: false },
      canManageTeams: { type: Boolean, default: false },
      canViewDeals: { type: Boolean, default: false },
      canManageDeals: { type: Boolean, default: false },
      canViewStatus: { type: Boolean, default: false },
      canManageStatus: { type: Boolean, default: false },
      canViewSettings: { type: Boolean, default: true },
      canManageSettings: { type: Boolean, default: false },
      canViewGoals: { type: Boolean, default: false },
      canManageGoals: { type: Boolean, default: false },
      canViewCalls: { type: Boolean, default: false },
      canManageCalls: { type: Boolean, default: false },
      canViewMailBox: { type: Boolean, default: false },
      canManageMailBox: { type: Boolean, default: false },
      canViewTasks: { type: Boolean, default: false },
      canManageTasks: { type: Boolean, default: false },
      canViewNotes: { type: Boolean, default: false },
      canManageNotes: { type: Boolean, default: false },
      canViewArticles: { type: Boolean, default: false },
      canManageArticles: { type: Boolean, default: false },
      canViewWiki: { type: Boolean, default: false },
      canManageWiki: { type: Boolean, default: false },
      canViewEmailTemplates: { type: Boolean, default: false },
      canManageEmailTemplates: { type: Boolean, default: false },
      canViewEmailFolders: { type: Boolean, default: true },
      canManageEmailFolders: { type: Boolean, default: true },
      canViewEmailCampaigns: { type: Boolean, default: false },
      canManageEmailCampaigns: { type: Boolean, default: false },
      canViewScoreQuestions: { type: Boolean, default: false },
      canManageScoreQuestions: { type: Boolean, default: false },
      canViewFiles: { type: Boolean, default: false },
      canManageFiles: { type: Boolean, default: false },
      canViewKeyTokens: { type: Boolean, default: true },
      canManageKeyTokens: { type: Boolean, default: false },
      canViewPrompts: { type: Boolean, default: false },
      canManagePrompts: { type: Boolean, default: false },
      canViewOverviews: { type: Boolean, default: true },
      canManageOverviews: { type: Boolean, default: false },
      canViewPromptTemplates: { type: Boolean, default: false },
      canManagePromptTemplates: { type: Boolean, default: false },
      canViewForms: { type: Boolean, default: false },
      canManageForms: { type: Boolean, default: false },
      canViewActivities: { type: Boolean, default: false },
      canManageActivities: { type: Boolean, default: false },
      canViewMails: { type: Boolean, default: false },
      canManageMails: { type: Boolean, default: false },
      canViewTags: { type: Boolean, default: true },
      canManageTags: { type: Boolean, default: false },
      canViewLemCampaigns: { type: Boolean, default: false },
      canManageLemCampaigns: { type: Boolean, default: false },
      canViewPipelines: { type: Boolean, default: false },
      canManagePipelines: { type: Boolean, default: false },
      canViewPlans: { type: Boolean, default: false },
      canManagePlans: { type: Boolean, default: false },
      canViewSubscriptions: { type: Boolean, default: false },
      canManageSubscriptions: { type: Boolean, default: false },
      canManageInvoice: { type: Boolean, default: false },
      canManageLinks: { type: Boolean, default: false },
      canViewLinks: { type: Boolean, default: false },
      canViewCompanies: { type: Boolean, default: false },
      canManageCompanies: { type: Boolean, default: false },
      canViewSnippets: { type: Boolean, default: false },
      canManageSnippets: { type: Boolean, default: false },
      canViewCampaigns: { type: Boolean, default: false },
      canManageCampaigns: { type: Boolean, default: false },
      canManageHelp: { type: Boolean, default: false },
      canViewHelp: { type: Boolean, default: false },
      canViewRecurringEmails: { type: Boolean, default: false },
      canManageRecurringEmails: { type: Boolean, default: false },
      canViewContacts: { type: Boolean, default: false },
      canManageContacts: { type: Boolean, default: false },
      canViewSegments: { type: Boolean, default: false },
      canManageSegments: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better performance
roleSchema.index(
  { roleName: 1, orgId: 1 },
  {
    unique: true,
    partialFilterExpression: { isSystemRole: false },
  }
);
// Compound index for the main query pattern: isSystemRole + orgId
roleSchema.index({ isSystemRole: 1, orgId: 1 });
// Individual indexes for flexibility
roleSchema.index({ isSystemRole: 1 });
roleSchema.index({ orgId: 1 });
// Index for roleName filtering (used in role-based access control)
roleSchema.index({ roleName: 1 });

// Add validation for custom roles
roleSchema.pre('save', function (next) {
  // For custom roles (non-system roles), ensure orgId is provided
  if (!this.isSystemRole && !this.orgId) {
    return next(new Error('Custom roles must be associated with an organization'));
  }

  // For system roles, ensure orgId is not provided
  if (this.isSystemRole && this.orgId) {
    return next(new Error('System roles cannot be associated with an organization'));
  }

  next();
});
roleSchema.plugin(baseModelPlugin, {
  orgIdRequired: false,
});
const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
