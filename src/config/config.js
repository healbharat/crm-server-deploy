const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().trim().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    MAILHOG_ENABLE: Joi.boolean().description('Must be True or False'),
    DOMAIN_URL: Joi.string().description('Domain url'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Logic to handle database name suffix for testing without breaking query parameters
let mongodbUrl = envVars.MONGODB_URL;
if (envVars.NODE_ENV === 'test') {
  if (mongodbUrl.includes('?')) {
    const [baseUrl, queryParams] = mongodbUrl.split('?');
    mongodbUrl = `${baseUrl}-test?${queryParams}`;
  } else {
    mongodbUrl = `${mongodbUrl}-test`;
  }
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  resetPasswordUrl: envVars.DOMAIN_URL,
  domainUrl: envVars.DOMAIN_URL,
  mongoose: {
    url: mongodbUrl,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
      autoIndex: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  }

};
