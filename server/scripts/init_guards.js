const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking';

const guardSchema = new mongoose.Schema({
  guardId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  assignedParkingLot: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  joinDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  capacity: Number,
  currentOccupancy: Number,
  status: String,
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  }
}, {
  timestamps: true
});

const Guard = mongoose.model('Guard', guardSchema);
const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);

async function initGuards() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get available parking lots
    const parkingLots = await ParkingLot.find().limit(5);
    const lotNames = parkingLots.map(lot => lot.name);
    
    if (lotNames.length === 0) {
      console.log('⚠️  No parking lots found in database. Guards will be created without assignments.');
    } else {
      console.log(`📍 Found ${lotNames.length} parking lots:`);
      lotNames.forEach(name => console.log(`   - ${name}`));
    }

    // Clear existing guards
    await Guard.deleteMany({});
    console.log('🗑️  Cleared existing guards');

    // Create guards with assignments
    const guards = [
      {
        guardId: 'GUARD001',
        name: 'Rajesh Kumar',
        password: 'guard123',
        phoneNumber: '+91-9876543210',
        assignedParkingLot: lotNames[0] || null,
        status: 'ACTIVE'
      },
      {
        guardId: 'GUARD002',
        name: 'Amit Singh',
        password: 'guard123',
        phoneNumber: '+91-9876543211',
        assignedParkingLot: lotNames[1] || null,
        status: 'ACTIVE'
      },
      {
        guardId: 'GUARD003',
        name: 'Suresh Sharma',
        password: 'guard123',
        phoneNumber: '+91-9876543212',
        assignedParkingLot: lotNames[2] || null,
        status: 'ACTIVE'
      },
      {
        guardId: 'GUARD004',
        name: 'Vikram Patel',
        password: 'guard123',
        phoneNumber: '+91-9876543213',
        assignedParkingLot: lotNames[0] || null,
        status: 'ACTIVE'
      },
      {
        guardId: 'GUARD005',
        name: 'Manoj Verma',
        password: 'guard123',
        phoneNumber: '+91-9876543214',
        assignedParkingLot: lotNames[1] || null,
        status: 'ACTIVE'
      }
    ];

    await Guard.create(guards);

    console.log('\n✅ Guards created successfully!\n');
    console.log('📋 GUARD DETAILS:');
    console.log('=' .repeat(70));
    guards.forEach(g => {
      const lot = g.assignedParkingLot || 'Unassigned - Can work at any location';
      console.log(`\n👮 ${g.guardId} - ${g.name}`);
      console.log(`   🔑 Password: ${g.password}`);
      console.log(`   📞 Phone: ${g.phoneNumber}`);
      console.log(`   📍 Assigned to: ${lot}`);
      console.log(`   ✅ Status: ${g.status}`);
    });
    console.log('\n' + '='.repeat(70));

    mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initGuards();
