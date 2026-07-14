# 🅿️ Smart Parking Management System

A modern, three-tier smart parking and enforcement system designed to streamline urban parking spaces using real-time ANPR OCR scanning, automated capacity locks, interactive customer mobile apps, and visual admin monitoring.

---

## 🚀 Key Features

* **🧠 ANPR OCR Scanner:** Automatic License Plate Recognition built using Tesseract.js (Web) and custom mobile scanning components for instant digital logging.
* **🚦 Real-Time Capacity Lock:** Automated blocking systems preventing entries when a lot reaches maximum capacity, paired with color-coded live slots indicators on the Guard Console and user app.
* **📱 Customer Mobile App:** Live location-based sorting of closest parking spaces, space-availability progress bars, easy GPS navigation, and slot complaint reporting.
* **👮 Guard Console Portal:** Seamless shift session starts/ends, manual entries/exits overrides, live ANPR camera status indicators, shift cash reconciliation tools, and exit payment processing.
* **📊 Enforcement Dashboard:** Live analytical charts tracking daily revenue, critical alerts, parking occupancy rate trends, guard activity audit trails, and customer complaint feeds.
* **⚠️ Complaint Reporting:** Integrated ticketing system allowing mobile users to report slot/service issues, with direct dashboard review, status filtering (`PENDING`, `IN_REVIEW`, `RESOLVED`), and delete controls for administrators.

---

## 🛠️ Tech Stack

* **Frontend:** React (SPA), Tailwind CSS, Lucide Icons, Recharts (Analytical Charts).
* **Mobile App:** Expo React Native, Expo Location, Axios.
* **Backend:** Node.js, Express, Mongoose ODM.
* **Database:** MongoDB (Atlas / Local).
* **Libraries:** Tesseract.js (OCR Engine).

---

## 📂 Repository Structure

* `server/` - Node.js Express server, MongoDB schemas/models, seeds, API endpoints.
* `client/` - SPA React Admin Portal, Guard Console, and Dashboard interface.
* `parking-mobile-app/` - Expo React Native consumer mobile application.
* `ARCHITECTURE_DIAGRAMS.md` - System layout and data flow visual reference.

---

## ⚡ Quick Setup & Installation

### 1. Server Configuration
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables inside a `.env` file:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 2. Client Web Console (Admin & Guard)
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```

### 3. Mobile Expo App
1. Navigate to the mobile app folder:
   ```bash
   cd ../parking-mobile-app
   ```
2. Install Expo and related dependencies:
   ```bash
   npm install
   ```
3. Start Expo:
   ```bash
   npx expo start
   ```

---

## 🛡️ License

This project is licensed under the MIT License.
