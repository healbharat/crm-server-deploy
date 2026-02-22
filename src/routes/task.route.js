const express = require('express');
const { protect, checkPermissions } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const taskValidation = require('../validations/task.validation');
const taskController = require('../controllers/task.controller');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .post(
    checkPermissions(['canManageTasks']),
    validate(taskValidation.createTask),
    taskController.createTask
  )
  .get(
    checkPermissions(['canViewTasks']),
    validate(taskValidation.getTasks),
    taskController.getTasks
  );

router
  .route('/due-today')
  .get(
    checkPermissions(['canViewTasks']),
    validate(taskValidation.getTasksDueToday),
    taskController.getTasksDueToday
  );

router
  .route('/overdue')
  .get(
    checkPermissions(['canViewTasks']),
    validate(taskValidation.getOverdueTasks),
    taskController.getOverdueTasks
  );

router
  .route('/:taskId')
  .get(
    checkPermissions(['canViewTasks']),
    validate(taskValidation.getTask),
    taskController.getTask
  )
  .patch(
    checkPermissions(['canManageTasks']),
    validate(taskValidation.updateTask),
    taskController.updateTask
  )
  .delete(
    checkPermissions(['canManageTasks']),
    validate(taskValidation.deleteTask),
    taskController.deleteTask
  );

module.exports = router;
