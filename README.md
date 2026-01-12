# MCD Smart Parking System

> Smart Parking Management System — mobile, guard console, and backend API for ANPR/RFID-enabled parking management.

## Project Summary
- Applications:
  - Web Client (Admin / Guard Console): `client/` — React, OCR-based ANPR scanner, admin analytics.
  - Mobile App: `parking-mobile-app/` — Expo/React Native app for users to find nearby parking and navigate.
  - Backend API: `server/` (entry: `server/server.js`) — Node.js/Express + MongoDB business logic for parking, transactions, guard shifts, hardware events.

Core technologies: Node.js, Express, MongoDB (mongoose), React, Expo (React Native), Tesseract OCR, Leaflet, axios, ngrok/vercel for tunneling/deploy.

Primary purpose: Provide an end-to-end smart parking solution where users discover parking, guards manage entry/exit via ANPR/manual flows, and admins audit operations and cash reconciliations.

---

## How It Works (High-level)

- User Journey (Mobile):
  - The mobile app requests device location using `expo-location`.
  - The app fetches nearby parking lots from the backend (`/api/parking-lots`).
  - Distances are computed client-side (Haversine formula) and results are sorted by proximity.
  - User taps Navigate → deep-links to device maps or Google Maps with the parking coordinates.

- Guard Journey (Guard Console):
  - Guard logs in at the Guard Console (`/api/guard/login`) providing `guardId`, `password`, opening cash and system health.
  - A `GuardSession` is created and marked `ACTIVE`. OCR runs live using `tesseract.js` to detect plates.
  - ENTRY: Detected plates trigger `/api/entry` (or `/api/manual-entry` on failure), which creates a `Transaction` and increments occupancy.
  - EXIT: Guard calculates fee (`/api/calculate-fee`) then confirms payment; `/api/exit` or `/api/manual-exit` closes the transaction and decrements occupancy.
  - End shift: Guard posts `/api/guard/end-shift` with `closingCash` → system computes expected cash from completed CASH transactions, computes `cashShortage` and sets session status; critical shortages generate `Alert` records.

- Data Journey (MongoDB):
  - `ParkingLot` documents hold capacity, current occupancy and location.
  - `Transaction` documents record entry/exit times, fee, payment mode, entry/exit methods, manual flags, and link to `guardSessionId` when applicable.
  - `GuardSession` documents summarize shifts: opening/closing cash, expected vs actual collections, transaction counts, revenue breakdown, riskScore and flagged transactions.
  - `Alert` documents are created for tampering, manual overrides, or cash shortages for admin review.

---

## Features

- User App (Mobile)
  - Find nearby parking by current location.
  - Live occupancy percentages and color-coded availability.
  - Navigate to parking via Maps / Google Maps.
  - Offline fallback demo data when API unreachable.

- Guard Console (Web)
  - Live OCR-based ANPR scanning via webcam (`tesseract.js`).
  - Manual entry/exit with reasons (flagged for audit).
  - Payment collection flow (CASH/UPI/FASTAG) and receipt generation.
  - Start/End shift flows with cash reconciliation and automatic alerts for shortages.
  - Scan history and flagged transaction indicators.

---

## Tech Stack

- Frontend (Web): React, react-router, tailwind, Tesseract OCR, axios, react-webcam, recharts
- Mobile: Expo (React Native), `expo-location`, `Linking` for navigation, axios
- Backend: Node.js, Express, Mongoose (MongoDB), dotenv, cors, body-parser
- DevOps / Tunneling: ngrok (dev mobile testing), Vercel (server export-ready), MongoDB Atlas (recommended)

---

## Installation & Setup

1. Clone repository

```bash
git clone <repo-url>
cd MCD_Smart_parking_system
```

2. Backend (API)

- Install dependencies (from repo root):

```bash
npm install
```

- Environment variables: create a `.env` file in the project root with at least:

```
MONGODB_URI=mongodb://localhost:27017/smart-parking
PORT=5000
NODE_ENV=development
```

- Start server locally:

```bash
npm run dev
```

Notes:
- The server exports the Express `app` and supports deployment on Vercel (see `vercel.json`).
- For production use a managed MongoDB (Atlas) and set `MONGODB_URI` accordingly.

3. Web Client (Guard/Admin)

```bash
cd client
npm install
npm start
```

- Optionally set `REACT_APP_API_URL` in `client/.env` to point to deployed backend (defaults to `http://localhost:5000`).

4. Mobile App (Expo)

```bash
cd parking-mobile-app
npm install
expo start
```

- The mobile app currently uses a hard-coded `API_URL` inside `parking-mobile-app/App.js` (an ngrok URL). Update that constant to point at your backend or run ngrok to expose local backend.
- Recommended: open `parking-mobile-app/App.js` and replace `API_URL` with your backend base URL (e.g., `https://your-ngrok.ngrok.io`).

---

## Key API Endpoints (Quick Reference)

| Route | Method | Description |
|---|---:|---|
| `/api/parking-lots` | GET | List parking lots and occupancy |
| `/api/entry` | POST | Log vehicle entry (ANPR/hardware event) |
| `/api/manual-entry` | POST | Guard-triggered manual entry (flagged) |
| `/api/calculate-fee` | POST | Calculate fee for active transaction |
| `/api/exit` | POST | Process vehicle exit (payment) |
| `/api/manual-exit` | POST | Manual exit by guard (flagged + alert) |
| `/api/hardware-event` | POST | Generic hardware event handler (RFID, ANPR feed) |
| `/api/guard/login` | POST | Guard login & start shift (creates GuardSession) |
| `/api/guard/end-shift` | POST | End shift & cash reconciliation |
| `/api/guard/active-session/:guardId` | GET | Get active guard session and realtime stats |
| `/api/scan-history` | GET | Recent transaction/scan history for a lot |
| `/api/admin/guard-sessions` | GET | Admin audit list of guard sessions |

For full route behavior, inspect `server/server.js` for input shape and response structure.

---

## Code Quality & Logic Highlights

- Geospatial Sorting: Distance between user and parking lots in the mobile app is calculated using the Haversine formula (see `parking-mobile-app/App.js` → `calculateDistance`). This reliably sorts by straight-line distance for nearest parking.

- Fee Calculation: Server computes duration (ceil to hours) and multiplies by hourly rate (parking lot hourlyRate or defaults). Key endpoints: `/api/calculate-fee`, `/api/exit`, `/api/manual-exit`.

- Guard Shift Audit & Anti-Corruption Logic:
  - `GuardSession` pre-save hook computes `manualOverrideRate` and `riskScore` based on:
    - manual override rate thresholds (>20%, >40%),
    - cash shortage percentage (>5%),
    - system health failures (camera/printer/internet).
  - On `/api/guard/end-shift`, server computes `systemCashExpected` by summing `fee` of all completed CASH `Transaction`s for the session, compares to reported `closingCash` (adjusted by `openingCash`) and creates a `Alert` for critical shortages (configurable threshold; current code: > Rs.50 triggers CRITICAL alert).
  - Manual entries/exits are flagged and create alerts for admin review.

- Important configuration notes:
  - Set `MONGODB_URI` in `.env` (local or Atlas). Without it the server falls back to `mongodb://localhost:27017/smart-parking`.
  - Mobile app uses a hard-coded `API_URL` (ngrok). Either expose local backend with ngrok and update `API_URL` in `parking-mobile-app/App.js`, or update mobile app to read from env variables.
  - For local web dev, `client/package.json` sets `proxy` to `http://localhost:5000` so web client API calls can be made without configuring CORS during development.
  - `vercel.json` is present and server exports `app`, enabling Vercel deployments. Ensure environment variables are configured in the Vercel dashboard.

---

## Next Recommended Improvements

- Move mobile `API_URL` to a config or env variable and remove hard-coded ngrok URLs.
- Hash guard passwords (currently stored in plaintext in `Guard` model) and add role-based auth tokens (JWT) for guard/admin actions.
- Add server-side rate-limiting and stricter input validation to reduce abuse.
- Add unit/integration tests for critical financial logic (fee calc, cash reconciliation, risk scoring).

---

If you want, I can now:
- generate a compact architecture diagram (Mermaid or PNG)
- update `parking-mobile-app/App.js` to read API base URL from an env or config file
- add sample `.env.example` and secure password hashing for `Guard`

Which of these would you like me to do next?

---

Generated: January 12, 2026
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
