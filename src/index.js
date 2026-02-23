require('dotenv').config();
const app = require('./app.js');
const connectDB = require('./config/db.js');
const config = require('./config/config.js');

const PORT = config.port || 4000;
const MONGO_URI = config.mongoose.url;

let server;

(async () => {
  await connectDB(MONGO_URI, config.mongoose.options);
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

const exitHandler = () => {
  if (server) {
    server.close(() => {
      console.log('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  console.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  if (server) {
    server.close();
  }
});