const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const departmentValidation = require('../validations/department.validation');
const departmentController = require('../controllers/department.controller');

const router = express.Router();

// All department routes require authentication
router.use(protect);

// CRUD operations for departments
router
  .route('/')
  .post(
    checkPermissions(['canManageDepartments']), // Admin or SuperAdmin
    validate(departmentValidation.createDepartment),
    departmentController.createDepartment
  )
  .get(
    validate(departmentValidation.getDepartments),
    departmentController.getDepartments
  );

router
  .route('/:departmentId')
  .get(
    checkPermissions(['canViewDepartments']),
    validate(departmentValidation.getDepartment),
    departmentController.getDepartment
  )
  .patch(
    checkPermissions(['canManageDepartments']), // Admin or SuperAdmin
    validate(departmentValidation.updateDepartment),
    departmentController.updateDepartment
  )
  .delete(
    checkPermissions(['canManageDepartments']), // Admin or SuperAdmin
    validate(departmentValidation.deleteDepartment),
    departmentController.deleteDepartment
  );

// Manager management routes
router
  .route('/:departmentId/managers')
  .post(
    checkPermissions(['canManageDepartments']), // Admin or SuperAdmin
    validate(departmentValidation.addManager),
    departmentController.addManager
  );

router
  .route('/:departmentId/managers/remove')
  .post(
    checkPermissions(['canManageDepartments']), // Admin or SuperAdmin
    validate(departmentValidation.removeManager),
    departmentController.removeManager
  );

module.exports = router;

