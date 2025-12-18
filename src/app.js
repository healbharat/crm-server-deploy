require('dotenv').config();
require('express-async-errors');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const httpStatus = require('http-status');
const passport = require('passport');
const routes = require('./routes/index.js');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error.js');

const app = express();

// Initialize Passport and register JWT strategy
require('./config/passport')(passport);

// Middlewares
app.use(helmet());
app.use(cors());
app.options('*', cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// Routes
app.use('/v2', routes);


// 404 + error handler
// app.use(notFound);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});
app.use(errorConverter);
app.use(errorHandler);

module.exports = app;
