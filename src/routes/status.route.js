const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const statusValidation = require('../validations/status.validation');
const statusController = require('../controllers/status.controller');
const addRoleBasedFilters = require('../middlewares/roleBaseAuth');

const router = express.Router();

router.use(protect);
router.use(addRoleBasedFilters);

router
  .route('/')
  .post(
    protect,
    checkPermissions(['canManageStatus']),
    validate(statusValidation.createStatus),
    statusController.createStatus
  )
  .get(
    protect,
    checkPermissions(['canViewStatus']),
    validate(statusValidation.getStatuses),
    statusController.getStatuses
  );

router
  .route('/:statusId')
  .get(
    protect,
    checkPermissions(['canViewStatus']),
    validate(statusValidation.getStatus),
    statusController.getStatus
  )
  .patch(
    protect,
    checkPermissions(['canManageStatus']),
    validate(statusValidation.updateStatus),
    statusController.updateStatus
  )
  .delete(
    protect,
    checkPermissions(['canManageStatus']),
    validate(statusValidation.deleteStatus),
    statusController.deleteStatus
  );

module.exports = router;

