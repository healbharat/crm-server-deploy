# Migration Guide: Organization-based to Department-based Access Control

## Overview
This guide explains the changes made to transition from multi-tenant organization-based access control to single-organization department-based access control.

## Key Changes

### 1. **Data Model Changes**

#### New Department Model
- **Location**: `src/models/department.model.js`
- **Fields**:
  - `name`: Department name (unique)
  - `description`: Department description
  - `managers`: Array of user IDs who are department managers
  - `isActive`: Boolean flag for active status

#### User Model Updates
- **Removed**: `orgId` field
- **Added**: `department` field (required, references Department model)
- **Updated**: All indexes removed `orgId` and now use `department`

#### Lead Model Updates
- **Removed**: `orgId` field
- **Added**: `departments` array field (tracks department traversal)
- **Updated**: All indexes removed `orgId` and now use `departments`

#### Deal Model Updates
- **Removed**: `orgId` field
- **Added**: `departments` array field (tracks department traversal)
- **Updated**: All indexes removed `orgId` and now use `departments`

### 2. **Access Control Logic**

#### New Access Levels
1. **Global** - SuperAdmin can access all data
2. **Admin** - Admin can access all data in the organization
3. **Department** - Department managers can access all data in their department
4. **Team** - Team members can access data they created or are assigned to within their department
5. **Own** - Users can only access their own data within their department

#### Access Rules
- **SuperAdmin/Admin**: Full access to all records
- **Department Manager**: Access to all records in their department(s)
- **Regular User**: Access only to records where:
  - They are the creator (`createdBy`)
  - They are assigned (`assignedTo`)
  - Record is in their department

### 3. **File Changes**

#### New Files
- `src/models/department.model.js` - Department model
- `src/models/plugins/departmentPlugin.js` - Department-based query filtering
- `src/services/department.service.js` - Department service
- `src/controllers/department.controller.js` - Department controller

#### Modified Files
- `src/models/user.model.js` - Added department field, removed orgId
- `src/models/lead.model.js` - Added departments array, removed orgId
- `src/models/deal.model.js` - Added departments array, removed orgId
- `src/middlewares/roleBaseAuth.js` - Completely rewritten for department-based access
- `src/utils/roleUtils.js` - Updated getUserDataAccess to support departments
- `src/utils/filterUtils.js` - Added applyDepartmentFilter function
- `src/controllers/lead.controller.js` - Added department-based access checks
- `src/controllers/deal.controller.js` - Added department-based access checks
- `src/services/lead.service.js` - Updated query logic for departments
- `src/services/deal.service.js` - Updated query logic for departments
- `src/services/userRole.service.js` - Updated to pass department info

### 4. **Database Migration Steps**

#### Step 1: Create Departments
```javascript
// Create default departments
const departments = [
  { name: 'Sales', description: 'Sales Department', isActive: true },
  { name: 'Marketing', description: 'Marketing Department', isActive: true },
  { name: 'Support', description: 'Support Department', isActive: true },
];

for (const dept of departments) {
  await Department.create(dept);
}
```

#### Step 2: Migrate Users
```javascript
// Assign all users to a default department
const defaultDept = await Department.findOne({ name: 'Sales' });
await User.updateMany(
  { department: { $exists: false } },
  { $set: { department: defaultDept._id } }
);
```

#### Step 3: Migrate Leads
```javascript
// Convert orgId to departments array
const leads = await Lead.find({ departments: { $exists: false } });
for (const lead of leads) {
  // Get creator's department
  const creator = await User.findById(lead.createdBy).select('department');
  if (creator && creator.department) {
    lead.departments = [creator.department];
    await lead.save();
  }
}
```

#### Step 4: Migrate Deals
```javascript
// Convert orgId to departments array
const deals = await Deal.find({ departments: { $exists: false } });
for (const deal of deals) {
  // Get creator's department
  const creator = await User.findById(deal.createdBy).select('department');
  if (creator && creator.department) {
    deal.departments = [creator.department];
    await deal.save();
  }
}
```

#### Step 5: Clean Up Old Fields
```javascript
// Remove orgId from all collections
await User.updateMany({}, { $unset: { orgId: 1 } });
await Lead.updateMany({}, { $unset: { orgId: 1 } });
await Deal.updateMany({}, { $unset: { orgId: 1 } });
```

### 5. **API Changes**

#### User Registration/Creation
- **Before**: Required `orgId` or `organizationName`
- **After**: Requires `department` (department ID)

#### Lead/Deal Creation
- **Before**: Automatically set `orgId` from user
- **After**: Automatically set `departments` array from user's department

#### Query Filters
- **Before**: Filtered by `orgId`
- **After**: Filtered by `departments` array with access level checks

### 6. **Environment Variables**
No new environment variables required.

### 7. **Testing Checklist**

- [ ] Create departments
- [ ] Assign users to departments
- [ ] Set department managers
- [ ] Test SuperAdmin access (should see all data)
- [ ] Test Admin access (should see all data)
- [ ] Test Department Manager access (should see department data)
- [ ] Test Regular User access (should see only their own data)
- [ ] Test lead creation (should auto-assign department)
- [ ] Test deal creation (should auto-assign department)
- [ ] Test lead/deal updates (should maintain department access)
- [ ] Test cross-department access (should be denied for non-managers)

### 8. **Breaking Changes**

1. **User Model**: `department` field is now required
2. **Lead/Deal Models**: `departments` is now an array instead of single `orgId`
3. **Authentication**: Registration flow needs to include department selection
4. **Queries**: All queries now filter by department-based access control

### 9. **Backwards Compatibility**

⚠️ **This is a breaking change** - The old multi-tenant system is completely replaced.

To maintain some backwards compatibility during transition:
- Keep organization model if needed for billing/settings
- Update registration to auto-create default department
- Provide migration scripts for existing data

### 10. **Next Steps**

1. Update frontend to:
   - Add department selection during registration
   - Display department information in user profiles
   - Add department management UI for admins
   - Update lead/deal forms to show department traversal

2. Add department routes:
   - `POST /departments` - Create department
   - `GET /departments` - List departments
   - `GET /departments/:id` - Get department
   - `PUT /departments/:id` - Update department
   - `DELETE /departments/:id` - Delete department
   - `POST /departments/:id/managers` - Add manager
   - `DELETE /departments/:id/managers` - Remove manager

3. Update validation schemas to require department field

4. Create department seeder for initial setup

## Support

For questions or issues during migration, please refer to the code comments in the updated files.

