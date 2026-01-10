const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const dealValidation = require('../validations/deal.validation');
const dealController = require('../controllers/deal.controller');
const addRoleBasedFilters = require('../middlewares/roleBaseAuth');

const router = express.Router();

router.use(protect);
router.use(addRoleBasedFilters);

router
  .route('/')
  .post(
    protect,
    checkPermissions(['canManageDeals']),
    validate(dealValidation.createDeal),
    dealController.createDeal
  )
  .get(
    protect,
    checkPermissions(['canViewDeals']),
    validate(dealValidation.getDeals),
    dealController.getDeals
  );

router
  .route('/:dealId')
  .get(
    protect,
    checkPermissions(['canViewDeals']),
    validate(dealValidation.getDeal),
    dealController.getDeal
  )
  .patch(
    protect,
    checkPermissions(['canManageDeals']),
    validate(dealValidation.updateDeal),
    dealController.updateDeal
  )
  .delete(
    protect,
    checkPermissions(['canManageDeals']),
    validate(dealValidation.deleteDeal),
    dealController.deleteDeal
  );

module.exports = router;

