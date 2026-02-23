const mongoose = require('mongoose');

const connectDB = async (mongoUri, options = {}) => {
  try {
    // Correctly redact credentials even if @ is missing
    let redactedUri = mongoUri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@/]+(@?)/, '$1****$2');
    console.log(`Attempting to connect to MongoDB. URI: ${redactedUri}, Length: ${mongoUri.length}`);
    await mongoose.connect(mongoUri, options);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
