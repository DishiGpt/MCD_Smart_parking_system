const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const ParkingLot = require('./models/ParkingLot');
const Transaction = require('./models/Transaction');
const Alert = require('./models/Alert');
const GuardSession = require('./models/GuardSession');
const Guard = require('./models/Guard');
const Report = require('./models/Report');

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
    // Note: Parking lots are managed separately and contain actual Delhi locations
    // Do not auto-initialize parking lots here to avoid overwriting real data

    // Initialize guards
    const guardCount = await Guard.countDocuments();
    if (guardCount === 0) {
      // Get available parking lots from database
      const parkingLots = await ParkingLot.find().limit(5);
      const lotNames = parkingLots.map(lot => lot.name);
      
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
      console.log('✅ Guards created and assigned to parking lots');
      console.log('📋 Guard Details:');
      guards.forEach(g => {
        const lot = g.assignedParkingLot || 'Unassigned';
        console.log(`   - ${g.guardId} (${g.name}) / guard123`);
        console.log(`     📍 ${lot} | 📞 ${g.phoneNumber}`);
      });
    }

    // Ensure "Rajouri Garden Metro Parking" has capacity = 1 for demo
    const rajouriLot = await ParkingLot.findOne({ name: 'Rajouri Garden Metro Parking' });
    if (rajouriLot) {
      if (rajouriLot.capacity !== 1) {
        rajouriLot.capacity = 1;
        await rajouriLot.save();
        console.log('🔧 Demo Config: Set Rajouri Garden Metro Parking capacity to 1');
      }
    } else {
      // If it doesn't exist, create it with capacity 1
      await ParkingLot.create({
        name: 'Rajouri Garden Metro Parking',
        capacity: 1,
        currentOccupancy: 0,
        location: {
          latitude: 28.6410,
          longitude: 77.1215,
          address: 'Rajouri Garden Metro Station, West Delhi'
        },
        status: 'AVAILABLE'
      });
      console.log('🔧 Demo Config: Created Rajouri Garden Metro Parking with capacity 1');
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
    const { vehicleNumber, parkingLotName, sessionId } = req.body;
    console.log('📸 ANPR Scan received:', vehicleNumber, '| Lot:', parkingLotName);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    // Find parking lot or use default
    const lotName = parkingLotName || 'Main Gate Parking';
    console.log('   Using parking lot:', lotName);
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
      guardSessionId: sessionId || null,
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

// 2.5 POST /api/calculate-fee - Calculate parking fee without exiting
app.post('/api/calculate-fee', async (req, res) => {
  try {
    const { vehicleNumber } = req.body;
    console.log('💰 Calculating fee for vehicle:', vehicleNumber);
    
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
    const currentTime = new Date();
    const durationInHours = Math.ceil((currentTime - transaction.entryTime) / (1000 * 60 * 60));
    const parkingLot = await ParkingLot.findOne({ name: transaction.parkingLot });
    const hourlyRate = parkingLot?.hourlyRate || 50;
    const totalFee = durationInHours * hourlyRate;

    console.log('✅ Fee calculated:', vehicleNumber, '| Duration:', durationInHours, 'hrs | Fee: ₹' + totalFee);

    res.json({
      success: true,
      fee: totalFee,
      duration: durationInHours,
      hourlyRate: hourlyRate,
      entryTime: transaction.entryTime,
      vehicleNumber: transaction.vehicleNumber,
      parkingLot: transaction.parkingLot
    });
  } catch (error) {
    console.error('❌ ERROR in /api/calculate-fee:', error.message);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// 3. POST /api/exit - Handle vehicle exit with payment mode
app.post('/api/exit', async (req, res) => {
  try {
    const { vehicleNumber, paymentMode, sessionId } = req.body;
    console.log('🚪 Vehicle exit scan:', vehicleNumber, '| Payment:', paymentMode);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    if (!paymentMode || !['CASH', 'UPI', 'FASTAG'].includes(paymentMode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid payment mode required (CASH/UPI/FASTAG)' 
      });
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
    const parkingLot = await ParkingLot.findOne({ name: transaction.parkingLot });
    const hourlyRate = parkingLot?.hourlyRate || 50;
    const totalFee = durationInHours * hourlyRate;

    // Update transaction with payment details
    transaction.exitTime = exitTime;
    transaction.fee = totalFee;
    transaction.status = 'COMPLETED';
    transaction.paymentMode = paymentMode;
    transaction.guardSessionId = sessionId || null;
    // Receipt will be auto-generated by pre-save hook
    await transaction.save();

    console.log('✅ Receipt generated:', transaction.receiptNumber);

    // Update parking lot occupancy
    if (parkingLot) {
      parkingLot.currentOccupancy = Math.max(0, parkingLot.currentOccupancy - 1);
      await parkingLot.save();
    }

    console.log('✅ Vehicle exit completed:', vehicleNumber, '| Fee: ₹' + totalFee + ' | Payment:', paymentMode);

    res.json({
      success: true,
      message: 'Vehicle exit recorded successfully',
      transaction: {
        vehicleNumber: transaction.vehicleNumber,
        entryTime: transaction.entryTime,
        exitTime: transaction.exitTime,
        paymentMode: transaction.paymentMode,
        receiptNumber: transaction.receiptNumber,
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

// 3.5. POST /api/manual-entry - Manual override entry (Guard Console) - 🔒 SECURED
app.post('/api/manual-entry', async (req, res) => {
  try {
    const { vehicleNumber, parkingLotName, reason, guardName, cameraStatus, sessionId } = req.body;
    console.log('🚩 FLAGGED MANUAL ENTRY:', vehicleNumber, '| Reason:', reason, '| By:', guardName, '| Camera:', cameraStatus);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    if (!sessionId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Manual entry denied. No active shift session.'
      });
    }

    // 🔒 SECURITY: Validate that manual entry is justified
    const validReasons = ['CAMERA_GLITCH', 'SERVER_TIMEOUT', 'SYSTEM_FAILURE', 'OTHER'];
    if (!validReasons.includes(reason)) {
      console.log('❌ Invalid reason:', reason);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid failure reason. Manual entry rejected.' 
      });
    }

    // 🔒 SECURITY: Verify camera status indicates actual failure (logged but not blocking)
    const allowedCameraStatuses = ['NO_CAMERA', 'PERMISSION_DENIED', 'STREAM_ERROR'];
    if (cameraStatus && !allowedCameraStatuses.includes(cameraStatus)) {
      console.log('⚠️ Camera operational but manual entry allowed for edge cases. Status:', cameraStatus);
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

    // 🔒 SECURITY: Create transaction with enhanced audit fields
    const transaction = new Transaction({
      vehicleNumber: vehicleNumber.toUpperCase(),
      parkingLot: lotName,
      entryTime: new Date(),
      status: 'ACTIVE',
      entryMethod: 'MANUAL_OVERRIDE',
      isManualEntry: true,
      manualOverrideReason: reason || 'OTHER',
      manualEntryBy: guardName || 'Unknown Guard',
      guardSessionId: sessionId,
      riskFlag: 'HIGH',
      flagged: true
    });
    await transaction.save();
    console.log('✅ Manual entry saved with REVIEW FLAG:', transaction.vehicleNumber, '- ID:', transaction._id, '| Session:', sessionId);

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

// 4.5 POST /api/manual-exit - Manual exit override for guard
app.post('/api/manual-exit', async (req, res) => {
  try {
    const { vehicleNumber, parkingLotName, reason, guardName, cameraStatus, sessionId, paymentMode } = req.body;
    console.log('🚩 FLAGGED MANUAL EXIT:', vehicleNumber, '| Reason:', reason, '| By:', guardName, '| Payment:', paymentMode);
    
    if (!vehicleNumber) {
      return res.status(400).json({ success: false, message: 'Vehicle number is required' });
    }

    if (!sessionId) {
      return res.status(403).json({
        success: false,
        message: '🔒 Manual exit denied. No active shift session.'
      });
    }

    if (!paymentMode || !['CASH', 'UPI', 'FASTAG'].includes(paymentMode)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid payment mode required (CASH/UPI/FASTAG)' 
      });
    }

    // 🔒 SECURITY: Validate that manual exit is justified
    const validReasons = ['CAMERA_GLITCH', 'SERVER_TIMEOUT', 'SYSTEM_FAILURE', 'OTHER'];
    if (!validReasons.includes(reason)) {
      console.log('❌ Invalid reason:', reason);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid failure reason. Manual exit rejected.' 
      });
    }

    // 🔒 SECURITY: Verify camera status indicates actual failure
    // Allow manual exit if camera status shows failure OR if explicitly doing manual override
    const operationalCameraStatuses = ['OK', 'INITIALIZING'];
    if (cameraStatus && operationalCameraStatuses.includes(cameraStatus) && reason !== 'OTHER') {
      console.log('⚠️ Camera operational but manual exit requested. Status:', cameraStatus, 'Reason:', reason);
      // Allow it but flag for review
    }

    const lotName = parkingLotName || 'Main Gate Parking';
    
    // Find active transaction
    const transaction = await Transaction.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'ACTIVE'
    });

    if (!transaction) {
      console.log('❌ No active transaction found for vehicle:', vehicleNumber);
      return res.status(404).json({ 
        success: false, 
        message: 'No active parking session found for this vehicle' 
      });
    }

    // Calculate parking duration and fee
    const exitTime = new Date();
    const durationMs = exitTime - transaction.entryTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
    
    const parkingLot = await ParkingLot.findOne({ name: transaction.parkingLot });
    const hourlyRate = parkingLot?.hourlyRate || 50;
    const fee = durationHours * hourlyRate;

    // Update transaction
    transaction.exitTime = exitTime;
    transaction.status = 'COMPLETED';
    transaction.duration = durationHours;
    transaction.fee = fee;
    transaction.exitMethod = 'MANUAL_OVERRIDE';
    transaction.manualExitBy = guardName || 'Unknown Guard';
    transaction.manualExitReason = reason || 'OTHER';
    transaction.paymentMode = paymentMode;
    transaction.guardSessionId = sessionId;
    transaction.flagged = true;
    // Receipt auto-generated by pre-save hook
    await transaction.save();

    console.log('✅ Manual exit saved with REVIEW FLAG:', transaction.vehicleNumber, '| Receipt:', transaction.receiptNumber, '| Fee: Rs.' + fee);

    // Update parking lot occupancy
    if (parkingLot) {
      parkingLot.currentOccupancy = Math.max(0, parkingLot.currentOccupancy - 1);
      await parkingLot.save();
    }

    // Create alert for manual exit
    const alert = new Alert({
      type: 'MANUAL_ENTRY',
      location: lotName,
      description: `Manual exit by ${guardName || 'Guard'} for vehicle ${vehicleNumber.toUpperCase()}. Reason: ${reason || 'Not specified'}. Fee: Rs.${fee}`,
      severity: 'MEDIUM',
      timestamp: new Date()
    });
    await alert.save();

    console.log('✅ Manual exit flagged:', vehicleNumber, '| Alert created for admin review');

    res.json({
      success: true,
      message: `Vehicle ${vehicleNumber.toUpperCase()} exited. Fee: Rs.${fee}`,
      transaction,
      alert,
      flagged: true,
      fee
    });
  } catch (error) {
    console.error('❌ ERROR in /api/manual-exit:', error.message, error.stack);
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

// 11. GET /api/guards - Get all guards with their details
app.get('/api/guards', async (req, res) => {
  try {
    const guards = await Guard.find().select('-password');
    
    res.json({
      success: true,
      guards: guards.map(guard => ({
        _id:guard._id,
        guardId: guard.guardId,
        name: guard.name,
        phoneNumber: guard.phoneNumber,
        assignedParkingLot: guard.assignedParkingLot,
        status: guard.status,
        joinDate: guard.joinDate
      }))
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 12. GET /api/parking-lots - Get all parking lots with capacity info
app.get('/api/parking-lots', async (req, res) => {
  try {
    const parkingLots = await ParkingLot.find().select('name location currentOccupancy capacity hourlyRate');
    
    const lotsWithCapacity = parkingLots.map(lot => ({
      id: lot._id,
      name: lot.name,
      location: lot.location || 'Not specified',
      currentOccupancy: lot.currentOccupancy,
      occupancy: lot.currentOccupancy,
      totalCapacity: lot.capacity,
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
    
    console.log('📋 Fetching scan history for:', lotName);
    
    // Fetch recent transactions for this parking lot
    const transactions = await Transaction.find({
      parkingLot: lotName
    })
    .sort({ entryTime: -1 })
    .limit(parseInt(limit))
    .select('vehicleNumber entryTime exitTime fee status entryMethod isManualEntry manualOverrideReason manualEntryBy flagged');
    
    console.log(`   Found ${transactions.length} transactions for ${lotName}`);

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

// System status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    message: 'System is running smoothly',
    timestamp: new Date()
  });
});

// ==================== GUARD AUTHENTICATION & SHIFT MANAGEMENT ====================

// New Unified login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    console.log('👤 Unified login attempt for identifier:', identifier);

    if (!identifier || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Identifier and password are required'
      });
    }

    // 1. Check Admin Credentials
    if (identifier === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
      console.log('✅ Admin authenticated successfully');
      return res.json({
        success: true,
        role: 'ADMIN',
        name: 'Administrator'
      });
    }

    // 2. Check Guard Collection
    const guard = await Guard.findOne({ guardId: identifier.toUpperCase(), status: 'ACTIVE' });
    if (!guard) {
      console.log('❌ Guard not found or inactive:', identifier);
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (guard.password !== password) {
      console.log('❌ Guard password mismatch:', guard.guardId);
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    if (!guard.assignedParkingLot) {
      console.log('❌ Guard has no assigned parking lot:', guard.guardId);
      return res.status(400).json({
        success: false,
        message: 'No parking lot assigned. Contact admin.'
      });
    }

    console.log('✅ Guard authenticated successfully:', guard.guardId);
    return res.json({
      success: true,
      role: 'GUARD',
      guardId: guard.guardId,
      guardName: guard.name,
      assignedParkingLot: guard.assignedParkingLot
    });
  } catch (error) {
    console.error('❌ ERROR in /api/auth/login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 13. POST /api/guard/login - Guard authentication & shift start
app.post('/api/guard/login', async (req, res) => {
  try {
    const { guardId, password, openingCash, systemHealth } = req.body;
    
    if (!guardId || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ 
        success: false, 
        message: 'Guard ID and password required' 
      });
    }

    // Authenticate guard against database
    const guard = await Guard.findOne({ guardId: guardId.toUpperCase(), status: 'ACTIVE' });
    
    if (!guard) {
      return res.status(401).json({
        success: false,
        message: '🔒 Invalid Guard ID'
      });
    }

    if (guard.password !== password) {
      return res.status(401).json({
        success: false,
        message: '🔒 Invalid password'
      });
    }

    if (!guard.assignedParkingLot) {
      return res.status(400).json({ 
        success: false, 
        message: 'No parking lot assigned. Contact admin.' 
      });
    }

    console.log('🔐 Guard login attempt:', { guardId, parkingLot: guard.assignedParkingLot, hasPassword: !!password });

    // Check if guard has an active session
    const existingSession = await GuardSession.findOne({
      guardId: guardId.toUpperCase(),
      status: 'ACTIVE'
    });

    if (existingSession) {
      console.log('⚠️ Guard already has active session:', existingSession.sessionId);
      return res.status(400).json({
        success: false,
        message: '⚠️ You already have an active shift. Please close previous shift first.',
        activeSession: existingSession
      });
    }

    // Create new session
    const sessionId = `SHIFT-${Date.now()}-${guardId}`;
    const selectedParkingLot = guard.assignedParkingLot;
    
    const session = new GuardSession({
      sessionId,
      guardId,
      guardName: guard.name,
      parkingLot: selectedParkingLot,
      startTime: new Date(),
      openingCash: openingCash || 0,
      status: 'ACTIVE',
      systemHealthAtStart: systemHealth || {
        camera: 'OK',
        printer: 'OK',
        internet: 'OK'
      }
    });
    await session.save();

    console.log('✅ Guard shift started:', guardId, '| Session:', sessionId);

    res.json({
      success: true,
      message: '✅ Shift started successfully',
      session: {
        sessionId: session.sessionId,
        guardId: session.guardId,
        parkingLot: session.parkingLot,
        startTime: session.startTime,
        systemHealth: session.systemHealthAtStart
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guard/login:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 14. POST /api/guard/end-shift - Close shift and reconcile cash
app.post('/api/guard/end-shift', async (req, res) => {
  try {
    const { sessionId, closingCash } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required'
      });
    }

    const session = await GuardSession.findOne({ sessionId, status: 'ACTIVE' });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'No active session found'
      });
    }

    // Calculate expected cash from all CASH transactions in this session
    const cashTransactions = await Transaction.find({
      guardSessionId: sessionId,
      paymentMode: 'CASH',
      status: 'COMPLETED'
    });

    const systemCashExpected = cashTransactions.reduce((sum, tx) => sum + tx.fee, 0);
    const expectedClosingCash = session.openingCash + systemCashExpected;
    const actualClosingCash = closingCash || 0;

    // Validate that closing cash matches expected cash exactly
    if (actualClosingCash !== expectedClosingCash) {
      console.log(`❌ Cash reconciliation failed. Expected: ₹${expectedClosingCash}, Entered: ₹${actualClosingCash}`);
      return res.status(400).json({
        success: false,
        message: `Cash reconciliation failed. Expected Closing Cash: ₹${expectedClosingCash}, Entered: ₹${actualClosingCash}. Please reconcile before closing the shift.`,
        expected: expectedClosingCash,
        actual: actualClosingCash
      });
    }

    const cashShortage = 0;

    // Get all transactions for this session
    const allTransactions = await Transaction.find({ guardSessionId: sessionId });
    
    const stats = {
      total: allTransactions.length,
      entries: allTransactions.filter(tx => tx.status === 'ACTIVE' || tx.entryTime).length,
      exits: allTransactions.filter(tx => tx.status === 'COMPLETED').length,
      manual: allTransactions.filter(tx => tx.isManualEntry || tx.exitMethod === 'MANUAL_OVERRIDE').length,
      automated: allTransactions.filter(tx => !tx.isManualEntry && tx.exitMethod !== 'MANUAL_OVERRIDE').length
    };

    const revenue = {
      cash: allTransactions.filter(tx => tx.paymentMode === 'CASH').reduce((sum, tx) => sum + tx.fee, 0),
      upi: allTransactions.filter(tx => tx.paymentMode === 'UPI').reduce((sum, tx) => sum + tx.fee, 0),
      fastag: allTransactions.filter(tx => tx.paymentMode === 'FASTAG').reduce((sum, tx) => sum + tx.fee, 0),
      total: allTransactions.reduce((sum, tx) => sum + tx.fee, 0)
    };

    // Update session
    session.endTime = new Date();
    session.closingCash = actualClosingCash;
    session.systemCashExpected = systemCashExpected;
    session.actualCashCollected = actualClosingCash - session.openingCash;
    session.cashShortage = cashShortage;
    session.status = Math.abs(cashShortage) > 0 ? 'FLAGGED' : 'CLOSED';
    session.transactionCount = stats;
    session.revenueBreakdown = revenue;
    
    await session.save();

    // Create alert if shortage detected
    if (Math.abs(cashShortage) > 50) {
      const alert = new Alert({
        type: 'SYSTEM_ERROR',
        location: session.parkingLot,
        description: `Cash shortage of Rs.${Math.abs(cashShortage)} detected for Guard ${session.guardId}. Expected: Rs.${systemCashExpected}, Found: Rs.${actualClosingCash - session.openingCash}`,
        severity: 'CRITICAL',
        timestamp: new Date()
      });
      await alert.save();
      session.shortageAlertCreated = true;
      await session.save();
    }

    console.log('🔒 Shift ended:', sessionId, '| Cash Shortage:', cashShortage);

    res.json({
      success: true,
      message: cashShortage === 0 ? '✅ Shift closed successfully' : '⚠️ Cash shortage detected',
      settlement: {
        sessionId: session.sessionId,
        duration: `${Math.round((session.endTime - session.startTime) / (1000 * 60 * 60))} hours`,
        transactionCount: stats,
        revenue: revenue,
        cashReconciliation: {
          openingCash: session.openingCash,
          closingCash: actualClosingCash,
          expectedCash: systemCashExpected,
          actualCashCollected: actualClosingCash - session.openingCash,
          shortage: cashShortage,
          shortagePercent: systemCashExpected > 0 ? ((cashShortage / systemCashExpected) * 100).toFixed(2) : 0
        },
        riskScore: session.riskScore,
        status: session.status
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guard/end-shift:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 15. GET /api/guard/active-session/:guardId - Get active session for guard
app.get('/api/guard/active-session/:guardId', async (req, res) => {
  try {
    const { guardId } = req.params;
    
    const session = await GuardSession.findOne({
      guardId,
      status: 'ACTIVE'
    });

    if (!session) {
      return res.json({
        success: true,
        hasActiveSession: false,
        session: null
      });
    }

    // Get real-time stats
    const transactions = await Transaction.find({ guardSessionId: session.sessionId });
    const cashCollected = transactions
      .filter(tx => tx.paymentMode === 'CASH' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.fee, 0);
    const upiCollected = transactions
      .filter(tx => tx.paymentMode === 'UPI' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.fee, 0);
    const fastagCollected = transactions
      .filter(tx => tx.paymentMode === 'FASTAG' && tx.status === 'COMPLETED')
      .reduce((sum, tx) => sum + tx.fee, 0);

    res.json({
      success: true,
      hasActiveSession: true,
      session: {
        sessionId: session.sessionId,
        guardId: session.guardId,
        parkingLot: session.parkingLot,
        startTime: session.startTime,
        openingCash: session.openingCash,
        currentCashExpected: cashCollected,
        upiCollected,
        fastagCollected,
        transactionCount: transactions.length,
        systemHealthAtStart: session.systemHealthAtStart
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guard/active-session:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 16. GET /api/admin/guard-sessions - Get all guard sessions for audit
app.get('/api/admin/guard-sessions', async (req, res) => {
  try {
    const { status, flagged } = req.query;
    
    let query = {};
    if (status) query.status = status;
    
    const sessions = await GuardSession.find(query)
      .sort({ startTime: -1 })
      .limit(100);

    const flaggedSessions = sessions.filter(s => 
      s.status === 'FLAGGED' || 
      s.riskScore >= 50 || 
      Math.abs(s.cashShortage) > 0
    );

    res.json({
      success: true,
      sessions,
      stats: {
        total: sessions.length,
        active: sessions.filter(s => s.status === 'ACTIVE').length,
        flagged: flaggedSessions.length,
        totalCashShortage: sessions.reduce((sum, s) => sum + Math.abs(s.cashShortage), 0)
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/admin/guard-sessions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 17. GET /api/guards - Get all guards
app.get('/api/guards', async (req, res) => {
  try {
    const guards = await Guard.find().select('-password').sort({ guardId: 1 });
    res.json({
      success: true,
      guards
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guards:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 18. POST /api/guards - Create new guard
app.post('/api/guards', async (req, res) => {
  try {
    const { guardId, name, password, phoneNumber, assignedParkingLot, status } = req.body;
    
    if (!guardId || !name || !password || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Guard ID, name, password, and phone number are required'
      });
    }

    // Check if guard ID already exists
    const existing = await Guard.findOne({ guardId: guardId.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Guard ID already exists'
      });
    }

    const guard = new Guard({
      guardId: guardId.toUpperCase(),
      name,
      password,
      phoneNumber: phoneNumber || '',
      assignedParkingLot: assignedParkingLot || null,
      status: status || 'ACTIVE',
      joinDate: new Date()
    });

    await guard.save();

    res.json({
      success: true,
      message: 'Guard created successfully',
      guard: {
        _id: guard._id,
        guardId: guard.guardId,
        name: guard.name,
        phoneNumber: guard.phoneNumber,
        assignedParkingLot: guard.assignedParkingLot,
        status: guard.status
      }
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guards POST:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 19. PATCH /api/guards/:id - Update guard status
app.patch('/api/guards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status required (ACTIVE, INACTIVE, or SUSPENDED)'
      });
    }

    const guard = await Guard.findByIdAndUpdate(
      id,
      { status },
      { new: true, select: '-password' }
    );

    if (!guard) {
      return res.status(404).json({
        success: false,
        message: 'Guard not found'
      });
    }

    res.json({
      success: true,
      message: 'Guard status updated successfully',
      guard
    });
  } catch (error) {
    console.error('❌ ERROR in /api/guards PATCH:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// UPDATE guard details (edit)
app.put('/api/guards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, assignedParkingLot, password, status } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phoneNumber !== undefined) update.phoneNumber = phoneNumber;
    if (assignedParkingLot !== undefined) update.assignedParkingLot = assignedParkingLot;
    if (status !== undefined) update.status = status;

    // only update password if provided
    if (password && password.trim() !== '') update.password = password;

    const guard = await Guard.findByIdAndUpdate(id, update, { new: true });
    if (!guard) return res.status(404).json({ success: false, message: 'Guard not found' });

    return res.json({ success: true, message: 'Guard updated successfully', guard });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE guard
app.delete('/api/guards/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const guard = await Guard.findByIdAndDelete(id);
    if (!guard) return res.status(404).json({ success: false, message: 'Guard not found' });

    return res.json({ success: true, message: 'Guard deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Occupancy trend for today (counts how many vehicles are parked at each time bucket)
app.get('/api/occupancy-trends', async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Pull transactions that overlap today (entered before end of day, exited after start of day or still active)
    const transactions = await Transaction.find({
      entryTime: { $lte: todayEnd },
      $or: [{ exitTime: null }, { exitTime: { $gte: todayStart } }]
    }).select('entryTime exitTime');

    // Keep same buckets as your UI demo chart
    const buckets = [8, 10, 12, 14, 16, 18];

    const trends = buckets.map((hour) => {
      const t = new Date(todayStart);
      t.setHours(hour, 0, 0, 0);

      const vehicles = transactions.reduce((count, tx) => {
        const entered = new Date(tx.entryTime) <= t;
        const notExited = !tx.exitTime || new Date(tx.exitTime) > t;
        return count + (entered && notExited ? 1 : 0);
      }, 0);

      return { name: `${String(hour).padStart(2, '0')}:00`, vehicles };
    });

    res.json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// ==================== USER COMPLAINTS / REPORTING API ====================

// 19. POST /api/reports - Create a user complaint/report
app.post('/api/reports', async (req, res) => {
  try {
    const { parkingLotName, parkingLotId, userName, userContact, category, message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required and cannot be empty' });
    }
    
    const allowedCategories = ['Overcharge', 'Slow service', 'Vehicle damage', 'Staff behavior', 'Payment issue', 'Other'];
    if (!category || !allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, message: 'Valid category is required' });
    }
    
    if (!parkingLotName || !parkingLotName.trim()) {
      return res.status(400).json({ success: false, message: 'Parking lot name is required' });
    }
    
    const report = new Report({
      parkingLotName,
      parkingLotId: parkingLotId || null,
      userName: userName || '',
      userContact: userContact || '',
      category,
      message,
      status: 'PENDING',
      adminReply: ''
    });
    
    await report.save();
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 20. GET /api/reports - Get all reports for admin
app.get('/api/reports', async (req, res) => {
  try {
    const { parkingLot } = req.query;
    let query = {};
    if (parkingLot) {
      query.parkingLotName = parkingLot;
    }
    const reports = await Report.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      reports
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 21. GET /api/reports/summary - Summary count of reports for dashboard
app.get('/api/reports/summary', async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const pending = await Report.countDocuments({ status: 'PENDING' });
    const inReview = await Report.countDocuments({ status: 'IN_REVIEW' });
    const resolved = await Report.countDocuments({ status: 'RESOLVED' });
    
    res.json({
      success: true,
      summary: {
        total,
        pending,
        inReview,
        resolved,
        unresolved: total - resolved
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 22. GET /api/reports/:id - Get single report details
app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 23. PATCH /api/reports/:id - Update status and/or admin reply
app.patch('/api/reports/:id', async (req, res) => {
  try {
    const { status, adminReply } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    if (status) {
      const allowedStatus = ['PENDING', 'IN_REVIEW', 'RESOLVED'];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      report.status = status;
    }
    
    if (adminReply !== undefined) {
      report.adminReply = adminReply;
    }
    
    await report.save();
    res.json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 24. DELETE /api/reports/:id - Delete a user complaint/report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



// ==================== DEPLOYMENT CONFIG ====================

// Always listen on the port (Required for Render)
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export the Express app for serverless deployment
module.exports = app;
