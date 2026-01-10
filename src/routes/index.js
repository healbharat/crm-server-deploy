const express = require('express');
const userRoute = require('./user.route.js');
const authRoute = require('./auth.route.js');
const leadRoute = require('./lead.route.js');
const dealRoute = require('./deal.route.js');

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
    path: '/leads',
    route: leadRoute,
  },
  {
    path: '/deals',
    route: dealRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;