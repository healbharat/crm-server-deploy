const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const leadValidation = require('../validations/lead.validation');
const leadController = require('../controllers/lead.controller');
const addRoleBasedFilters = require('../middlewares/roleBaseAuth');

const router = express.Router();

router.use(protect);
router.use(addRoleBasedFilters);

router
  .route('/')
  .post(
    protect,
    checkPermissions(['canManageLeads']),
    validate(leadValidation.createLead),
    leadController.createLead
  )
  .get(
    protect,
    checkPermissions(['canViewLeads']),
    validate(leadValidation.getLeads),
    leadController.getLeads
  );

router
  .route('/:leadId')
  .get(
    protect,
    checkPermissions(['canViewLeads']),
    validate(leadValidation.getLead),
    leadController.getLead
  )
  .patch(
    protect,
    checkPermissions(['canManageLeads']),
    validate(leadValidation.updateLead),
    leadController.updateLead
  )
  .delete(
    protect,
    checkPermissions(['canManageLeads']),
    validate(leadValidation.deleteLead),
    leadController.deleteLead
  );

router
  .route('/:leadId/notes')
  .post(
    protect,
    checkPermissions(['canManageLeads']),
    validate(leadValidation.addNote),
    leadController.addNote
  );

module.exports = router;

