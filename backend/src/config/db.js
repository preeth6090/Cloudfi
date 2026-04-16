const mongoose = require('mongoose');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Create time-series collection for telemetry if it doesn't exist
    const db = mongoose.connection.db;
    const collections = await db.listCollections({ name: 'telemetries' }).toArray();
    if (collections.length === 0) {
      try {
        await db.createCollection('telemetries', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'seconds',
          },
          expireAfterSeconds: 60 * 60 * 24 * 90, // 90 days
        });
        console.log('Time-series collection created');
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
        console.log('Time-series collection already exists');
      }
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
