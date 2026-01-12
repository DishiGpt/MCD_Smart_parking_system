# 🚀 DEPLOYMENT GUIDE - Render (Backend) + Vercel (Frontend)

## Project Structure
```
MCD_Smart_parking_system/
├── server/                          # Backend (deploy to Render)
├── client/                          # Frontend (deploy to Vercel)
├── parking-mobile-app/              # Mobile (Expo - deploy separately if needed)
├── package.json                     # Root package (optional)
├── vercel.json                      # Vercel config (for root exports)
├── render.yaml                      # Render config (new - for backend)
├── .env                             # Production secrets (DO NOT COMMIT)
├── .env.example                     # Template (commit this)
└── README.md
```

---

## Prerequisites

1. **Render Account:** https://render.com (free tier available)
2. **Vercel Account:** https://vercel.com (connected to GitHub recommended)
3. **GitHub Repository:** Push your code to GitHub
4. **MongoDB Atlas:** Cloud database (recommended; $0/month free tier)
   - Create cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/dbname`

---

## STEP 1: DATABASE SETUP (MongoDB Atlas)

### 1a. Create MongoDB Atlas Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Create a free cluster (M0 tier)
4. Create a database user:
   - Go to **Database Access**
   - Click **Add New Database User**
   - Username: `devikadiya1010_db_user` (or choose your own)
   - Password: Generate secure password (save it)
   - Built-in Role: `readWriteAnyDatabase`

5. Whitelist IP addresses:
   - Go to **Network Access**
   - Click **Add IP Address**
   - Select "Allow Access from Anywhere" (for development)
   - Or add specific IPs: `0.0.0.0/0` for Render

### 1b. Get Connection String
1. Click **Connect** on your cluster
2. Choose **Drivers** → **Node.js**
3. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/Smart-Parking?appName=Cluster0
   ```
4. Replace `username` and `password` with your credentials
5. Your connection string is already in `.env`:
   ```
   MONGODB_URI=mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
   ```

---

## STEP 2: BACKEND DEPLOYMENT (Render)

### 2a. Prepare Backend for Render

**Current Status:** ✅ Already configured!
- `server/server.js` exports Express app
- `render.yaml` is present
- `.env` file contains MongoDB URI
- `package.json` has correct start script

**Verify:**
```bash
# Check package.json start script
cd /path/to/MCD_Smart_parking_system
cat package.json | grep -A 10 '"scripts"'

# Expected output:
# "start": "node server/server.js",
# "dev": "nodemon server/server.js",
```

### 2b. Push Code to GitHub
```bash
# From root directory
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system

git add -A
git commit -m "chore: prepare for production deployment (Render + Vercel)"
git push origin main
```

### 2c. Deploy to Render

**Option A: Use render.yaml (Recommended)**
1. Go to https://render.com/dashboard
2. Click **New** → **Web Service**
3. Select your GitHub repository
4. Render should automatically detect `render.yaml`
5. Fill in details:
   - **Name:** `smart-parking-api`
   - **Root Directory:** (leave blank, or set to `.`)
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter for production)

6. Set Environment Variables:
   ```
   MONGODB_URI = mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
   NODE_ENV = production
   PORT = 5000
   ```

7. Click **Deploy**
8. Wait ~3-5 minutes for build to complete
9. Copy the **Render URL** (e.g., `https://smart-parking-api.onrender.com`)

**Option B: Manual Setup (if render.yaml doesn't work)**
1. Click **New** → **Web Service**
2. Connect GitHub repo
3. Configure:
   - **Name:** `smart-parking-api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Publish Directory:** (leave blank)

4. Add environment variables manually
5. Deploy

### 2d. Test Backend Deployment
```bash
# Replace with your Render URL
curl https://smart-parking-api.onrender.com/api/health

# Expected response:
# {"success":true,"message":"Smart Parking API is running","timestamp":"2026-01-12T..."}
```

---

## STEP 3: FRONTEND DEPLOYMENT (Vercel)

### 3a. Prepare Frontend for Vercel

**Required Files:**
- ✅ `client/package.json` - correct
- ✅ `client/public/index.html` - exists
- ✅ `client/src/` - application code

**Create `client/.env.local`:**
```bash
cd client
cat > .env.local << 'EOF'
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
EOF
```

Or manually create `client/.env.local`:
```
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
```

**Create Vercel config at root (`vercel.json` - already exists, verified):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/build"
      }
    }
  ],
  "routes": [
    {
      "src": "^/api/(.*)",
      "dest": "https://smart-parking-api.onrender.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "client/build/$1"
    }
  ]
}
```

Update the current `vercel.json` to handle client routing:

### 3b. Update vercel.json for Frontend
```bash
# From root directory
# Edit vercel.json to route API calls to Render backend
```

### 3c. Deploy to Vercel

**Option A: Using GitHub Integration (Recommended)**
1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Import GitHub repository (if not already connected)
4. Configure:
   - **Project Name:** `smart-parking-client` (or similar)
   - **Framework Preset:** React
   - **Root Directory:** `client` ← **IMPORTANT**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `build` (default)

5. Add Environment Variables:
   ```
   REACT_APP_API_URL = https://smart-parking-api.onrender.com/api
   REACT_APP_ENVIRONMENT = production
   ```

6. Click **Deploy**
7. Wait for build (~2-5 minutes)
8. Copy your Vercel URL (e.g., `https://smart-parking-client.vercel.app`)

**Option B: Using Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# From root directory
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system

# Deploy
vercel --prod

# Follow prompts:
# - Link to existing project? yes/no
# - Which scope? (your account)
# - Project name: smart-parking-client
# - Detected location of code: ./client
# - Want to modify vercel.json? no
# - Build settings: default
```

### 3d. Test Frontend Deployment
```bash
# Visit your Vercel URL
https://smart-parking-client.vercel.app
```

You should see the Guard Console / User Portal loading.

---

## STEP 4: MOBILE APP (Expo - Optional)

The mobile app currently hard-codes the API URL. Update it:

### 4a. Update Mobile API URL
Edit `parking-mobile-app/App.js`:
```javascript
// BEFORE:
const API_URL = 'https://nondistinguished-unmaimed-alta.ngrok-free.dev';

// AFTER:
const API_URL = 'https://smart-parking-api.onrender.com';
```

### 4b. Test Mobile App
```bash
cd parking-mobile-app
expo start

# On device/emulator:
# - Press 's' for Expo Go on Android
# - Press 'i' for Expo Go on iOS
# - Or scan QR code with camera
```

---

## STEP 5: ENVIRONMENT VARIABLES SUMMARY

### Backend (.env - in root)
```
MONGODB_URI=mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
PORT=5000
NODE_ENV=production
API_BASE_URL=https://smart-parking-api.onrender.com
```

### Render Environment Variables
In Render dashboard → **Environment**:
```
MONGODB_URI = [from above]
NODE_ENV = production
PORT = 5000
```

### Frontend (.env.local - in client/)
```
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
```

### Vercel Environment Variables
In Vercel dashboard → **Settings** → **Environment Variables**:
```
REACT_APP_API_URL = https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT = production
```

### Mobile (hardcoded in parking-mobile-app/App.js)
```javascript
const API_URL = 'https://smart-parking-api.onrender.com';
```

---

## STEP 6: VERIFY DEPLOYMENT

### 6a. Health Checks
```bash
# Backend health
curl https://smart-parking-api.onrender.com/api/health

# Frontend (visit in browser)
https://smart-parking-client.vercel.app

# Check API is reachable from frontend
# (Open browser console and check Network tab for /api/parking-lots calls)
```

### 6b. Common Deployment Issues

**Issue: "MongoDB connection failed"**
- ✅ Check MONGODB_URI in Render environment variables
- ✅ Verify credentials in connection string
- ✅ Whitelist Render IP in MongoDB Atlas → Network Access

**Issue: "CORS error on frontend"**
- ✅ Backend `server.js` has `app.use(cors())` ✅
- ✅ Verify API URL is correctly set in `REACT_APP_API_URL`
- ✅ Clear browser cache and hard-refresh

**Issue: "Frontend can't find backend"**
- ✅ Check `REACT_APP_API_URL` environment variable in Vercel
- ✅ Verify Render backend URL is correct
- ✅ Test API directly: `curl https://smart-parking-api.onrender.com/api/health`

**Issue: "Render keeps restarting"**
- ✅ Check logs in Render dashboard
- ✅ Verify `npm start` command works locally: `npm start`
- ✅ Check for uncaught exceptions in code

---

## STEP 7: CONTINUOUS DEPLOYMENT

### GitHub → Render (Auto Deploy)
1. In Render dashboard → **Settings** → **Repository**
2. Verify GitHub repo is connected
3. Select branch to deploy (usually `main`)
4. **Auto-deploy:** enabled (default)
5. Push to GitHub, Render automatically redeploys in ~2-3 minutes

### GitHub → Vercel (Auto Deploy)
1. In Vercel dashboard → **Settings** → **Git**
2. Verify GitHub is connected
3. **Production Branch:** `main`
4. **Preview Deployments:** enabled (default)
5. Push to GitHub, Vercel automatically redeploys in ~2-3 minutes

---

## STEP 8: DOMAIN SETUP (Optional)

### Custom Domain on Render
1. Render dashboard → Smart Parking API → **Settings**
2. Scroll to **Custom Domain**
3. Enter your domain (e.g., `api.myparking.com`)
4. Add DNS record provided by Render to your registrar

### Custom Domain on Vercel
1. Vercel dashboard → Smart Parking Client → **Settings** → **Domains**
2. Add domain (e.g., `myparking.com`)
3. Update DNS to point to Vercel

---

## DEPLOYMENT CHECKLIST

### Backend (Render)
- [ ] MongoDB Atlas cluster created
- [ ] Connection string in `.env` and Render environment
- [ ] `render.yaml` present and valid
- [ ] `npm start` works locally
- [ ] Pushed to GitHub
- [ ] Created Render web service
- [ ] Environment variables set in Render
- [ ] Health check passes: `/api/health`

### Frontend (Vercel)
- [ ] `client/.env.local` created with API URL
- [ ] `vercel.json` configured
- [ ] `client/package.json` build script tested locally: `npm run build`
- [ ] Pushed to GitHub
- [ ] Created Vercel project with root directory = `client`
- [ ] Environment variables set in Vercel
- [ ] Frontend loads and can reach backend

### Mobile (Expo)
- [ ] API URL updated in `parking-mobile-app/App.js`
- [ ] Test on device/emulator
- [ ] (Optional) Deploy to Expo App or TestFlight/Play Store

---

## QUICK START COMMANDS

### Local Development
```bash
# From root directory
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system

# Backend
npm install
npm run dev          # Runs on localhost:5000

# Frontend (in separate terminal)
cd client
npm install
npm start            # Runs on localhost:3000

# Mobile (in separate terminal)
cd parking-mobile-app
npm install
expo start
```

### Deploy to Production
```bash
# Commit and push
git add -A
git commit -m "Deploy to production"
git push origin main

# Render auto-deploys when GitHub updates
# Vercel auto-deploys when GitHub updates
# Wait ~3-5 minutes for both to complete
```

---

## MONITORING

### Render Logs
1. Render dashboard → Smart Parking API → **Logs**
2. Watch for errors, connection issues, etc.

### Vercel Logs
1. Vercel dashboard → Smart Parking Client → **Deployments**
2. Click latest deployment → **Logs**

### MongoDB Atlas Monitoring
1. MongoDB Atlas → Cluster → **Monitoring**
2. Check connection count, operations, etc.

---

## TROUBLESHOOTING

### Test Commands
```bash
# Test backend API
curl -X GET https://smart-parking-api.onrender.com/api/health
curl -X GET https://smart-parking-api.onrender.com/api/parking-lots

# Test CORS
curl -H "Origin: https://smart-parking-client.vercel.app" \
     -X GET https://smart-parking-api.onrender.com/api/parking-lots

# Test database connection
# (Check Render logs for MongoDB connection messages)

# Check frontend environment variables (browser console)
# Open browser DevTools → Console → type: process.env.REACT_APP_API_URL
```

---

## FINAL SUMMARY

| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| Backend API | Render | https://smart-parking-api.onrender.com | ✅ Ready |
| Frontend Web | Vercel | https://smart-parking-client.vercel.app | ✅ Ready |
| Database | MongoDB Atlas | [your cluster] | ✅ Ready |
| Mobile | Expo | [your tunnel] | ⚠️ Update API URL |

---

**Created:** January 12, 2026  
**Status:** ✅ Ready for Production Deployment
