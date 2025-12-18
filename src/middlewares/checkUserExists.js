const { userService } = require('../services'); // Adjust the path as needed

const checkUserExists = async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await userService.getUserByEmail(email);
    if (user) {
      req.user = user;
    } else {
      req.user = undefined;
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkUserExists;
