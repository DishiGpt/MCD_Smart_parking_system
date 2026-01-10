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
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-parking';
mongoose.connect(MONGO_URI, {
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
    console.log('📸 ANPR Scan received:', vehicleNumber);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    // Find parking lot or use default
    const lotName = parkingLotName || 'Main Gate Parking';
    const parkingLot = await ParkingLot.findOne({ name: lotName });
    
    if (!parkingLot) {
      console.log('❌ Parking lot not found:', lotName);
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    // Check if parking lot is full
    if (parkingLot.currentOccupancy >= parkingLot.capacity) {
      console.log('❌ Parking lot full:', lotName);
      return res.status(400).json({ success: false, message: 'Parking lot is full' });
    }

    // Check if vehicle already has an active transaction
    const existingTransaction = await Transaction.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'ACTIVE'
    });

    if (existingTransaction) {
      console.log('⚠️ Vehicle already has active session:', vehicleNumber);
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
      status: 'ACTIVE',
      entryMethod: 'ANPR',
      isManualEntry: false,
      flagged: false
    });
    await transaction.save();

    // Update parking lot occupancy
    parkingLot.currentOccupancy += 1;
    await parkingLot.save();

    console.log('✅ Vehicle entry recorded:', vehicleNumber, '| Lot occupancy:', parkingLot.currentOccupancy + '/' + parkingLot.capacity);

    res.json({
      success: true,
      message: `✅ Vehicle ${vehicleNumber.toUpperCase()} Logged`,
      transaction,
      parkingLot: {
        name: parkingLot.name,
        occupancy: parkingLot.currentOccupancy,
        capacity: parkingLot.capacity
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/entry:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// 3. POST /api/exit - Handle vehicle exit
app.post('/api/exit', async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    console.log('🚪 Vehicle exit scan:', vehicleNumber);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    // Find active transaction
    const transaction = await Transaction.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'ACTIVE'
    });

    if (!transaction) {
      console.log('❌ No active session for vehicle:', vehicleNumber);
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

    console.log('✅ Vehicle exit completed:', vehicleNumber, '| Fee: ₹' + totalFee + ' | Duration: ' + durationInHours + ' hour(s)');

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
    console.error('❌ ERROR in /api/exit:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// 3.5. POST /api/manual-entry - Manual override entry (Guard Console)
app.post('/api/manual-entry', async (req, res) => {
  try {
    const { vehicleNumber, parkingLotName, reason, guardName } = req.body;
    console.log('🚩 FLAGGED MANUAL ENTRY:', vehicleNumber, '| Reason:', reason, '| By:', guardName);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    const lotName = parkingLotName || 'Main Gate Parking';
    const parkingLot = await ParkingLot.findOne({ name: lotName });
    
    if (!parkingLot) {
      console.log('❌ Parking lot not found:', lotName);
      return res.status(404).json({ success: false, message: 'Parking lot not found' });
    }

    if (parkingLot.currentOccupancy >= parkingLot.capacity) {
      console.log('❌ Parking lot full:', lotName);
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

    // Create transaction with manual override flag
    const transaction = new Transaction({
      vehicleNumber: vehicleNumber.toUpperCase(),
      parkingLot: lotName,
      entryTime: new Date(),
      status: 'ACTIVE',
      entryMethod: 'MANUAL_OVERRIDE',
      isManualEntry: true,
      manualOverrideReason: reason || 'OTHER',
      manualEntryBy: guardName || 'Unknown Guard',
      flagged: true
    });
    await transaction.save();

    // Update parking lot occupancy
    parkingLot.currentOccupancy += 1;
    await parkingLot.save();

    // Create alert for manual entry
    const alert = new Alert({
      type: 'MANUAL_ENTRY',
      location: lotName,
      description: `Manual entry by ${guardName || 'Guard'} for vehicle ${vehicleNumber.toUpperCase()}. Reason: ${reason || 'Not specified'}`,
      severity: 'MEDIUM',
      timestamp: new Date()
    });
    await alert.save();

    console.log('✅ Manual entry flagged:', vehicleNumber, '| Alert created for admin review');

    res.json({
      success: true,
      message: `⚠️ Manual Entry: ${vehicleNumber.toUpperCase()} Logged (${reason})`,
      transaction,
      alert,
      parkingLot: {
        name: parkingLot.name,
        occupancy: parkingLot.currentOccupancy,
        capacity: parkingLot.capacity
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/manual-entry:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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

// 10. GET /api/suspicious-activity - Get manual entry rate by contractor
app.get('/api/suspicious-activity', async (req, res) => {
  try {
    const parkingLots = await ParkingLot.find().select('name');
    const suspiciousData = [];

    for (const lot of parkingLots) {
      const totalEntries = await Transaction.countDocuments({
        parkingLot: lot.name,
        status: { $in: ['ACTIVE', 'COMPLETED'] }
      });

      const manualEntries = await Transaction.countDocuments({
        parkingLot: lot.name,
        isManualEntry: true,
        status: { $in: ['ACTIVE', 'COMPLETED'] }
      });

      const manualRate = totalEntries > 0 ? ((manualEntries / totalEntries) * 100).toFixed(2) : 0;
      const flagged = manualRate > 5; // >5% threshold

      suspiciousData.push({
        parkingLot: lot.name,
        totalEntries,
        manualEntries,
        manualRate: parseFloat(manualRate),
        flagged,
        alertMessage: flagged ? `⚠️ High Manual Entry Rate at ${lot.name} (${manualRate}%) - Check for Corruption` : null
      });
    }

    res.json({
      success: true,
      suspiciousActivity: suspiciousData,
      criticalAlerts: suspiciousData.filter(d => d.flagged)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 11. GET /api/parking-lots - Get all parking lots with capacity info
app.get('/api/parking-lots', async (req, res) => {
  try {
    const parkingLots = await ParkingLot.find().select('name location currentOccupancy capacity hourlyRate');
    
    const lotsWithCapacity = parkingLots.map(lot => ({
      id: lot._id,
      name: lot.name,
      location: lot.location || 'Not specified',
      occupancy: lot.currentOccupancy,
      capacity: lot.capacity,
      available: lot.capacity - lot.currentOccupancy,
      occupancyRate: ((lot.currentOccupancy / lot.capacity) * 100).toFixed(1),
      hourlyRate: lot.hourlyRate || 50,
      isFull: lot.currentOccupancy >= lot.capacity
    }));

    res.json({
      success: true,
      parkingLots: lotsWithCapacity
    });
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

// 12. GET /api/scan-history - Get recent scan history for Guard Console
app.get('/api/scan-history', async (req, res) => {
  try {
    const { parkingLotName, limit = 20 } = req.query;
    
    const lotName = parkingLotName || 'Main Gate Parking';
    
    // Fetch recent transactions for this parking lot
    const transactions = await Transaction.find({
      parkingLot: lotName
    })
    .sort({ entryTime: -1 })
    .limit(parseInt(limit))
    .select('vehicleNumber entryTime exitTime fee status entryMethod isManualEntry manualOverrideReason manualEntryBy flagged');

    const scans = transactions.map(tx => ({
      plate: tx.vehicleNumber,
      time: tx.entryTime.toLocaleTimeString(),
      method: tx.entryMethod,
      status: tx.flagged ? 'FLAGGED' : 'SUCCESS',
      reason: tx.manualOverrideReason || null,
      guardName: tx.manualEntryBy || null,
      fee: tx.fee || 0,
      exitTime: tx.exitTime ? tx.exitTime.toLocaleTimeString() : null
    }));

    res.json({
      success: true,
      count: scans.length,
      parkingLot: lotName,
      scans
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
