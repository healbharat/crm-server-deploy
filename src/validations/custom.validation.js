const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid mongo id');
  }
  return value;
};

const password = (value, helpers) => {
  if (value.length < 8) {
    return helpers.message('Password must be at least 8 characters long');
  }
  if (!/[a-z]/.test(value)) {
    return helpers.message('Password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(value)) {
    return helpers.message('Password must contain at least one uppercase letter');
  }
  if (!/\d/.test(value)) {
    return helpers.message('Password must contain at least one number');
  }
  if (!/[$@$!%*?&]/.test(value)) {
    return helpers.message('Password must contain at least one special character ($@$!%*?&)');
  }
  return value;
};
const website = (value, helpers) => {
  const urlPattern = /^(https?:\/\/)/;
  if (value && !urlPattern.test(value)) {
    return helpers.message('Invalid URL: Please include "http://" or "https://" in the website URL (e.g. https://www.companyname.com)');
  }
  return value;
};
module.exports = {
  objectId,
  password,
  website
};
