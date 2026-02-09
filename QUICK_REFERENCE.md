# Department-Based Access Control - Quick Reference

## Access Levels

| Level | Who | Can Access |
|-------|-----|------------|
| **global** | SuperAdmin | All data across entire system |
| **admin** | Admin | All data in organization |
| **department** | Department Manager | All data in their department(s) |
| **team** | Team Member | Data they created/assigned in their department |
| **own** | Regular User | Only their own data in their department |

## Key Concepts

### 1. Department Assignment
- **Users**: Belong to ONE department
- **Leads/Deals**: Can belong to MULTIPLE departments (array)
- **Managers**: Multiple managers per department (array)

### 2. Access Rules

#### For Leads & Deals:
```
SuperAdmin/Admin → All records
Department Manager → All records in their department
Regular User → Records where:
  - They are creator (createdBy), OR
  - They are assigned (assignedTo), AND
  - Record is in their department
```

## Model Schemas

### Department
```javascript
{
  name: String (required, unique),
  description: String,
  managers: [ObjectId] (refs User),
  isActive: Boolean
}
```

### User (Changes)
```javascript
{
  // REMOVED: orgId
  // ADDED:
  department: ObjectId (required, refs Department)
}
```

### Lead/Deal (Changes)
```javascript
{
  // REMOVED: orgId
  // ADDED:
  departments: [ObjectId] (refs Department)
}
```

## API Examples

### Create Department
```javascript
POST /api/departments
{
  "name": "Sales",
  "description": "Sales Department"
}
```

### Add Department Manager
```javascript
POST /api/departments/:id/managers
{
  "userId": "userId"
}
```

### Create Lead (Auto-assigns department)
```javascript
POST /api/leads
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
  // departments will be auto-set from user's department
}
```

### Transfer Lead to Another Department
```javascript
PUT /api/leads/:id
{
  "departments": ["dept1Id", "dept2Id"]
}
```

## Middleware Flow

```
Request
  ↓
verifyToken (authenticate user)
  ↓
roleBaseAuth (determine access level)
  ↓
  - Check if user is department manager
  - Set req.queryFilters with:
    * accessLevel
    * userId
    * departments
  ↓
Controller
  ↓
  - Apply applyDepartmentFilter()
  - Check individual record access
  ↓
Service
  ↓
  - Build MongoDB query
  - Execute with filters
  ↓
Response
```

## Common Queries

### Get All Leads (Regular User)
```javascript
// Automatically filtered to:
{
  $and: [
    { departments: { $in: [userDeptId] } },
    { $or: [
      { createdBy: userId },
      { assignedTo: userId }
    ]}
  ]
}
```

### Get All Leads (Department Manager)
```javascript
// Automatically filtered to:
{
  departments: { $in: [managerDeptId] }
}
```

### Get All Leads (Admin)
```javascript
// No filters applied - sees everything
{}
```

## Helper Functions

### Check if User is Department Manager
```javascript
const { Department } = require('../models');

async function isDepartmentManager(user) {
  const dept = await Department.findById(user.department);
  return dept.managers.includes(user._id);
}
```

### Apply Department Filter
```javascript
const { applyDepartmentFilter } = require('../utils/filterUtils');

let filter = pick(req.query, ['status', 'source']);
filter = applyDepartmentFilter(filter, req.queryFilters);
```

### Check Record Access
```javascript
function checkLeadAccess(lead, user, queryFilters) {
  const { accessLevel, userId, departments } = queryFilters;
  
  if (accessLevel === 'global' || accessLevel === 'admin') {
    return true;
  }
  
  const isInDept = lead.departments.some(
    d => departments.includes(d.toString())
  );
  
  if (accessLevel === 'department' && isInDept) {
    return true;
  }
  
  const isCreator = lead.createdBy.toString() === userId;
  const isAssigned = lead.assignedTo?.toString() === userId;
  
  return isInDept && (isCreator || isAssigned);
}
```

## Migration Checklist

- [ ] Run migration script: `node scripts/migrate-to-departments.js`
- [ ] Create departments
- [ ] Assign users to departments
- [ ] Set department managers
- [ ] Update auth service (registerUser, etc.)
- [ ] Update user service (createUser)
- [ ] Add department routes
- [ ] Update validation schemas
- [ ] Test all access levels
- [ ] Update frontend

## Troubleshooting

### User can't see any data
- Check if user has a department assigned
- Check if records have departments array
- Check if user's department matches record departments

### Department manager can't see all department data
- Verify user is in department.managers array
- Check middleware is correctly identifying manager status

### Admin can't see all data
- Verify user has Admin role with proper permissions
- Check roleBaseAuth middleware is setting accessLevel correctly

## Important Notes

⚠️ **Breaking Changes**:
- All users MUST have a department
- All leads/deals MUST have departments array
- Old orgId fields are removed

✅ **Benefits**:
- Simpler single-organization architecture
- Flexible department-based access
- Track record traversal across departments
- Easy to manage department managers

📝 **Remember**:
- Departments array allows tracking handoffs
- Managers are dynamic (can be added/removed)
- Access is always checked at record level
- SuperAdmin/Admin bypass all restrictions

