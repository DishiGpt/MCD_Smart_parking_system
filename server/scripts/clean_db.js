const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking';

async function clean() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to', MONGO_URI);

    const db = mongoose.connection.db;

    // Drop collections if they exist
    const collections = await db.listCollections().toArray();
    const names = collections.map(c => c.name);

    const toDrop = ['transactions', 'parkinglots', 'alerts'];
    for (const name of toDrop) {
      if (names.includes(name)) {
        console.log('Dropping collection:', name);
        await db.dropCollection(name);
      } else {
        console.log('Collection not found (skipping):', name);
      }
    }

    // Optionally drop the entire database - commented out
    // await db.dropDatabase();
    // console.log('Database dropped');

    await mongoose.disconnect();
    console.log('Disconnected. Clean complete.');
  } catch (err) {
    console.error('Error cleaning DB:', err);
    process.exit(1);
  }
}

clean();
