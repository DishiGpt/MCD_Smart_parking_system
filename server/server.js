const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const ParkingLot = require('./models/ParkingLot');
const Transaction = require('./models/Transaction');
const Alert = require('./models/Alert');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  initializeDatabase();
})
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Initialize database with sample data
async function initializeDatabase() {
  try {
    const count = await ParkingLot.countDocuments();
    if (count === 0) {
      await ParkingLot.create([
        { 
          name: 'Main Gate Parking', 
          capacity: 50, 
          currentOccupancy: 0,
          location: {
            latitude: 28.7041,
            longitude: 77.1025,
            address: 'Connaught Place, New Delhi'
          }
        },
        { 
          name: 'North Wing Parking', 
          capacity: 30, 
          currentOccupancy: 0,
          location: {
            latitude: 28.7196,
            longitude: 77.1025,
            address: 'Kamla Nagar, Delhi'
          }
        },
        { 
          name: 'South Wing Parking', 
          capacity: 40, 
          currentOccupancy: 0,
          location: {
            latitude: 28.6869,
            longitude: 77.1025,
            address: 'Nehru Place, New Delhi'
          }
        }
      ]);
      console.log('✅ Sample parking lots created');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// ==================== API ENDPOINTS ====================

// 1. GET /api/status - Get current parking status
app.get('/api/status', async (req, res) => {
  try {
    const parkingLots = await ParkingLot.find();
    const totalCapacity = parkingLots.reduce((sum, lot) => sum + lot.capacity, 0);
    const totalOccupancy = parkingLots.reduce((sum, lot) => sum + lot.currentOccupancy, 0);
    
    res.json({
      success: true,
      parkingLots,
      summary: {
        totalCapacity,
        totalOccupancy,
        availableSpots: totalCapacity - totalOccupancy
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/entry - Handle vehicle entry
app.post('/api/entry', async (req, res) => {
  try {
    const { vehicleNumber, parkingLotName } = req.body;
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    // Find parking lot or use default
    const lotName = parkingLotName || 'Main Gate Parking';
    const parkingLot = await ParkingLot.findOne({ name: lotName });
    
    if (!parkingLot) {
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    // Check if parking lot is full
    if (parkingLot.currentOccupancy >= parkingLot.capacity) {
      return res.status(400).json({ success: false, message: 'Parking lot is full' });
    }

    // Check if vehicle already has an active transaction
    const existingTransaction = await Transaction.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'ACTIVE'
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vehicle already has an active parking session' 
      });
    }

    // Create transaction
    const transaction = new Transaction({
      vehicleNumber: vehicleNumber.toUpperCase(),
      parkingLot: lotName,
      entryTime: new Date(),
      status: 'ACTIVE'
    });
    await transaction.save();

    // Update parking lot occupancy
    parkingLot.currentOccupancy += 1;
    await parkingLot.save();

    res.json({
      success: true,
      message: 'Vehicle entry recorded successfully',
      transaction,
      parkingLot: {
        name: parkingLot.name,
        occupancy: parkingLot.currentOccupancy,
        capacity: parkingLot.capacity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/exit - Handle vehicle exit
app.post('/api/exit', async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    // Find active transaction
    const transaction = await Transaction.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'ACTIVE'
    });

    if (!transaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active parking session found for this vehicle' 
      });
    }

    // Calculate parking duration and fee
    const exitTime = new Date();
    const durationInHours = Math.ceil((exitTime - transaction.entryTime) / (1000 * 60 * 60));
    const feePerHour = 20; // ₹20 per hour
    const totalFee = durationInHours * feePerHour;

    // Update transaction
    transaction.exitTime = exitTime;
    transaction.fee = totalFee;
    transaction.status = 'COMPLETED';
    await transaction.save();

    // Update parking lot occupancy
    const parkingLot = await ParkingLot.findOne({ name: transaction.parkingLot });
    if (parkingLot) {
      parkingLot.currentOccupancy = Math.max(0, parkingLot.currentOccupancy - 1);
      await parkingLot.save();
    }

    res.json({
      success: true,
      message: 'Vehicle exit recorded successfully',
      transaction: {
        vehicleNumber: transaction.vehicleNumber,
        entryTime: transaction.entryTime,
        exitTime: transaction.exitTime,
        duration: `${durationInHours} hour(s)`,
        fee: totalFee
      },
      parkingLot: parkingLot ? {
        name: parkingLot.name,
        occupancy: parkingLot.currentOccupancy,
        capacity: parkingLot.capacity
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /api/alert - Create tamper alert
app.post('/api/alert', async (req, res) => {
  try {
    const { type, location, description } = req.body;
    
    if (!type || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'Alert type and location are required' 
      });
    }

    const alert = new Alert({
      type,
      location,
      description: description || `${type} detected at ${location}`,
      severity: type === 'GHOST_VEHICLE' || type === 'FORCED_ENTRY' ? 'CRITICAL' : 'MEDIUM',
      timestamp: new Date()
    });
    await alert.save();

    res.json({
      success: true,
      message: '⚠️ Alert created successfully',
      alert
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. POST /api/hardware-event - Generic hardware event handler
app.post('/api/hardware-event', async (req, res) => {
  try {
    const { eventType, vehicleNumber, location } = req.body;
    
    switch (eventType) {
      case 'RFID_SCAN':
        // Valid entry with RFID
        if (vehicleNumber) {
          const entryResult = await handleEntry(vehicleNumber, location);
          return res.json(entryResult);
        }
        break;
        
      case 'LOOP_TRIGGER':
        // Loop detector triggered without RFID - Potential theft!
        const alert = new Alert({
          type: 'GHOST_VEHICLE',
          location: location || 'Unknown',
          description: 'Loop detector triggered without RFID scan - Possible unauthorized entry',
          severity: 'CRITICAL',
          timestamp: new Date()
        });
        await alert.save();
        
        return res.json({
          success: true,
          message: '⚠️ GHOST VEHICLE ALERT TRIGGERED',
          alert
        });
        
      default:
        return res.status(400).json({ 
          success: false, 
          message: 'Unknown event type' 
        });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function for entry
async function handleEntry(vehicleNumber, parkingLotName) {
  const lotName = parkingLotName || 'Main Gate Parking';
  const parkingLot = await ParkingLot.findOne({ name: lotName });
  
  if (!parkingLot || parkingLot.currentOccupancy >= parkingLot.capacity) {
    throw new Error('Parking lot is full or not found');
  }

  const transaction = new Transaction({
    vehicleNumber: vehicleNumber.toUpperCase(),
    parkingLot: lotName,
    entryTime: new Date(),
    status: 'ACTIVE'
  });
  await transaction.save();

  parkingLot.currentOccupancy += 1;
  await parkingLot.save();

  return {
    success: true,
    message: 'Vehicle entry recorded',
    transaction
  };
}

// 6. GET /api/alerts - Get all alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(50);
    const unresolvedCount = await Alert.countDocuments({ resolved: false });
    
    res.json({
      success: true,
      alerts,
      unresolvedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. GET /api/transactions - Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ entryTime: -1 }).limit(100);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayTransactions = await Transaction.countDocuments({
      entryTime: { $gte: todayStart }
    });
    
    const totalRevenue = await Transaction.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$fee' } } }
    ]);

    // Calculate occupancy rate
    const parkingLots = await ParkingLot.find();
    const totalCapacity = parkingLots.reduce((sum, lot) => sum + lot.capacity, 0);
    const totalOccupancy = parkingLots.reduce((sum, lot) => sum + lot.currentOccupancy, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;

    res.json({
      success: true,
      transactions,
      stats: {
        todayCount: todayTransactions,
        totalRevenue: totalRevenue[0]?.total || 0,
        occupancyRate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. PATCH /api/alerts/:id/resolve - Resolve an alert
app.patch('/api/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    
    alert.resolved = true;
    alert.resolvedAt = new Date();
    await alert.save();
    
    res.json({
      success: true,
      message: 'Alert resolved',
      alert
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 9. GET /api/stats - Get occupancy rate for admin
app.get('/api/stats', async (req, res) => {
  try {
    const parkingLots = await ParkingLot.find();
    const totalCapacity = parkingLots.reduce((sum, lot) => sum + lot.capacity, 0);
    const totalOccupancy = parkingLots.reduce((sum, lot) => sum + lot.currentOccupancy, 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
    
    res.json({
      success: true,
      occupancyRate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Parking API is running',
    timestamp: new Date()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
});
