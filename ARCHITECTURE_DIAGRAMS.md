# 📐 System Architecture Diagrams

## 1️⃣ Three-Tier Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│                     ⭐ SMART PARKING SYSTEM (3-TIER)                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────────┐
                            │   PRESENTATION      │
                            │      LAYER          │
                            └─────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
        ┌───────────────────┐  ┌──────────────┐  ┌────────────────┐
        │   MOBILE APP      │  │  GUARD       │  │  ADMIN         │
        │   (React Native)  │  │  CONSOLE     │  │  DASHBOARD     │
        │                   │  │  (React Web) │  │  (React Web)   │
        │  • Lot Listing    │  │              │  │                │
        │  • Geolocation    │  │ • ANPR       │  │ • Logs         │
        │  • Booking        │  │ • Manual     │  │ • Revenue      │
        │  • Payments       │  │   Override   │  │ • Red Flags    │
        │                   │  │ • Entry/Exit │  │ • Suspicious   │
        │  PORT: Expo Go    │  │ • Scan Hist  │  │   Activity     │
        │                   │  │              │  │                │
        │  3000+ km users   │  │  PORT: 3000  │  │ PORT: 3000     │
        │  (distributed)    │  │              │  │                │
        └───────────────────┘  │  1-2 guards  │  │ 5-10 admins    │
                               │  per gate    │  │                │
                               └──────────────┘  └────────────────┘
                                    │               │
                                    └───────────────┘
                                            │
                            ┌───────────────────────────┐
                            │      API LAYER            │
                            │   Node.js/Express         │
                            │   (Port 5000)             │
                            │                           │
                            │  ✓ POST /api/entry       │
                            │  ✓ POST /api/manual-     │
                            │        entry             │
                            │  ✓ POST /api/exit        │
                            │  ✓ GET /api/parking-lots │
                            │  ✓ GET /api/suspicious-  │
                            │        activity          │
                            │  ✓ GET /api/alerts       │
                            │  ✓ GET /api/transactions │
                            └───────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
            ┌────────────┐   ┌────────────┐   ┌──────────┐
            │ MongoDB    │   │   File     │   │ Analytics│
            │ Database   │   │   Storage  │   │ Engine   │
            │            │   │            │   │          │
            │ • Trans.   │   │ • Logs     │   │ • Stats  │
            │ • Lots     │   │ • Images   │   │ • Rates  │
            │ • Alerts   │   │            │   │          │
            └────────────┘   └────────────┘   └──────────┘
```

---

## 2️⃣ Data Flow Diagram

### A. ANPR Entry Flow (Automated)

```
  Guard Console
  (localhost:3000/guard)
         │
         │ 1. Webcam captures frame
         │
         ▼
  ┌──────────────────┐
  │  Tesseract.js    │  2. OCR processing
  │  (Browser)       │     (every 2 seconds)
  └──────────────────┘
         │
         │ 3. Extract plate number
         │    RegEx: /[A-Z]{2}\d{1,2}[A-Z]{1,2}\d{4}/
         │
         ▼
  ┌──────────────────────────────┐
  │ Validate plate format        │
  │ Compare with last scan       │
  │ (5-second cooldown)          │
  └──────────────────────────────┘
         │
         │ 4. New plate detected
         │
         ▼
  ┌──────────────────────────────┐
  │ POST /api/entry              │
  │ {                            │
  │   vehicleNumber: "DL01AB1234"│
  │   parkingLotName: "Main Gate"│
  │ }                            │
  └──────────────────────────────┘
         │
         │ (HTTP Request)
         │
         ▼
  ┌──────────────────────────────┐
  │  Backend API Server          │  5. Process entry
  │  (localhost:5000)            │
  │                              │
  │  ✓ Check lot capacity        │
  │  ✓ Check duplicate vehicle   │
  │  ✓ Create transaction        │
  │  ✓ Update occupancy          │
  └──────────────────────────────┘
         │
         │ 6. Save to MongoDB
         │    {
         │      vehicleNumber: "DL01AB1234",
         │      entryMethod: "ANPR",      ← ⭐ Method tracked
         │      isManualEntry: false,     ← ⭐ Automatic
         │      flagged: false,           ← ⭐ Clean entry
         │      entryTime: "2024-01-10T10:30:00Z"
         │    }
         │
         ▼
  ┌──────────────────────────────┐
  │  Guard Console UI            │  7. Visual feedback
  │                              │
  │  ✅ Green Toast:             │
  │  "Vehicle DL01AB1234 Logged" │
  │                              │
  │  📋 Scan History Updated     │
  │  🎬 Last Scanned Display     │
  └──────────────────────────────┘
```

### B. Manual Override Flow (Flagged Entry)

```
  Guard Console
  (Manual Entry Modal)
         │
         │ 1. Guard clicks "⚠️ MANUAL ENTRY"
         │
         ▼
  ┌──────────────────────────────┐
  │  Form Modal Opens            │
  │                              │
  │  [Vehicle Number]            │
  │  [Reason Dropdown]           │
  │  ┌ 📷 Camera Glitch         │
  │  ├ 🌐 Server Timeout        │
  │  ├ ⚡ System Failure         │
  │  └ ❓ Other                 │
  │  [Guard ID - Auto-filled]   │
  │  [Parking Lot - Auto]        │
  └──────────────────────────────┘
         │
         │ 2. Guard fills form
         │
         ▼
  ┌──────────────────────────────┐
  │  Validation                  │
  │  ✓ Vehicle number not empty  │
  │  ✓ Reason selected           │
  │  ✓ All info complete         │
  └──────────────────────────────┘
         │
         │ 3. Guard submits
         │
         ▼
  ┌──────────────────────────────┐
  │  POST /api/manual-entry      │  ⚠️ SPECIAL ENDPOINT
  │  {                           │
  │    vehicleNumber: "ABC1234", │
  │    reason: "CAMERA_GLITCH",  │
  │    guardName: "Guard-XYZ",   │
  │    parkingLotName: "Main Gt" │
  │  }                           │
  └──────────────────────────────┘
         │
         │ (HTTP Request)
         │
         ▼
  ┌────────────────────────────────────┐
  │  Backend API Processing            │
  │                                    │
  │  1. Create Transaction with:      │
  │     - entryMethod: "MANUAL_OVERRIDE"  ⭐
  │     - isManualEntry: true         ⭐
  │     - flagged: true               ⭐ CRITICAL
  │     - manualOverrideReason: "..."    ⭐
  │     - manualEntryBy: "Guard-XYZ" ⭐
  │                                    │
  │  2. Create Alert:                 │
  │     - type: "MANUAL_ENTRY"           ⭐
  │     - severity: "MEDIUM"             ⭐
  │     - for admin review               ⭐
  │                                    │
  │  3. Update Occupancy              │
  └────────────────────────────────────┘
         │
         │ 4. Save to MongoDB
         │    Transaction Document ⚠️ FLAGGED
         │    Alert Document       ⚠️ NEW
         │
         ▼
  ┌──────────────────────────────┐
  │  Guard Console UI            │
  │                              │
  │  ⚠️  Orange Toast:           │
  │  "Manual Entry: ABC1234 Logged│
  │  (CAMERA_GLITCH)"            │
  │                              │
  │  📋 Scan History:            │
  │  ABC1234 | FLAGGED 🚩        │
  │  13:45   | Manual Override   │
  └──────────────────────────────┘
         │
         │ 5. Admin notified
         │
         ▼
  ┌──────────────────────────────┐
  │  Admin Dashboard             │
  │  /api/suspicious-activity    │
  │                              │
  │  "⚠️ High Manual Entry Rate  │
  │  at Main Gate (7.0%)"        │
  │                              │
  │  [View Flagged Entries]      │
  │  [Investigate Guard]         │
  └──────────────────────────────┘
```

### C. Exit Transaction Flow

```
  Guard Console (EXIT Mode)
         │
         │ 1. Click "🚪 EXIT" toggle
         │
         ▼
  [Camera in EXIT Mode]
         │
         │ 2. Scan vehicle plate
         │    (same ANPR process)
         │
         ▼
  ┌──────────────────────────────┐
  │ POST /api/exit               │
  │ {                            │
  │   vehicleNumber: "DL01AB1234"│
  │ }                            │
  └──────────────────────────────┘
         │
         │ 3. Backend calculates:
         │
         ▼
  ┌────────────────────────────────────┐
  │  Find ACTIVE transaction           │
  │  Calculate duration:               │
  │    exitTime - entryTime            │
  │                                    │
  │  Entry:  10:30 AM                 │
  │  Exit:   02:30 PM                 │
  │  Duration: 4 hours                │
  │                                    │
  │  Fee = hourlyRate × hours         │
  │      = ₹50 × 4                    │
  │      = ₹200                       │
  │                                    │
  │  Update transaction:              │
  │  - status: "COMPLETED"            │
  │  - exitTime: "2024-01-10T14:30"   │
  │  - fee: 200                       │
  └────────────────────────────────────┘
         │
         │ 4. Update Occupancy
         │    occupancy -= 1
         │
         ▼
  ┌──────────────────────────────┐
  │  Guard Console UI            │
  │                              │
  │  Prompt: "Collect ₹200 from  │
  │  driver for 4 hour(s)"       │
  │                              │
  │  Duration: 4 hour(s)         │
  │  Fee: ₹200                   │
  └──────────────────────────────┘
         │
         │ 5. Guard collects payment
         │    (or manual processing)
         │
         ▼
  ✅ Transaction COMPLETED
     Entry logged: 10:30 AM
     Exit logged:  02:30 PM
     Fee collected: ₹200
```

---

## 3️⃣ Database Schema with New Fields

```
┌─────────────────────────────────────────────────────────┐
│                   TRANSACTIONS                          │
├─────────────────────────────────────────────────────────┤
│ _id: ObjectId                                           │
│ vehicleNumber: String              ["DL01AB1234"]      │
│ parkingLot: String                 ["Main Gate"]        │
│ entryTime: Date                    [2024-01-10T10:30]  │
│ exitTime: Date (nullable)          [2024-01-10T14:30]  │
│ fee: Number                        [200]               │
│ status: String                     ["ACTIVE"|"COMPLETED"]
│                                                         │
│ ⭐ NEW FIELDS FOR 3-TIER SYSTEM:                       │
│ ──────────────────────────────────────────────────────│
│ entryMethod: String           ["ANPR" | "MANUAL_OVERRIDE" | "RFID"]
│ isManualEntry: Boolean        [false | true]         │
│ manualOverrideReason: String  ["CAMERA_GLITCH" |    │
│                                "SERVER_TIMEOUT" |    │
│                                "SYSTEM_FAILURE"]     │
│ manualEntryBy: String         ["Guard-ABC123"]       │
│ flagged: Boolean              [false | true]         │
│                                                         │
│ createdAt: Date (auto)        [2024-01-10T10:30]      │
│ updatedAt: Date (auto)        [2024-01-10T14:30]      │
└─────────────────────────────────────────────────────────┘

Example Document:
────────────────────────────────────────────────────────────
ANPR Entry (Normal):
{
  _id: ObjectId(...),
  vehicleNumber: "DL01AB1234",
  parkingLot: "Main Gate Parking",
  entryTime: 2024-01-10T10:30:00Z,
  exitTime: null,
  fee: 0,
  status: "ACTIVE",
  entryMethod: "ANPR",           ✅ Automated
  isManualEntry: false,          ✅ Not manual
  manualOverrideReason: null,    ✅ No reason
  manualEntryBy: null,           ✅ No guard
  flagged: false                 ✅ Clean entry
}

────────────────────────────────────────────────────────────
Manual Entry (Flagged):
{
  _id: ObjectId(...),
  vehicleNumber: "DL02CD5678",
  parkingLot: "Main Gate Parking",
  entryTime: 2024-01-10T11:45:00Z,
  exitTime: null,
  fee: 0,
  status: "ACTIVE",
  entryMethod: "MANUAL_OVERRIDE",  ⚠️ Manual
  isManualEntry: true,             ⚠️ Flagged
  manualOverrideReason: "CAMERA_GLITCH",  ⚠️ Reason
  manualEntryBy: "Guard-XYZ789",   ⚠️ Guard ID
  flagged: true                    🚩 CRITICAL FLAG
}

────────────────────────────────────────────────────────────
Completed Exit:
{
  _id: ObjectId(...),
  vehicleNumber: "DL01AB1234",
  parkingLot: "Main Gate Parking",
  entryTime: 2024-01-10T10:30:00Z,
  exitTime: 2024-01-10T14:30:00Z,  ✅ Exit recorded
  fee: 200,                        ✅ Fee calculated
  status: "COMPLETED",             ✅ Complete
  entryMethod: "ANPR",
  isManualEntry: false,
  manualOverrideReason: null,
  manualEntryBy: null,
  flagged: false
}
```

---

## 4️⃣ Suspicious Activity Detection Logic

```
┌──────────────────────────────────────────────────────────┐
│         ADMIN SUSPICIOUS ACTIVITY REPORT                 │
│     GET /api/suspicious-activity                         │
└──────────────────────────────────────────────────────────┘

For each Parking Lot:

Step 1: Count Transactions
─────────────────────────────
  DB Query:
    totalEntries = Transaction.count({
      parkingLot: "Main Gate",
      status: { $in: ["ACTIVE", "COMPLETED"] }
    })

Step 2: Count Manual Entries
─────────────────────────────
  DB Query:
    manualEntries = Transaction.count({
      parkingLot: "Main Gate",
      isManualEntry: true,
      status: { $in: ["ACTIVE", "COMPLETED"] }
    })

Step 3: Calculate Rate
─────────────────────────────
  manualRate = (manualEntries / totalEntries) × 100
  
  Example:
    totalEntries: 100
    manualEntries: 7
    manualRate: 7.0%

Step 4: Flag Decision
─────────────────────────────
  if (manualRate > 5.0):
    flagged = true
    severity = "CRITICAL"
    alert = "⚠️ High Manual Entry Rate at [Lot] ([Rate]%) - Check for Corruption"
  else:
    flagged = false
    alert = null

Step 5: Response to Admin
─────────────────────────────
  {
    parkingLot: "Main Gate Parking",
    totalEntries: 100,
    manualEntries: 7,
    manualRate: 7.0,
    flagged: true,
    alertMessage: "⚠️ High Manual Entry Rate at Main Gate Parking (7.0%) - Check for Corruption"
  }

Step 6: Admin Actions
─────────────────────────────
  1. Click on flagged lot
  2. View all manual entries for that lot:
     - Guard name
     - Time of entry
     - Reason given
     - Timestamp
  3. Investigate:
     - Was there a legitimate system issue?
     - Was camera actually broken at that time?
     - Multiple guards or one specific guard?
  4. Determine action:
     - ✅ Legitimate (mark as resolved)
     - ⚠️ Suspicious (investigate further)
     - 🚨 Fraudulent (escalate to management)
```

---

## 5️⃣ Component Interaction Diagram

```
                    MOBILE APP (React Native)
                    ├─ HomeScreen
                    │  └─ Geolocation + Lot List
                    └─ DetailsScreen
                       └─ Booking Modal
                              │
                              │ API: POST /api/entry
                              │ API: GET /api/parking-lots
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    GUARD CONSOLE         ADMIN DASHBOARD      BACKEND API
    (React Web)           (React Web)         (Node.js/Express)
         │                    │                    │
    Guards Operation      MCD Admin           Data Processing
         │                    │                    │
    ┌────────────────┐  ┌─────────────┐      ┌──────────────┐
    │ GuardConsole   │  │AdminPortal  │      │ Server.js    │
    │ Component      │  │ Component   │      │              │
    │                │  │             │      │ POST /entry  │
    │ • Webcam       │  │ • Logs      │      │ POST /manual │
    │ • Tesseract    │  │ • Revenue   │      │ POST /exit   │
    │ • Manual Form  │  │ • Alerts    │      │ GET /parking │
    │                │  │ • Reports   │      │ GET /suspicious
    └────────────────┘  └─────────────┘      └──────────────┘
         │                    │                    │
         │ API Calls      API Calls          Database
         │ POST /entry    GET /suspicious    MongoDB
         │ POST /manual   GET /alerts        │
         │ POST /exit     GET /transactions  │
         │ GET /parking                      │
         │                                   │
         └───────────────┬─────────────────┘
                         │
                    (Same Backend)
```

---

## 6️⃣ Security & Audit Trail

```
┌────────────────────────────────────────────────────────┐
│              AUDIT & SECURITY TRACKING                  │
└────────────────────────────────────────────────────────┘

ANPR Entry (Trusted):
  ✅ Automatic OCR detection
  ✅ No guard involved
  ✅ Regular entry flow
  ✅ flagged = false
  ✅ No alerts generated
  
  Log: "ANPR scan detected plate DL01AB1234 at 10:30 AM"

────────────────────────────────────────────────────────

Manual Override (Tracked):
  ⚠️  Guard decision required
  ⚠️  System failure condition
  ⚠️  Entry flagged for review
  ⚠️  flagged = true
  ⚠️  Alert generated
  ⚠️  Guard ID recorded
  
  Log: "Guard-XYZ789 manually entered DL02CD5678 at 11:45 AM
        Reason: CAMERA_GLITCH"

────────────────────────────────────────────────────────

Admin Investigation:
  📊 Manual Rate = 7.0% for Main Gate
  ⚠️  Exceeds 5% threshold
  🚩 Flag triggered
  
  Admin sees:
    - All 7 manual entries
    - Guard names
    - Specific reasons
    - Timestamps
    - Parking lot conditions at that time
  
  Admin decision:
    ✅ Legitimate (system was down) → Resolve alert
    ❌ Suspicious (no system failure) → Escalate
    🚨 Fraud (pattern detected) → Report to management

────────────────────────────────────────────────────────

Compliance:
  ✓ All transactions logged with method
  ✓ Manual overrides require justification
  ✓ Guard actions auditable
  ✓ Unusual patterns detected automatically
  ✓ Admin alerts for review
  ✓ Full audit trail maintained
```

---

## 7️⃣ Performance & Scalability

```
┌─────────────────────────────────────────────────────┐
│         ESTIMATED SYSTEM CAPACITY                   │
└─────────────────────────────────────────────────────┘

Mobile App (Drivers):
  ├─ Concurrent users: 10,000+
  ├─ Requests per minute: ~500
  └─ Database queries: GET /api/parking-lots

Guard Console (Gate Operations):
  ├─ Concurrent guards: 50-100
  ├─ Requests per minute: ~200 (with ANPR + manual)
  ├─ Camera feeds: 5 Mbps each
  └─ Database writes: 3-4 per minute per guard

Admin Dashboard (MCD Staff):
  ├─ Concurrent admins: 10-20
  ├─ Requests per minute: ~50
  └─ Heavy aggregation queries

Backend API Capacity:
  ├─ Node.js instances: 4
  ├─ MongoDB sharding: By parkingLot + date
  ├─ Request rate: 10,000/min
  ├─ Response time: <100ms
  └─ Uptime target: 99.9%

Database Indexes:
  ├─ vehicleNumber (lookup)
  ├─ parkingLot + status (active vehicles)
  ├─ isManualEntry + parkingLot (suspicious activity)
  └─ createdAt (time-series queries)
```

---

**Architecture Designed for**: Reliability, Auditability, and Scalability
**Implementation Date**: January 2026
**Status**: ✅ COMPLETE
