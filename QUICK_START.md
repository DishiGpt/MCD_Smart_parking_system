
# 🚀 ANPR Scanner - Quick Start Guide

## Installation Complete ✅

Your smart parking system now has an advanced **OCR License Plate Scanner**! All dependencies are installed and the component is fully integrated.


---

## 📍 What Was Added

### New Files
- **[Scanner.jsx](client/src/components/Scanner.jsx)** - Main OCR scanner component
- **[SCANNER_INTEGRATION_GUIDE.md](SCANNER_INTEGRATION_GUIDE.md)** - Complete technical documentation  
- **[ANPR_SCANNER_DELIVERY.md](ANPR_SCANNER_DELIVERY.md)** - Detailed delivery summary

### Modified Files
- **[AdminPortal.js](client/src/components/AdminPortal.js)** - Added Scanner integration

### New Dependencies
- `react-webcam@7.1.0` - Camera access
- `tesseract.js@4.1.1` - Optical Character Recognition (OCR)

---

## 🎬 Getting Started

### Step 1: Start the React App
```bash
cd client
npm start
```
The app will run on `http://localhost:3000`

### Step 2: Access the Scanner
1. Open your browser to `http://localhost:3000`
2. Log in to the Admin Dashboard
3. Click **"+ Entry Scanner"** or **"+ Exit Scanner"** button in the top right

### Step 3: Use the Scanner
1. Point your device camera at a vehicle license plate
2. Click **"Capture Plate"**
3. Wait for OCR processing (3-10 seconds on first run)
4. Review the extracted text
5. Edit if needed
6. Click **"Submit Entry"** or **"Submit Exit"**

---

## ⚙️ Backend Setup Required

The scanner is ready, but you need to implement these API endpoints:

### POST /api/entry
Called when recording vehicle entry.

**Request:**
```json
{
  "licensePlate": "DL 55 1234"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Entry recorded successfully",
  "transactionId": "abc123",
  "timestamp": "2026-01-09T10:30:00Z"
}
```

### POST /api/exit
Called when recording vehicle exit and calculating parking fee.

**Request:**
```json
{
  "licensePlate": "DL 55 1234"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Exit recorded successfully",
  "fee": 50,
  "duration": "2h 30m",
  "transactionId": "def456"
}
```

---

## 🔍 Features Overview

### ✅ Camera Integration
- Live video feed from device camera
- Professional scanner frame overlay
- Support for landscape orientation

### ✅ OCR Processing
- Tesseract.js for accurate text extraction
- Real-time progress indication
- Raw text display for debugging

### ✅ Smart Filtering
Automatically extracts license plates in these formats:
- ✅ `DL 55 AB 1234` - Standard Indian format
- ✅ `DL 55 1234` - Abbreviated format
- ✅ `DL55AB1234` - Compact format
- ❌ Rejects garbage text like "tree", "road", etc.

### ✅ User-Friendly UI
- Manual editing capability
- Success/error notifications
- Processing spinner
- Fee display for exits
- Mobile responsive design

### ✅ API Integration
- Automatic endpoint selection (ENTRY/EXIT)
- Error handling and user feedback
- Auto-close after success

---

## 📸 Scanner UI Layout

```
┌─────────────────────────────────┐
│ Entry/Exit Scanner          [X] │
├─────────────────────────────────┤
│                                 │
│    📹 Live Camera Feed          │
│   ╔─────────────╗               │
│   ║ ┌─────────┐ ║  (Scanner     │
│   ║ │ Scan    │ ║   Frame)      │
│   ║ │ Here    │ ║               │
│   ║ └─────────┘ ║               │
│   ╚─────────────╝               │
│      [Capture Plate]            │
│                                 │
│ License Plate: [DL 55 1234] ✓   │
│                                 │
│ [Retake Photo] [Submit Entry]   │
└─────────────────────────────────┘
```

---

## 🧪 Testing the Scanner

### Without Backend (Manual Test)
1. The camera and OCR will work
2. API submission will fail (no backend)
3. Check browser console for details

### With Backend (Full Test)
1. Implement `/api/entry` endpoint
2. Implement `/api/exit` endpoint
3. Scanner will now fully work

### Supported Plate Formats
Try scanning these for testing:
- DL 55 AB 1234
- MH 02 YY 7777
- KA 01 AA 1234
- HR 26 AB 4567

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not showing | Check browser camera permissions |
| OCR takes long | First run downloads ~70MB model - be patient |
| "No license plate detected" | Ensure good lighting and clear photo |
| API Error (404) | Implement `/api/entry` and `/api/exit` endpoints |
| Tesseract error | Clear browser cache, refresh page |

---

## 📱 Browser Support

- ✅ Chrome/Edge 50+
- ✅ Firefox 55+
- ✅ Safari 11+
- ⚠️ Requires HTTPS or localhost (for camera)

---

## 🎨 Customization Examples

### Change Scanner Frame Color
Edit `Scanner.jsx` line ~115:
```jsx
<div className="border-green-500"></div>  // Change to border-blue-500, border-red-500, etc.
```

### Support Different License Plate Formats
Edit `Scanner.jsx` `filterLicensePlate()` function to add more regex patterns.

### Change OCR Language
Edit `Scanner.jsx` line ~56:
```javascript
const result = await Tesseract.recognize(imageSrc, 'hin', {
  // 'hin' = Hindi
  // 'fra' = French
  // 'spa' = Spanish
});
```

---

## 📚 Documentation

For detailed information, see:
- **[SCANNER_INTEGRATION_GUIDE.md](SCANNER_INTEGRATION_GUIDE.md)** - Full technical guide
- **[ANPR_SCANNER_DELIVERY.md](ANPR_SCANNER_DELIVERY.md)** - Delivery summary

---

## ✨ What's Next?

1. **Implement Backend APIs**
   - Create endpoints in your Node.js server
   - Add fee calculation logic
   - Store transactions in MongoDB

2. **Enhance OCR**
   - Preprocess images for better accuracy
   - Test with real license plates
   - Optimize for different lighting

3. **Add Validations**
   - Cross-check plates against vehicle database
   - Prevent duplicate entries
   - Flag suspicious activities

4. **Production Deployment**
   - Set up HTTPS for camera access
   - Deploy to production server
   - Monitor OCR accuracy metrics

---

## 📞 Need Help?

1. Check the console logs in browser DevTools
2. Review the integration guide (linked above)
3. Ensure all dependencies are installed: `npm list react-webcam tesseract.js`
4. Test camera permissions in browser settings

---

## ✅ Checklist

Before going live:
- [ ] Backend endpoints implemented
- [ ] License plate format customized for your region
- [ ] Camera tested on devices
- [ ] OCR accuracy verified
- [ ] API integration tested
- [ ] Fee calculation working
- [ ] Error handling working
- [ ] Mobile tested

---

**Status**: 🟢 Ready to Use  
**Version**: 1.0.0  
**Last Updated**: January 9, 2026

Enjoy your new ANPR Scanner! 🚗📸
