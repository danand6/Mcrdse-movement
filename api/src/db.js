const mongoose = require('mongoose');

async function connect() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mcrdse';
  await mongoose.connect(uri, { dbName: 'mcrdse' });
  console.log('Connected to MongoDB');
  return mongoose.connection;
}

module.exports = { connect, mongoose };
