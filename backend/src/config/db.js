const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/queue-cure');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Do not call process.exit(1) so the server can still bind to the port and serve,
    // which prevents 502 Bad Gateway errors on Railway.
  }
};

module.exports = connectDB;
