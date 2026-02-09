# Department-Based Access Control Implementation Summary

## Overview
Successfully refactored the CRM system from multi-tenant organization-based access control to single-organization department-based access control.

## What Was Changed

### 1. **New Department Model** ✅
- Created `src/models/department.model.js`
- Fields: name, description, managers (array), isActive
- Managers can be assigned/removed dynamically by admins

### 2. **Updated Models** ✅

#### User Model
- **Removed**: `orgId` field and tenant plugin
- **Added**: `department` field (required, references Department)
- **Updated**: All indexes now use `department` instead of `orgId`
- **Updated**: Helper methods (getLeadUsers, getDealUsers) now use departmentId

#### Lead Model
- **Removed**: `orgId` field and tenant plugin
- **Added**: `departments` array field (tracks department traversal)
- **Updated**: All indexes now use `departments` instead of `orgId`

#### Deal Model
- **Removed**: `orgId` field and tenant plugin
- **Added**: `departments` array field (tracks department traversal)
- **Updated**: All indexes now use `departments` instead of `orgId`

### 3. **New Department Plugin** ✅
- Created `src/models/plugins/departmentPlugin.js`
- Replaces tenant plugin functionality
- Automatically filters queries based on user's department access
- Skips filtering for SuperAdmin/Admin roles

### 4. **Updated Access Control Middleware** ✅
- Completely rewrote `src/middlewares/roleBaseAuth.js`
- New access levels:
  - **global**: SuperAdmin - sees everything
  - **admin**: Admin - sees everything
  - **department**: Department managers - see all data in their department
  - **team**: Team members - see data they created/assigned in their department
  - **own**: Regular users - see only their own data in their department

### 5. **Updated Controllers** ✅

#### Lead Controller (`src/controllers/lead.controller.js`)
- Auto-assigns user's department to new leads
- Implements `checkLeadAccess()` function for granular access control
- Checks access on get, update, delete, and addNote operations
- Access rules:
  - SuperAdmin/Admin: Full access
  - Department Manager: Access to all leads in their department
  - Regular User: Access only to leads they created or are assigned to in their department

#### Deal Controller (`src/controllers/deal.controller.js`)
- Auto-assigns user's department to new deals
- Implements `checkDealAccess()` function for granular access control
- Checks access on get, update, delete operations
- Same access rules as leads

#### Department Controller (`src/controllers/department.controller.js`) - NEW
- CRUD operations for departments
- Add/remove managers
- Only accessible by Admin/SuperAdmin

### 6. **Updated Services** ✅

#### Lead Service
- Updated `queryLeads()` to handle department-based filtering
- Supports complex queries with $and/$or operators
- Populates department information in results

#### Deal Service
- Updated `queryDeals()` to handle department-based filtering
- Supports complex queries with $and/$or operators
- Populates department information in results

#### Department Service - NEW
- Full CRUD operations
- Manager assignment/removal
- Query and pagination support

#### User Role Service
- Updated `getUserDataAccessConfig()` to accept isManager parameter
- Passes department information to access control logic

### 7. **Updated Utilities** ✅

#### roleUtils.js
- Updated `getUserDataAccess()` function signature
- Now accepts: userRoles, userId, userDepartment, isManager
- Returns access scope with departments array

#### filterUtils.js
- Added `applyDepartmentFilter()` function
- Handles complex filtering based on access level
- Builds proper MongoDB queries with $and/$or operators

### 8. **Migration Support** ✅
- Created `MIGRATION_GUIDE.md` with detailed instructions
- Created `scripts/migrate-to-departments.js` migration script
- Script handles:
  - Creating default departments
  - Migrating users to departments
  - Converting leads from orgId to departments array
  - Converting deals from orgId to departments array
  - Cleaning up old orgId fields

## Access Control Rules

### 1. Department-wise Data Separation ✅
- All leads and deals have a `departments` array
- Users belong to a single department
- Data is filtered based on department membership

### 2. Multiple Departments per Record ✅
- Leads and deals can be assigned to multiple departments
- Tracks traversal from department to department
- Useful for handoffs (e.g., Sales → Support)

### 3. Access Based on Creation and Assignment ✅
- Regular users can only access records where:
  - They are the creator (`createdBy`)
  - They are assigned (`assignedTo`)
  - Record is in their department

### 4. Department Manager Access ✅
- Department managers see all records in their department
- Managers are stored in `Department.managers` array
- Middleware checks manager status dynamically

### 5. Admin/SuperAdmin Access ✅
- SuperAdmin: Full access to all data (global scope)
- Admin: Full access to all data (admin scope)
- No department restrictions

## How It Works

### Request Flow
1. User makes request → `verifyToken` middleware authenticates
2. `roleBaseAuth` middleware checks if user is department manager
3. Middleware determines access level (global/admin/department/team/own)
4. Sets `req.queryFilters` with access level and department info
5. Controller applies department filter using `applyDepartmentFilter()`
6. Service builds MongoDB query with proper filters
7. Data is returned based on access level

### Example Scenarios

#### Scenario 1: Regular User Queries Leads
```javascript
// User: John (Sales Department, Regular User)
// Access Level: 'own'
// Query becomes:
{
  $and: [
    { departments: { $in: [salesDeptId] } },
    { $or: [
      { createdBy: johnId },
      { assignedTo: johnId }
    ]}
  ]
}
```

#### Scenario 2: Department Manager Queries Leads
```javascript
// User: Sarah (Sales Department, Manager)
// Access Level: 'department'
// Query becomes:
{
  departments: { $in: [salesDeptId] }
}
```

#### Scenario 3: Admin Queries Leads
```javascript
// User: Admin
// Access Level: 'admin'
// Query: No restrictions, sees all leads
```

## Files Modified

### Models
- ✅ `src/models/department.model.js` (NEW)
- ✅ `src/models/user.model.js`
- ✅ `src/models/lead.model.js`
- ✅ `src/models/deal.model.js`
- ✅ `src/models/plugins/departmentPlugin.js` (NEW)
- ✅ `src/models/plugins/index.js`
- ✅ `src/models/index.js`

### Controllers
- ✅ `src/controllers/department.controller.js` (NEW)
- ✅ `src/controllers/lead.controller.js`
- ✅ `src/controllers/deal.controller.js`

### Services
- ✅ `src/services/department.service.js` (NEW)
- ✅ `src/services/lead.service.js`
- ✅ `src/services/deal.service.js`
- ✅ `src/services/userRole.service.js`
- ✅ `src/services/index.js`

### Middleware
- ✅ `src/middlewares/roleBaseAuth.js`

### Utils
- ✅ `src/utils/roleUtils.js`
- ✅ `src/utils/filterUtils.js`

### Documentation & Scripts
- ✅ `MIGRATION_GUIDE.md` (NEW)
- ✅ `scripts/migrate-to-departments.js` (NEW)
- ✅ `DEPARTMENT_ACCESS_CONTROL_SUMMARY.md` (NEW)

## Still Need Updates

### Critical (Need to update before deployment)
1. **Auth Service** (`src/services/auth.service.js`)
   - Update `registerUser()` to use department instead of orgId
   - Update `acceptOrgInvitation()` to use department
   - Update `googleRegisterUser()` to use department

2. **User Service** (`src/services/user.service.js`)
   - Update `createUser()` to remove orgId validation
   - Update to use department-based uniqueness checks

3. **User Controller** (`src/controllers/user.controller.js`)
   - Update `createUser()` to use department instead of orgId

4. **Validation Schemas**
   - Update user validation to require department
   - Update lead/deal validation to handle departments array

5. **Routes**
   - Add department routes
   - Update existing routes if needed

### Optional (Can be done later)
1. Update organization model/service if still needed for billing
2. Add department seeder
3. Update tests
4. Update API documentation

## Testing Recommendations

1. **Create Departments**
   ```javascript
   POST /departments
   {
     "name": "Sales",
     "description": "Sales Department"
   }
   ```

2. **Assign Department Manager**
   ```javascript
   POST /departments/:id/managers
   {
     "userId": "managerId"
   }
   ```

3. **Create User with Department**
   ```javascript
   POST /users
   {
     "name": "John Doe",
     "email": "john@example.com",
     "department": "departmentId",
     "roles": ["roleId"]
   }
   ```

4. **Test Access Control**
   - Login as regular user → should only see own leads/deals
   - Login as department manager → should see all department data
   - Login as admin → should see all data

## Next Steps

1. **Run Migration Script**
   ```bash
   node scripts/migrate-to-departments.js
   ```

2. **Update Auth/User Services** (see "Still Need Updates" section)

3. **Add Department Routes** to your route configuration

4. **Update Frontend**
   - Add department selection in registration
   - Add department management UI
   - Update lead/deal forms to show departments

5. **Test Thoroughly** before deploying to production

## Benefits of New System

✅ **Simpler Architecture**: No multi-tenant complexity
✅ **Flexible Access Control**: Department-based with manager roles
✅ **Department Traversal**: Track records across departments
✅ **Granular Permissions**: Creator and assignee-based access
✅ **Scalable**: Easy to add more departments
✅ **Maintainable**: Clear separation of concerns

## Questions or Issues?

Refer to:
- `MIGRATION_GUIDE.md` for detailed migration steps
- Code comments in updated files
- Department model for schema details
- Access control middleware for logic details

