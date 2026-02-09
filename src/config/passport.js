const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const {User} = require('../models');
const config = require('./config');

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwt.secret,
};

const jwtStrategy = new JwtStrategy(options, async (payload, done) => {
  try {
    const userId = payload.sub;
    // const orgId = payload.orgId;

    // Try to get user data from cache first
    let userData;
    
    if (!userData) {
      console.log(`🔄 Cache miss - fetching user from DB: ${userId}`);
      // Fallback to database if cache miss
      userData = await User.findOne({
        _id: userId,
      })
        .populate('roles', 'roleName permissions')
        .populate('department', 'name')
        .lean();
      
      if (!userData) {
        return done(null, false, { message: 'User not found' });
      }
      
      // Cache the user data for future requests
    }

    // Validate organization
    // if (userData.orgId && userData.orgId._id && userData.orgId._id.toString() !== orgId) {
    //   return done(null, false, { message: 'Invalid organization' });
    // }

    // Check if user is active
    if (userData.status !== 'Active') {
      return done(null, false, { message: 'User is inactive' });
    }

    // Ensure orgId structure matches what middleware expects
    // if (userData.orgId && userData.orgId._id) {
    //   userData.orgId = {
    //     id: userData.orgId._id,
    //     name: userData.orgId.name || userData.orgId._id
    //   };
    // }

    return done(null, userData);
  } catch (error) {
    console.error('JWT Strategy error:', error);
    return done(error, false);
  }
});

module.exports = (passport) => {
  passport.use(jwtStrategy);
};
