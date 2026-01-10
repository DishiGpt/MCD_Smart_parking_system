# 🎪 Complete System Access Guide

## 🚀 Quick Navigation


After starting all services (Backend, Client, Mobile):

### 🚗 **DRIVER PORTAL** (User Mobile App)
```
Type: React Native (Mobile)
Status: NEW ✨
Location: /mobile folder
Access: Expo Go app on Android/iOS
Command: cd mobile && npm start

Features:
  ✓ View nearby parking lots
  ✓ Sort by distance (using geolocation)
  ✓ See occupancy with color-coded bars
  ✓ Book parking spot
  ✓ Calculate parking fees
  ✓ Mock data fallback
```

### 👀 **GUARD CONSOLE** (ANPR + Manual Override)
```
Type: React Web Component
Status: NEW ✨
Location: client/src/components/GuardConsole.jsx
Access: http://localhost:3000/guard
Navigation: Click "Guard Console" in navbar

Features:
  ✓ Live camera feed
  ✓ Automated ANPR scanning (every 2 seconds)
  ✓ Manual override modal (with flagging)
  ✓ Entry/Exit mode toggle
  ✓ Toast notifications
  ✓ Scan history (last 10)
  ✓ Dark industrial UI
```

### 👨‍💼 **ADMIN DASHBOARD**
```
Type: React Web Component
Status: EXISTING (Ready to enhance)
Location: client/src/components/AdminPortal.js
Access: http://localhost:3000/admin
Navigation: Click "Admin Hub" in navbar

Current Features:
  ✓ View transaction logs
  ✓ Revenue statistics
  ✓ Occupancy rates
  
NEW Available Endpoint:
  GET /api/suspicious-activity
  → Manual override rate per parking lot
  → Flags lots with >5% manual entries
```

---

## 📋 Step-by-Step Startup Guide

### Phase 1: Start Backend (5 minutes)

**Terminal 1 - MongoDB Database:**
```bash
# Windows
mongod

# macOS/Linux
brew services start mongodb-community
```

**Terminal 2 - Node.js Backend Server:**
```bash
cd c:\Users\91858\Desktop\all\ files\MCD_Smart_parking_system\server
npm install  # First time only
npm start

# Expected output:
# ✅ MongoDB Connected Successfully
# 🚀 Server is running on http://localhost:5000
# 📊 API Base URL: http://localhost:5000/api
```

**Verify backend is running:**
```bash
curl http://localhost:5000/api/health

# Response should be:
# {
#   "success": true,
#   "message": "Smart Parking API is running",
#   "timestamp": "2024-01-10T..."
# }
```

### Phase 2: Start Frontend (3 minutes)

**Terminal 3 - React Client (Guard Console + Admin):**
```bash
cd c:\Users\91858\Desktop\all\ files\MCD_Smart_parking_system\client
npm install  # First time only
npm start

# Expected output:
# Compiled successfully!
# On Your Network: http://192.168.x.x:3000
# Local: http://localhost:3000
```

**Browser will open automatically to:**
```
http://localhost:3000
↓
Default route redirects to User Portal
↓
Click "Guard Console" in navbar to access ANPR system
```

### Phase 3 (Optional): Start Mobile App (2 minutes)

**Terminal 4 - React Native:**
```bash
cd c:\Users\91858\Desktop\all\ files\MCD_Smart_parking_system\mobile
npm install  # First time only
npm start

# Expected output:
# Started watching with Expo...
# Expo QR Code displayed in terminal
# Opening in Expo Go
```

**On Your Mobile Device:**
1. Download "Expo Go" app (App Store / Google Play)
2. Scan QR code from terminal
3. App opens on phone

---

## 🧪 Quick Test Procedures

### Test 1: ANPR Scanning (2 minutes)

**Location:** http://localhost:3000/guard

```
1. Navigate to Guard Console
2. Camera permission: ALLOW
3. Click "RESUME" (top-left)
4. Look for green live indicator ●
5. Show ANY vehicle plate to camera
   - Use phone camera to show plate image
   - Or find license plate online image
6. Wait 2 seconds for OCR processing
7. ✅ Should see:
   - Green success toast: "✅ Vehicle ABC1234 Logged"
   - Entry in SCAN HISTORY (right panel)
   - Last Scanned Vehicle display
```

### Test 2: Manual Override (3 minutes)

**Location:** http://localhost:3000/guard

```
1. Click "⚠️ MANUAL ENTRY" button (center-right)
2. Modal appears with form
3. Enter vehicle number: "DL01AB1234"
4. Select reason: "📷 Camera Glitch"
5. Click "✅ LOG ENTRY"
6. ✅ Should see:
   - Orange warning toast
   - Entry in SCAN HISTORY with FLAGGED status
   - Entry recorded in database with flagged=true
```

### Test 3: Check Suspicious Activity (2 minutes)

**Location:** Browser Console (F12 → Console tab)

```javascript
// Fetch the suspicious activity endpoint
fetch('http://localhost:5000/api/suspicious-activity')
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))

// Expected output shows:
{
  "success": true,
  "suspiciousActivity": [
    {
      "parkingLot": "Main Gate Parking",
      "totalEntries": 5,
      "manualEntries": 1,
      "manualRate": 20.0,
      "flagged": true,
      "alertMessage": "⚠️ High Manual Entry Rate at Main Gate Parking (20.0%) - Check for Corruption"
    }
  ]
}
```

### Test 4: Mobile App (5 minutes)

**Location:** Expo Go on Mobile Device

```
1. Scan QR from mobile terminal
2. App opens → HomeScreen loads
3. ✅ Should see:
   - "🅿️ Smart Parking" header
   - Current location (GPS)
   - List of parking lots
   - Color-coded occupancy bars
   
4. Tap any parking lot
5. ✅ Should see:
   - Lot details (address, rate)
   - Full capacity info
   - "📅 Book Now" button
   
6. Click "📅 Book Now"
7. ✅ Modal appears with:
   - Driver Name input
   - Vehicle Number input
   - Duration selector (1-24 hours)
   - Real-time fee calculation
   
8. Fill form and click "✅ Confirm Booking"
9. ✅ Alert: "Booking Confirmed"
   - Vehicle logged in backend
   - Entry created via POST /api/entry
```

### Test 5: Exit Mode (2 minutes)

**Location:** http://localhost:3000/guard

```
1. In Guard Console, click "🚪 EXIT" toggle
   - Right panel button should change to orange
2. Scan a vehicle that has an ACTIVE entry
   - Use same plate you scanned in entry mode
3. ✅ Should see:
   - Prompt: "Collect ₹[FEE] from driver"
   - Duration calculated: "4 hour(s)"
   - Exit time recorded
   - Transaction marked COMPLETED
```

---

## 🔌 Direct API Testing

### Using cURL

**Test 1: ANPR Entry**
```bash
curl -X POST http://localhost:5000/api/entry \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "DL01AB1234",
    "parkingLotName": "Main Gate Parking"
  }'

# Response:
# {
#   "success": true,
#   "message": "✅ Vehicle DL01AB1234 Logged",
#   "transaction": { ... }
# }
```

**Test 2: Manual Entry**
```bash
curl -X POST http://localhost:5000/api/manual-entry \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "DL02CD5678",
    "parkingLotName": "Main Gate Parking",
    "reason": "SERVER_TIMEOUT",
    "guardName": "Guard-XYZ789"
  }'

# Response includes:
# - flagged: true ⚠️
# - Alert created for admin
```

**Test 3: Exit Transaction**
```bash
curl -X POST http://localhost:5000/api/exit \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleNumber": "DL01AB1234"
  }'

# Response shows:
# - Duration: "4 hour(s)"
# - Fee: 200 (₹50 × 4 hours)
```

**Test 4: Get All Parking Lots**
```bash
curl http://localhost:5000/api/parking-lots

# Returns array of lots with:
# - occupancy, capacity, available
# - occupancyRate (0-100%)
# - hourlyRate
# - isFull boolean
```

**Test 5: Suspicious Activity Report**
```bash
curl http://localhost:5000/api/suspicious-activity

# Shows:
# - totalEntries vs manualEntries per lot
# - manualRate percentage
# - flagged status (if >5%)
# - alertMessage for critical lots
```

---

## 📊 Testing Checklist

### Backend (Node.js)
- [x] MongoDB connected
- [x] /api/health endpoint works
- [x] /api/entry creates ANPR transactions
- [x] /api/manual-entry creates flagged transactions
- [x] /api/exit calculates fees
- [x] /api/parking-lots returns lot data
- [x] /api/suspicious-activity shows rates

### Client (React)
- [x] App.js includes Guard Console route
- [x] Navbar shows Guard Console link
- [x] http://localhost:3000 loads
- [x] http://localhost:3000/guard shows console
- [x] react-toastify installed for notifications
- [x] Webcam permission request works

### Guard Console Component
- [x] Live camera feed displays
- [x] Tesseract.js OCR runs every 2 seconds
- [x] Vehicle plates detected via RegEx
- [x] Manual override modal opens
- [x] Toast notifications display
- [x] Scan history shows last 10
- [x] Entry/Exit mode toggle works
- [x] API calls to /api/entry
- [x] API calls to /api/manual-entry

### Mobile App (React Native)
- [x] Expo project initialized
- [x] expo-location installed
- [x] HomeScreen shows lot list
- [x] FlatList with distance sorting
- [x] DetailsScreen with booking modal
- [x] Geolocation permission request
- [x] Navigation between screens
- [x] API calls to /api/parking-lots
- [x] API calls to /api/entry (booking)

---

## 🎯 Access Summary Table

| Component | Type | URL/Location | Features | Status |
|-----------|------|-------------|----------|--------|
| **Mobile App** | React Native | Expo Go | Lot listing, booking, geolocation | ✅ NEW |
| **Guard Console** | React Web | localhost:3000/guard | ANPR, manual override, exit mode | ✅ NEW |
| **Admin Dashboard** | React Web | localhost:3000/admin | Logs, revenue, (suspicious activity ready) | ✅ EXISTING |
| **Backend API** | Node.js | localhost:5000/api | All endpoints | ✅ UPDATED |

---

## ⚡ Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Cannot connect to MongoDB"** | Ensure MongoDB is running: `mongod` |
| **"Cannot GET /guard"** | Check if GuardConsole.jsx is in components folder and imported in App.js |
| **ANPR not detecting plates** | Check lighting, try clear plate image, check tesseract.js console errors |
| **Camera permission denied** | Grant camera access when browser prompts |
| **Mobile app won't start** | Ensure Expo CLI installed: `npm install -g expo-cli` |
| **API 404 errors** | Verify backend running on port 5000 and REACT_APP_API_URL set correctly |
| **Toast notifications not showing** | Check if react-toastify installed in package.json |

---

## 🎓 Learning Resources

- **Guard Console Documentation**: See `THREETIER_ARCHITECTURE.md`
- **Quick Start Guide**: See `THREETIER_QUICKSTART.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **API Endpoints**: See `server/server.js` (lines with `app.post`, `app.get`)

---

**Ready to Test? 🚀 Start from Phase 1 above!**
