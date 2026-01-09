# Smart Parking Management System

A complete MERN Stack application for managing smart parking operations with real-time monitoring, security alerts, and hardware simulation capabilities.

## 🚀 Features

### Three Portal System
1. **User Portal** (`/user`) - Real-time parking availability for drivers
2. **Admin Dashboard** (`/admin`) - Revenue analytics and security monitoring
3. **Hardware Simulator** (`/simulator`) - Mock hardware signals for testing

### Core Capabilities
- ✅ Real-time parking occupancy tracking
- 💰 Automated fee calculation (₹20/hour)
- 🚨 Security alert system for tamper detection
- 👻 Ghost vehicle detection (loop trigger without RFID)
- 📊 Revenue and analytics dashboard
- 🎮 Complete hardware event simulation

## 📋 Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **HTTP Client**: Axios

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- npm or yarn

### Step 1: Install Backend Dependencies
```bash
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### Step 3: Set Up Environment Variables
The `.env` file is already configured with:
```
MONGODB_URI=mongodb://localhost:27017/smart-parking
PORT=5000
```

## 🚦 Running the Application

### Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### Start the Backend Server
```bash
npm start
# or for development with auto-reload
npm run dev
```
Server will run on: `http://localhost:5000`

### Start the Frontend (in a new terminal)
```bash
cd client
npm start
```
Frontend will run on: `http://localhost:3000`

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get current parking status |
| POST | `/api/entry` | Record vehicle entry |
| POST | `/api/exit` | Process vehicle exit & payment |
| POST | `/api/alert` | Create security alert |
| POST | `/api/hardware-event` | Generic hardware event handler |
| GET | `/api/alerts` | Get all alerts |
| GET | `/api/transactions` | Get all transactions |
| PATCH | `/api/alerts/:id/resolve` | Resolve an alert |
| GET | `/api/health` | Health check |

## 🎮 Using the Simulator

1. Navigate to `/simulator`
2. Select a parking location
3. Use the control buttons:
   - **Simulate Valid Entry**: Creates a normal entry (RFID + loop detector)
   - **Simulate Valid Exit**: Processes exit and calculates fee
   - **🚨 TRIGGER THEFT ATTEMPT**: Simulates loop detector WITHOUT RFID (creates critical alert)
   - **Ghost Vehicle Alert**: Manual ghost vehicle alert
   - **Forced Entry Alert**: Manual forced entry alert

## 📊 Database Schema

### ParkingLot
```javascript
{
  name: String,
  capacity: Number,
  currentOccupancy: Number,
  status: 'AVAILABLE' | 'FULL' | 'MAINTENANCE'
}
```

### Transaction
```javascript
{
  vehicleNumber: String,
  entryTime: Date,
  exitTime: Date,
  fee: Number,
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  parkingLot: String
}
```

### Alert
```javascript
{
  type: 'GHOST_VEHICLE' | 'FORCED_ENTRY' | 'CAPACITY_EXCEEDED' | 'SYSTEM_ERROR',
  location: String,
  description: String,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  resolved: Boolean,
  timestamp: Date
}
```

## 🎨 Portal Features

### User Portal
- Color-coded parking lot status (Green = Available, Red = Full)
- Real-time occupancy updates (auto-refresh every 5s)
- Available spaces counter
- Occupancy percentage bars

### Admin Dashboard
- Total vehicles today counter
- Total revenue tracker
- Unresolved alerts counter
- Security alerts table with resolution capability
- Recent transactions table
- Auto-refresh every 10 seconds

### Simulator Portal
- Location selector
- Vehicle number input (or random generation)
- Activity log with color-coded events
- Security alert triggers
- Real-time feedback

## 🔐 Security Features

- **Ghost Vehicle Detection**: Triggered when loop detector activates without RFID scan
- **Forced Entry Alerts**: Manual/automatic barrier breach detection
- **Capacity Monitoring**: Alerts when parking exceeds capacity
- **Real-time Alert Dashboard**: Immediate notification to admin portal

## 📱 Responsive Design

Built with Tailwind CSS for a modern, mobile-responsive interface that works seamlessly across all devices.

## 🎯 Use Cases

1. **Smart City Parking Management**
2. **Mall/Shopping Complex Parking**
3. **Corporate Office Parking**
4. **Airport Parking Systems**
5. **University Campus Parking**

## 🔧 Configuration

### Parking Fee
Default: ₹20 per hour (configurable in `server/server.js` line 127)

### Auto-refresh Intervals
- User Portal: 5 seconds
- Admin Portal: 10 seconds

## 📝 Sample Data

The system automatically creates 3 sample parking lots on first run:
- Main Gate Parking (Capacity: 50)
- North Wing Parking (Capacity: 30)
- South Wing Parking (Capacity: 40)

## 🤝 Contributing

This is a hackathon project. Feel free to fork and enhance!

## 📄 License

MIT

## 👨‍💻 Author

Created for Hack4Delhi - Smart Parking Management System

---

**Note**: This is a prototype system designed for demonstration purposes. For production use, add authentication, data encryption, and enhanced security measures.
