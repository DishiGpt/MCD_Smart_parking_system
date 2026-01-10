# ⚡ 3-Tier Architecture - Quick Start Guide

## 🎯 What You Just Got

A complete **Smart Parking System** with 3 separate applications:

| App | Purpose | Technology | Access |
|-----|---------|-----------|--------|
| **Mobile App** | 📱 Drivers find & book spots | React Native (Expo) | `npm start` in `/mobile` |
| **Guard Console** | 🚗 ANPR scanning & manual override | React Web + Tesseract.js | `http://localhost:3000/guard` |
| **Admin Dashboard** | 👨‍💼 Monitor logs & red flags | React Web | `http://localhost:3000/admin` |

---

## 📦 Installation (3 Steps)

### Step 1: Start MongoDB
```bash
# If using local MongoDB
mongod

# If using MongoDB Atlas, update .env with your URI
```

### Step 2: Start Backend Server
```bash
cd server
npm install
npm start
# ✅ Server running on http://localhost:5000
# ✅ API ready at http://localhost:5000/api
```

### Step 3: Start Frontend (Guard Console + Admin)
```bash
cd client
npm install
npm start
# ✅ Client running on http://localhost:3000
# ✅ Access Guard Console at http://localhost:3000
```

### Step 4 (Optional): Start Mobile App
```bash
cd mobile
npm install
npm start
# Use Expo Go app to scan QR code
# Or run: npm run android / npm run ios
```

---

## 🎮 Testing the System

### Test 1: Guard Console ANPR Scan
```
1. Go to http://localhost:3000/
2. Click "Guard Console" or direct to /guard
3. Allow camera access
4. Click "RESUME" to start scanning
5. Show any vehicle number plate to camera
6. ✅ Should detect and log entry automatically
7. Check "SCAN HISTORY" on right panel
```

### Test 2: Manual Override
```
1. In Guard Console, click "⚠️ MANUAL ENTRY"
2. Enter vehicle number: "DL01AB1234"
3. Select reason: "Camera Glitch"
4. Click "LOG ENTRY"
5. ✅ Entry flagged in database
6. ⚠️ Alert appears for admin
7. Check database: transaction has flagged=true
```

### Test 3: Exit Mode
```
1. In Guard Console, click "🚪 EXIT"
2. Scan a vehicle plate (that has entry logged)
3. ✅ Shows: "Collect ₹50 from driver"
4. ✅ Transaction marked as COMPLETED
5. ✅ Fee calculated in response
```

### Test 4: Mobile App
```
1. cd mobile && npm start
2. Scan QR code with Expo Go app
3. ✅ Lists all parking lots sorted by distance
4. Tap any lot → View details
5. Tap "Book Now" → Fill form → Confirm
6. ✅ Entry logged via POST /api/entry
```

### Test 5: Admin Suspicious Activity
```
1. Open browser console (F12)
2. Fetch data:
   fetch('http://localhost:5000/api/suspicious-activity')
     .then(r => r.json())
     .then(d => console.log(d))

3. ✅ Shows manual entry rate for each lot
4. If >5%: flagged=true with alert message
5. Example:
   {
     parkingLot: "Main Gate",
     totalEntries: 100,
     manualEntries: 7,
     manualRate: 7.0,
     flagged: true,
     alertMessage: "⚠️ High Manual Entry Rate at Main Gate (7.0%) - Check for Corruption"
   }
```

---

## 🔑 Key Endpoints to Test

### Create Entry (ANPR)
```bash
curl -X POST http://localhost:5000/api/entry \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "DL01AB1234",
    "parkingLotName": "Main Gate Parking"
  }'
```

### Create Manual Entry (Flagged)
```bash
curl -X POST http://localhost:5000/api/manual-entry \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "DL01AB1234",
    "parkingLotName": "Main Gate Parking",
    "reason": "CAMERA_GLITCH",
    "guardName": "Guard-ABC123"
  }'
```

### Check Suspicious Activity
```bash
curl http://localhost:5000/api/suspicious-activity
```

### Get All Parking Lots
```bash
curl http://localhost:5000/api/parking-lots
```

---

## 📂 Project Structure

```
MCD_Smart_parking_system/
├── server/                    # Backend (Node.js + Express)
│   ├── server.js             # Main API server
│   ├── models/
│   │   ├── Transaction.js    # ✨ Updated with flagged field
│   │   ├── ParkingLot.js
│   │   └── Alert.js
│   └── package.json
│
├── client/                    # Frontend (React Web)
│   ├── src/
│   │   ├── components/
│   │   │   ├── GuardConsole.jsx  # ✨ NEW - ANPR + Manual Override
│   │   │   ├── AdminPortal.js    # Updated for suspicious activity
│   │   │   └── ...
│   │   └── App.js
│   └── package.json
│
├── mobile/                    # ✨ NEW - React Native (Expo)
│   ├── App.js                # Navigation setup
│   ├── src/
│   │   ├── screens/
│   │   │   ├── HomeScreen.js     # Lot list + geolocation
│   │   │   └── DetailsScreen.js  # Lot details + booking
│   │   └── components/
│   ├── app.json              # Expo config
│   ├── package.json
│   └── tailwind.config.js
│
├── .env                       # Environment variables
├── THREETIER_ARCHITECTURE.md  # ✨ NEW - Full documentation
└── package.json               # Root package.json
```

---

## 🎯 Real-World Workflow

### Day in the Life of Guard
```
08:00 AM - Guard logs in to Guard Console
         - Camera starts capturing vehicle plates
         - System auto-scans every 2 seconds

08:05 AM - Vehicle approaches gate
         - ANPR detects "DL01AB1234"
         - Green toast: "✅ Vehicle DL01AB1234 Logged"
         - Entry recorded in database
         - Guard sees in SCAN HISTORY

11:00 AM - Camera malfunctions during heavy traffic
         - Guard clicks "⚠️ MANUAL ENTRY"
         - Types "DL02CD5678"
         - Selects reason: "Camera Glitch"
         - Clicks "LOG ENTRY"
         - ⚠️ Entry flagged for admin review
         - Orange warning toast displays

04:00 PM - Vehicle owner exits
         - Guard switches to "EXIT" mode
         - Scans same vehicle
         - System calculates: 8 hours × ₹50 = ₹400
         - Prompt: "Collect ₹400 from driver"
         - Exit logged, fee recorded

06:00 PM - Guard shift ends
         - Console shows scan history
         - 142 ANPR entries, 3 manual overrides
```

### Day in the Life of Admin
```
09:00 AM - MCD Admin logs into Admin Dashboard
         - Views revenue: "₹45,000 today"
         - Checks "Suspicious Activity"
         - Sees alert: 
           "⚠️ High Manual Entry Rate at Main Gate (7.2%) - Check for Corruption"

10:00 AM - Investigates Main Gate Parking
         - Filters transactions with isManualEntry=true
         - Sees 7 manual entries out of 97 total
         - Checks guards responsible
         - Notes timeframe: 8-10 AM (peak traffic)
         - Probable cause: High traffic volume

11:00 AM - Opens Guard Console logs
         - Confirms camera glitch reported at 9:15 AM
         - Verifies reason: "CAMERA_GLITCH"
         - All manual entries legitimate
         - Marks alert as "RESOLVED"

02:00 PM - Reviews transaction summary
         - Total fees collected: ₹1.2L
         - Occupancy peak: 73% at 12 PM
         - No security concerns
         - Archives logs
```

### Day in the Life of Driver
```
10:00 AM - Opens Smart Parking App
         - App detects location: New Delhi
         - Fetches nearby parking lots
         - Sees "Main Gate Parking - 2.5 km"
         - Occupancy: 45% (green bar)
         - Available: 55 spots

10:05 AM - Taps on "Main Gate Parking"
         - Views details: Address, hourly rate (₹50)
         - "Book Now" → Enters vehicle number
         - Selects 4 hours parking
         - Fee: ₹200
         - Confirms booking

10:10 AM - Arrives at parking
         - Guard scans vehicle
         - "✅ Vehicle DL03XY9876 Logged"
         - App shows: "Parked for 3h 50m | ₹175 collected"

02:05 PM - Ready to leave
         - Vehicle exits
         - Guard scans again
         - "Collect ₹200 from driver"
         - Guard processes payment
         - Receipt generated
         - App updates: "Exit Successful"
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Cannot GET /guard"** | Guard Console is not integrated into App.js routes yet. Check client/src/App.js |
| **ANPR not detecting plates** | Check lighting, ensure plate is visible in camera. Tesseract needs clear image. |
| **Manual entry not flagging** | Verify POST /api/manual-entry is called. Check database for `flagged: true` field. |
| **Mobile location permission denied** | Check app.json for expo-location plugin config. |
| **"API not reachable" error** | Ensure server is running on port 5000. Check REACT_APP_API_URL in client/.env |

---

## 📊 Database Queries

### See all manual entries
```javascript
db.transactions.find({ isManualEntry: true })
```

### Count flagged entries per lot
```javascript
db.transactions.aggregate([
  { $match: { flagged: true } },
  { $group: { _id: "$parkingLot", count: { $sum: 1 } } }
])
```

### Calculate guard performance
```javascript
db.transactions.aggregate([
  { $match: { isManualEntry: true } },
  { $group: { _id: "$manualEntryBy", count: { $sum: 1 } } }
])
```

---

## 🚀 Next Steps

1. **Integrate Guard Console Route**
   - Update client/src/App.js to route `/guard` to GuardConsole.jsx

2. **Update Admin Dashboard**
   - Add suspicious activity filter to AdminPortal.js
   - Display flagged transactions with red highlighting

3. **Add Real Camera Support**
   - Currently uses generic webcam
   - Add camera selection dropdown for multiple gates

4. **Implement Payment Gateway**
   - Integrate Razorpay or Stripe for mobile app
   - Collect fees electronically

5. **Push Notifications**
   - Alert guards via mobile when manual override rate spikes
   - Notify drivers of exits and billing

---

## ✅ Checklist

- [x] Backend API with manual entry endpoint
- [x] Guard Console with ANPR scanning
- [x] Guard Console with manual override modal
- [x] Suspicious activity detection (>5% threshold)
- [x] Mobile app with geolocation
- [x] Mobile app parking lot listing
- [x] Database schema updated with flagged field
- [ ] Guard Console integrated into client routes
- [ ] Admin dashboard suspicious activity UI
- [ ] Real camera selection for multiple gates
- [ ] Payment gateway integration
- [ ] Push notifications
- [ ] Deployment to production

---

**Happy Parking! 🅿️**
