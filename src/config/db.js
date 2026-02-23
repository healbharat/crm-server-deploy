const mongoose = require('mongoose');

const connectDB = async (mongoUri, options = {}) => {
  try {
    await mongoose.connect(mongoUri, options);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
