const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmachain';

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,  // Increase timeout
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`Make sure MongoDB is running on 127.0.0.1:27017`);
    console.error(`To start MongoDB: net start MongoDB (or run start-mongodb.bat)`);
    throw error;
  }
};

module.exports = connectDB;
