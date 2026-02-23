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

// Logic to handle database name suffix and fix common Atlas URI formatting issues
let mongodbUrl = envVars.MONGODB_URL;

// 1. Auto-fix: Ensure the '@' symbol is present in Atlas URIs (common copy-paste error)
if (mongodbUrl.startsWith('mongodb+srv://') && !mongodbUrl.includes('@')) {
  // It's likely of the form mongodb+srv://user:passhostname
  const parts = mongodbUrl.replace('mongodb+srv://', '').split('/');
  const credentialsAndHost = parts[0];

  // Attempt to find where credentials end (after the first colon)
  const firstColonIndex = credentialsAndHost.indexOf(':');
  if (firstColonIndex !== -1) {
    // We have user:passwordhostname
    // We look for where the password ends. Host in Atlas usually ends in .mongodb.net
    const hostSuffix = '.mongodb.net';
    const hostSuffixIndex = credentialsAndHost.indexOf(hostSuffix);

    if (hostSuffixIndex !== -1) {
      // Find the beginning of the hostname (e.g., heal-bharat-db or cluster0)
      // We know it's after the colon
      const passwordPart = credentialsAndHost.substring(firstColonIndex + 1);
      // This is tricky. Let's assume the host starts at the first alphanumeric char after the password.
      // But wait, the hostname is usually everything before .mongodb.net.
      // Let's find the start of the host by looking for the last segment.
      const hostStartMatch = credentialsAndHost.match(/[a-zA-Z0-9-]+\.mongodb\.net/);

      if (hostStartMatch) {
        const hostStart = hostStartMatch.index;
        const credentials = credentialsAndHost.substring(0, hostStart);
        const host = credentialsAndHost.substring(hostStart);
        parts[0] = `${credentials}@${host}`;
        mongodbUrl = 'mongodb+srv://' + parts.join('/');
        console.log('NOTICE: Automatically fixed missing @ in MONGODB_URL.');
      }
    }
  }
}

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
