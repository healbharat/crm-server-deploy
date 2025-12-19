const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const userValidation = require('../validations/user.validation');
const userController = require('../controllers/user.controller');
const addRoleBasedFilters = require('../middlewares/roleBaseAuth');

const router = express.Router();
router.use(protect);
router.use(addRoleBasedFilters);
router
  .route('/')
  .post(protect, checkPermissions(['canCreateUser']), validate(userValidation.createUser), userController.createUser)
  .get(protect, checkPermissions(['canViewUsers']), validate(userValidation.getUsers), userController.getUsers);

router.get('/all-users', protect, checkPermissions(['canViewUsers', 'canManageTeams']), userController.getAllUsers);
router.get('/team-users', protect, checkPermissions(['canViewUsers', 'canManageTasks']), userController.getTeamUsers);
router.get('/normal-users', protect, checkPermissions(['canViewUsers', 'canManageTeams']), userController.getAllNormalUsers);
router.get('/roles', protect, checkPermissions(['canViewRoles']), userController.getRoles);
router.get('/all-roles', protect, checkPermissions(['canViewRoles']), userController.getAllRoles);

router
  .route('/:userId')
  .get(protect, checkPermissions(['canViewManageOwnUser']), validate(userValidation.getUser), userController.getUser)
  .patch(protect, checkPermissions(['canViewManageOwnUser']), validate(userValidation.updateUser), userController.updateUser)
  .delete(protect, checkPermissions(['canDeleteUser']), validate(userValidation.deleteUser), userController.deleteUser);
router
  .route('/updatePassword/:userId')
  .patch(
    protect,
    checkPermissions(['canViewManageOwnUser']),
    validate(userValidation.updateUserPassword),
    userController.updateUserPassword
  );

module.exports = router;