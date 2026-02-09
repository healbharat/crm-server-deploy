# Department API Documentation

## Base URL
```
/api/departments
```

## Authentication
All endpoints require authentication via Bearer token in the Authorization header.

## Permissions
- **View Departments**: `canViewDepartments` or `canViewOwnOrganization`
- **Manage Departments**: `canManageDepartments` or `canViewOwnOrganization` (Admin/SuperAdmin)

---

## Endpoints

### 1. Create Department
Create a new department.

**Endpoint:** `POST /api/departments`

**Permissions Required:** Admin or SuperAdmin

**Request Body:**
```json
{
  "name": "Sales",
  "description": "Sales Department",
  "managers": ["userId1", "userId2"],  // Optional
  "isActive": true  // Optional, defaults to true
}
```

**Response:** `201 Created`
```json
{
  "_id": "departmentId",
  "name": "Sales",
  "description": "Sales Department",
  "managers": ["userId1", "userId2"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "userId",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Get All Departments
Retrieve a list of all departments with pagination.

**Endpoint:** `GET /api/departments`

**Permissions Required:** Any authenticated user

**Query Parameters:**
- `name` (string, optional): Filter by department name
- `isActive` (boolean, optional): Filter by active status
- `sortBy` (string, optional): Sort field (e.g., "name:asc", "createdAt:desc")
- `limit` (number, optional): Number of results per page (default: 10)
- `page` (number, optional): Page number (default: 1)

**Example Request:**
```
GET /api/departments?isActive=true&limit=20&page=1&sortBy=name:asc
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "_id": "departmentId1",
      "name": "Sales",
      "description": "Sales Department",
      "managers": [
        {
          "_id": "userId1",
          "name": "John Manager",
          "email": "john@example.com"
        }
      ],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "_id": "departmentId2",
      "name": "Marketing",
      "description": "Marketing Department",
      "managers": [],
      "isActive": true,
      "createdAt": "2024-01-02T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "totalResults": 2
}
```

---

### 3. Get Department by ID
Retrieve a specific department by its ID.

**Endpoint:** `GET /api/departments/:departmentId`

**Permissions Required:** Any authenticated user

**Response:** `200 OK`
```json
{
  "_id": "departmentId",
  "name": "Sales",
  "description": "Sales Department",
  "managers": [
    {
      "_id": "userId1",
      "name": "John Manager",
      "email": "john@example.com"
    }
  ],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "userId",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response:** `404 Not Found`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

### 4. Update Department
Update an existing department.

**Endpoint:** `PATCH /api/departments/:departmentId`

**Permissions Required:** Admin or SuperAdmin

**Request Body:** (All fields optional, at least one required)
```json
{
  "name": "Sales & Marketing",
  "description": "Combined Sales and Marketing Department",
  "managers": ["userId1", "userId2", "userId3"],
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "_id": "departmentId",
  "name": "Sales & Marketing",
  "description": "Combined Sales and Marketing Department",
  "managers": ["userId1", "userId2", "userId3"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z",
  "updatedBy": "adminUserId"
}
```

---

### 5. Delete Department
Delete a department.

**Endpoint:** `DELETE /api/departments/:departmentId`

**Permissions Required:** Admin or SuperAdmin

**Response:** `204 No Content`

**Error Response:** `404 Not Found`
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

### 6. Add Manager to Department
Add a user as a manager to a department.

**Endpoint:** `POST /api/departments/:departmentId/managers`

**Permissions Required:** Admin or SuperAdmin

**Request Body:**
```json
{
  "userId": "userId"
}
```

**Response:** `200 OK`
```json
{
  "_id": "departmentId",
  "name": "Sales",
  "description": "Sales Department",
  "managers": ["existingManagerId", "userId"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**Notes:**
- If the user is already a manager, the operation is idempotent (no duplicate added)
- The user must exist in the system

---

### 7. Remove Manager from Department
Remove a user from department managers.

**Endpoint:** `POST /api/departments/:departmentId/managers/remove`

**Permissions Required:** Admin or SuperAdmin

**Request Body:**
```json
{
  "userId": "userId"
}
```

**Response:** `200 OK`
```json
{
  "_id": "departmentId",
  "name": "Sales",
  "description": "Sales Department",
  "managers": ["remainingManagerId"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**Notes:**
- If the user is not a manager, the operation completes successfully (no error)
- Departments can have zero managers

---

## Common Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Forbidden"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Department not found"
}
```

---

## Usage Examples

### Example 1: Create a Department
```bash
curl -X POST http://localhost:3000/api/departments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support",
    "description": "Customer Support and Success Team",
    "isActive": true
  }'
```

### Example 2: Get All Active Departments
```bash
curl -X GET "http://localhost:3000/api/departments?isActive=true&sortBy=name:asc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Add a Manager
```bash
curl -X POST http://localhost:3000/api/departments/DEPT_ID/managers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID"
  }'
```

### Example 4: Update Department
```bash
curl -X PATCH http://localhost:3000/api/departments/DEPT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Department",
    "description": "Updated description"
  }'
```

### Example 5: Delete Department
```bash
curl -X DELETE http://localhost:3000/api/departments/DEPT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. **Department Names**: Must be unique across the organization
2. **Managers**: Can be added/removed dynamically; a department can have multiple managers
3. **Soft Delete**: Consider implementing soft delete (isActive: false) instead of hard delete if you have existing data references
4. **Permissions**: The permission names (`canManageDepartments`, etc.) should match your role configuration
5. **Cascading**: When deleting a department, consider what happens to users and leads/deals assigned to it

---

## Integration with Access Control

When a user is a department manager (listed in `department.managers`), they automatically get:
- **Department-level access**: Can view all leads/deals in their department
- **Team oversight**: Can see data created by any team member in their department

This is handled automatically by the `roleBaseAuth` middleware.

