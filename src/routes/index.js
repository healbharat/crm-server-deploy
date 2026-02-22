const express = require('express');
const userRoute = require('./user.route.js');
const authRoute = require('./auth.route.js');
const leadRoute = require('./lead.route.js');
const dealRoute = require('./deal.route.js');
const statusRoute = require('./status.route.js');
const departmentRoute = require('./department.route.js');
const analyticsRoute = require('./analytics.route.js');
const taskRoute = require('./task.route.js');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/departments',
    route: departmentRoute,
  },
  {
    path: '/leads',
    route: leadRoute,
  },
  {
    path: '/deals',
    route: dealRoute,
  },
  {
    path: '/statuses',
    route: statusRoute,
  },
  {
    path: '/analytics',
    route: analyticsRoute,
  },
  {
    path: '/tasks',
    route: taskRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;