const mongoose = require('mongoose');

const connectDB = async (mongoUri, options = {}) => {
  try {
    const redactedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`Attempting to connect to MongoDB. URI Type: ${mongoUri.startsWith('mongodb+srv') ? 'Atlas' : 'Standard'}, Length: ${mongoUri.length}`);
    await mongoose.connect(mongoUri, options);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
