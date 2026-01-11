const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking';

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  currentOccupancy: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'FULL', 'MAINTENANCE'],
    default: 'AVAILABLE'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: true
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);

async function initParkingLots() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing parking lots
    await ParkingLot.deleteMany({});
    console.log('🗑️  Cleared existing parking lots');

    // Create new parking lots - 10 Real Delhi MCD Parking Locations
    const parkingLots = await ParkingLot.create([
      { 
        name: 'Connaught Place Parking', 
        capacity: 120, 
        currentOccupancy: 0,
        location: {
          latitude: 28.6315,
          longitude: 77.2167,
          address: 'Connaught Place, Central Delhi'
        }
      },
      { 
        name: 'Greater Kailash-I M Block Parking', 
        capacity: 80, 
        currentOccupancy: 0,
        location: {
          latitude: 28.5494,
          longitude: 77.2421,
          address: 'M Block Market, Greater Kailash-I, South Delhi'
        }
      },
      { 
        name: 'Nehru Place Metro Parking', 
        capacity: 150, 
        currentOccupancy: 0,
        location: {
          latitude: 28.5494,
          longitude: 77.2501,
          address: 'Nehru Place Metro Station, South Delhi'
        }
      },
      { 
        name: 'Saket District Centre Parking', 
        capacity: 200, 
        currentOccupancy: 0,
        location: {
          latitude: 28.5244,
          longitude: 77.2066,
          address: 'Saket District Centre, South Delhi'
        }
      },
      { 
        name: 'Karol Bagh Market Parking', 
        capacity: 90, 
        currentOccupancy: 0,
        location: {
          latitude: 28.6519,
          longitude: 77.1900,
          address: 'Karol Bagh Main Market, Central Delhi'
        }
      },
      { 
        name: 'Rajouri Garden Metro Parking', 
        capacity: 100, 
        currentOccupancy: 0,
        location: {
          latitude: 28.6410,
          longitude: 77.1215,
          address: 'Rajouri Garden Metro Station, West Delhi'
        }
      },
      { 
        name: 'Lajpat Nagar Central Market Parking', 
        capacity: 70, 
        currentOccupancy: 0,
        location: {
          latitude: 28.5677,
          longitude: 77.2432,
          address: 'Lajpat Nagar-IV Central Market, South Delhi'
        }
      },
      { 
        name: 'Chandni Chowk Parking', 
        capacity: 60, 
        currentOccupancy: 0,
        location: {
          latitude: 28.6506,
          longitude: 77.2303,
          address: 'Chandni Chowk Main Road, Old Delhi'
        }
      },
      { 
        name: 'Dwarka Sector 21 Metro Parking', 
        capacity: 180, 
        currentOccupancy: 0,
        location: {
          latitude: 28.5521,
          longitude: 77.0590,
          address: 'Sector 21 Metro Station, Dwarka, West Delhi'
        }
      },
      { 
        name: 'Rohini Sector 3 Community Centre Parking', 
        capacity: 85, 
        currentOccupancy: 0,
        location: {
          latitude: 28.7090,
          longitude: 77.1137,
          address: 'Sector 3 Community Centre, Rohini, North West Delhi'
        }
      }
    ]);

    console.log('✅ Created parking lots:');
    parkingLots.forEach(lot => {
      console.log(`   - ${lot.name} (${lot.capacity} spaces)`);
    });

    mongoose.connection.close();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initParkingLots();
