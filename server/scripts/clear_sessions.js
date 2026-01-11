const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking';

const guardSessionSchema = new mongoose.Schema({
  sessionId: String,
  guardId: String,
  guardName: String,
  parkingLot: String,
  startTime: Date,
  endTime: Date,
  status: String,
  openingCash: Number,
  closingCash: Number,
  systemHealthAtStart: Object
}, {
  timestamps: true
});

const GuardSession = mongoose.model('GuardSession', guardSessionSchema);

async function clearActiveSessions() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find all active sessions
    const activeSessions = await GuardSession.find({ status: 'ACTIVE' });
    console.log(`\n📊 Found ${activeSessions.length} active sessions\n`);

    if (activeSessions.length > 0) {
      activeSessions.forEach(session => {
        console.log(`   - ${session.guardId} | Session: ${session.sessionId}`);
        console.log(`     Started: ${session.startTime}`);
        console.log(`     Parking Lot: ${session.parkingLot}\n`);
      });

      // Close all active sessions
      const result = await GuardSession.updateMany(
        { status: 'ACTIVE' },
        { 
          $set: { 
            status: 'COMPLETED',
            endTime: new Date()
          } 
        }
      );

      console.log(`✅ Closed ${result.modifiedCount} active sessions`);
    } else {
      console.log('✅ No active sessions found');
    }

    mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearActiveSessions();
