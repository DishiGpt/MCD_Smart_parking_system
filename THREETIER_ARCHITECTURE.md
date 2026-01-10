# 🅿️ MCD Smart Parking System - 3-Tier Architecture

A comprehensive smart parking management system with three distinct applications: **Mobile App for Drivers**, **Guard Console for Entry/Exit**, and **Admin Dashboard for Management**.


## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART PARKING SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📱 USER TIER          🚗 CONTRACTOR TIER    👨‍💼 ADMIN TIER   │
│  ──────────────────────────────────────────────────────────  │
│  Mobile App            Guard Console        Admin Dashboard   │
│  (React Native)        (React Web)          (React Web)       │
│  • View Lots           • ANPR Scanning      • View Logs       │
│  • Book Spots          • Manual Override    • Revenue Stats   │
│  • Pay Balance         • Entry/Exit Logic   • Red Flag Alerts │
│                                                               │
│  └────────────────────────────────────────────────────────┘ │
│                        ↓ SHARED API ↓                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Node.js/Express Backend (Port 5000)            │  │
│  │  • Vehicle Entry/Exit Management                       │  │
│  │  • Manual Override Tracking with Flags                 │  │
│  │  • Suspicious Activity Detection (>5% threshold)       │  │
│  │  • Real-time Alerts & Notifications                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ↓                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         MongoDB Database                               │  │
│  │  • Transactions (with entryMethod & flagged flag)      │  │
│  │  • Parking Lots (capacity & occupancy)                 │  │
│  │  • Alerts (manual entries, suspicious activity)        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **Tier 1: User Mobile App (React Native)**

### Purpose
Drivers use this to find parking spots, check availability, and make payments.

### Features
- **Geolocation Integration**: Real-time location tracking via `expo-location`
- **Parking Lot List**: Shows all available lots sorted by distance
- **Capacity Display**: Visual progress bars showing occupancy rates
- **Booking System**: Reserve spots with duration selection
- **Mock Data**: Falls back to demo data if backend is unavailable

### Key Screens

#### HomeScreen.js
```javascript
// Displays list of parking lots
- Fetches from GET /api/parking-lots
- Calculates distance using Haversine formula
- Shows occupancy rates with color-coded status
  • 🟢 Green: <60% occupied
  • 🟠 Orange: 60-80% occupied
  • 🔴 Red: >80% occupied
```

#### DetailsScreen.js
```javascript
// Shows parking lot details & booking
- Displays full capacity info
- Pricing breakdown (hourly, half-day, full-day)
- Booking modal with:
  • Driver name input
  • Vehicle number plate input
  • Duration selection (1-24 hours)
  • Real-time fee calculation
  • Confirmation with POST /api/entry
```

### Getting Started
```bash
cd mobile
npm install
npm start  # Starts Expo CLI

# For Android
npm run android

# For iOS
npm run ios

# For Web
npm run web
```

### Required Permissions
- **Location**: `ACCESS_FINE_LOCATION` for GPS data
- Configure in `app.json` via expo plugins

---

## 🚗 **Tier 2: Guard Console (React Web)**

### Purpose
Contractor/Guard operating the ANPR system at parking entry/exit gates.

### Features
- **Live Camera Feed**: Real-time webcam stream using `react-webcam`
- **Automated ANPR Scanning**: Uses `tesseract.js` for OCR every 2 seconds
- **Manual Override Modal**: For system failures with flagging capability
- **Entry/Exit Toggle**: Switch between "Entry Mode" and "Exit Mode"
- **Scan History**: Last 10 scans with timestamps and methods
- **Toast Notifications**: Visual feedback for every action

### Key Components

#### GuardConsole.jsx
```javascript
// Split-screen interface
LEFT SIDE (Camera Feed):
  - Live webcam (1280x720)
  - Real-time OCR processing
  - Live indicator with pause/resume

RIGHT SIDE (Controls):
  - Last scanned vehicle display
  - Mode toggle (Entry/Exit)
  - Manual Override button
  - Scan history (last 10)
```

### ANPR Logic
```javascript
// Scans every 2 seconds
1. Capture screenshot from webcam
2. Run tesseract.js OCR on image
3. Extract text and match RegEx pattern:
   - Indian plates: "AB01CD1234" or "AB 01 CD 1234"
   - Alphanumeric: flexible matching
4. If match found AND different from last scan:
   - Call POST /api/entry (ANPR method)
   - Show green toast: "✅ Vehicle [Plate] Logged"
   - Add to history with timestamp
5. Avoid duplicate scans within 5 seconds
```

### Manual Override Process
```javascript
// Triggered by guard clicking "⚠️ Manual Entry" button
1. Modal opens with form:
   - Vehicle number input (required)
   - Reason dropdown:
     • 📷 Camera Glitch
     • 🌐 Server Timeout
     • ⚡ System Failure
     • ❓ Other
   - Guard ID (auto-filled)
   - Parking Lot (auto-filled)

2. On submission:
   - POST /api/manual-entry
   - Payload includes:
     {
       vehicleNumber: "ABC1234",
       parkingLotName: "Main Gate",
       reason: "CAMERA_GLITCH",
       guardName: "Guard-ABC123"
     }

3. Database records:
   {
     entryMethod: "MANUAL_OVERRIDE",
     isManualEntry: true,
     manualOverrideReason: "CAMERA_GLITCH",
     manualEntryBy: "Guard-ABC123",
     flagged: true  // ⚠️ Critical flag for admin
   }

4. Alert created for admin review
5. Toast shows warning: "⚠️ Manual Entry: ABC1234 Logged"
```

### Exit Mode
```javascript
// Toggle to Exit Mode:
1. Guard clicks "🚪 EXIT" button
2. ANPR scans vehicle plate
3. System calculates parking duration
4. Fee computed: (hoursParked × hourlyRate)
5. Display: "Collect ₹50 from driver"
6. POST /api/exit completes transaction
```

### Styling
- **Dark Industrial Theme**: Gray-900 background
- **Large Buttons**: 4rem height for touch interfaces
- **Green Accents**: Success states
- **Red Accents**: Warnings & manual overrides
- **Tailwind CSS**: Full responsive design

---

## 👨‍💼 **Tier 3: Admin Dashboard (React Web)**

### Purpose
MCD administrators monitor system health, revenue, and suspicious activity.

### Features
- **Suspicious Activity Monitor**: Tracks manual override rates
- **Red Flag Alerts**: Highlights contractors with >5% manual entries
- **Transaction Logs**: Real-time entry/exit records
- **Revenue Dashboard**: Total fees collected
- **Alert Resolution**: Mark issues as resolved

### Suspicious Activity Detection

```javascript
// Endpoint: GET /api/suspicious-activity

// For each parking lot:
1. Count total entries (ACTIVE + COMPLETED)
2. Count manual entries (isManualEntry = true)
3. Calculate manual rate = (manual / total) × 100
4. If rate > 5%:
   - Flag = true
   - Alert message: "High Manual Entry Rate at [Lot] ([Rate]%) - Check for Corruption"

// Example Output:
{
  suspiciousActivity: [
    {
      parkingLot: "Main Gate Parking",
      totalEntries: 150,
      manualEntries: 12,
      manualRate: 8.0,
      flagged: true,
      alertMessage: "⚠️ High Manual Entry Rate at Main Gate Parking (8.0%) - Check for Corruption"
    },
    {
      parkingLot: "Central Hub Lot",
      totalEntries: 200,
      manualEntries: 4,
      manualRate: 2.0,
      flagged: false,
      alertMessage: null
    }
  ]
}
```

---

## 🔌 **API Endpoints**

### Entry Management
```
POST /api/entry
- Body: { vehicleNumber, parkingLotName }
- Method: ANPR (automatic)
- Response: Transaction with entryMethod="ANPR"

POST /api/manual-entry
- Body: { vehicleNumber, parkingLotName, reason, guardName }
- Method: MANUAL_OVERRIDE (flagged)
- Creates Alert for admin review
- Response: Transaction with flagged=true

POST /api/exit
- Body: { vehicleNumber }
- Calculates fee based on duration
- Marks transaction as COMPLETED
```

### Data Retrieval
```
GET /api/parking-lots
- Returns: Array of parking lots with occupancy info
- Used by: Mobile app for lot selection

GET /api/transactions
- Returns: Latest 100 transactions with stats
- Used by: Admin dashboard

GET /api/alerts
- Returns: All system alerts (manual entries, tamper detections)
- Used by: Admin dashboard

GET /api/suspicious-activity
- Returns: Manual override rate per parking lot
- Used by: Admin dashboard for red flag detection
```

---

## 📊 **Database Schema Updates**

### Transaction Model
```javascript
{
  vehicleNumber: String,
  entryTime: Date,
  exitTime: Date,
  fee: Number,
  status: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
  parkingLot: String,
  
  // NEW FIELDS FOR 3-TIER SYSTEM:
  entryMethod: ['ANPR', 'MANUAL_OVERRIDE', 'RFID'],
  isManualEntry: Boolean,
  manualOverrideReason: ['CAMERA_GLITCH', 'SERVER_TIMEOUT', 'SYSTEM_FAILURE', 'OTHER'],
  manualEntryBy: String,  // Guard name
  flagged: Boolean        // ⚠️ For admin to identify suspicious entries
}
```

---

## 🛠️ **Installation & Setup**

### Prerequisites
- **Node.js** v14+ and **npm**
- **MongoDB** (local or Atlas)
- **Expo CLI** for mobile development
- **Tesseract.js** for ANPR (loads via CDN)

### Backend Setup
```bash
cd server
npm install
echo "MONGODB_URI=mongodb://localhost:27017/smart-parking" > ../.env
echo "PORT=5000" >> ../.env
npm start  # Runs on http://localhost:5000
```

### Client (Guard Console + Admin) Setup
```bash
cd client
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
npm start  # Runs on http://localhost:3000
```

### Mobile App Setup
```bash
cd mobile
npm install
npm start  # Starts Expo CLI for Android/iOS
```

---

## 🔐 **Security Considerations**

1. **Manual Override Auditing**
   - All manual entries logged with guard ID & timestamp
   - Flagged in database for investigation
   - Admin alerts for suspicious rates

2. **Data Integrity**
   - Transaction records immutable after creation
   - Alert history maintained for compliance
   - Guard identity tracked for accountability

3. **Rate Limiting** (Recommended)
   - Limit manual overrides per guard per day
   - Alert if single guard exceeds threshold

---

## 📱 **Testing with Mock Data**

### Mobile App
- If backend unavailable, loads mock parking lots
- Default location: New Delhi (28.6139, 77.2090)
- Sample lots with varying occupancy rates

### Guard Console
- Tesseract.js runs in browser (no server dependency)
- Can test manual override without live camera
- History persists in component state

### Admin Dashboard
- `/api/suspicious-activity` calculates in real-time
- Works with any transaction data in MongoDB

---

## 🚀 **Deployment**

### Backend (Node.js)
- Deploy to Heroku, AWS EC2, or DigitalOcean
- Set `NODE_ENV=production`
- Update `MONGODB_URI` to cloud database

### Client (React)
- Build: `npm run build`
- Deploy to Vercel, Netlify, or AWS S3 + CloudFront
- Set `REACT_APP_API_URL` to backend endpoint

### Mobile (React Native)
- Build APK: `eas build --platform android`
- Build IPA: `eas build --platform ios`
- Publish to Google Play & App Store via Expo

---

## 📞 **Support & Maintenance**

### Common Issues

**Q: ANPR not detecting plates**
- A: Ensure good lighting, clear plate visibility
- Check tesseract.js loading (browser console)
- Test with RegEx pattern directly in console

**Q: Manual override not flagging**
- A: Verify `isManualEntry: true` in database
- Check transaction creation timestamp
- Run `/api/suspicious-activity` endpoint

**Q: Mobile app location not working**
- A: Check location permissions in `app.json`
- Verify GPS enabled on device
- Falls back to New Delhi default location

---

## 📝 **License**
MCD Smart Parking System © 2024. All rights reserved.

---

**Last Updated**: January 2026
**Version**: 3.0 (3-Tier Architecture)
