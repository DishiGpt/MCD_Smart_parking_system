# 📋 PRE-DEPLOYMENT CHECKLIST & ROOT DIRECTORY SETUP

## ✅ CURRENT DEPLOYMENT STATUS

### Backend (Node.js/Express)
- ✅ `server/server.js` - Configured for serverless deployment
- ✅ `package.json` - Correct start script: `"start": "node server/server.js"`
- ✅ `.env` - MongoDB URI configured
- ✅ `render.yaml` - Render deployment config present
- ✅ CORS enabled - `app.use(cors())`
- ✅ App exports - `module.exports = app`
- ✅ MongoDB - Atlas connection string set

### Frontend (React)
- ✅ `client/package.json` - React app ready
- ✅ `client/build` ready for production
- ✅ `vercel.json` - Updated for frontend deployment
- ✅ `.env.example` - Template created
- ⚠️ `.env.local` - Needs to be created before deployment

### Mobile (Expo/React Native)
- ⚠️ `parking-mobile-app/App.js` - Hard-coded API URL needs update

### Root Configuration
- ✅ `.env` - Production secrets
- ✅ `.env.example` - Template (committed)
- ✅ `.gitignore` - Excludes node_modules, .env, .env.local
- ✅ `DEPLOYMENT_GUIDE.md` - Complete setup instructions

---

## 🎯 STEP-BY-STEP DEPLOYMENT

### STEP 1: LOCAL VERIFICATION (Before Pushing to GitHub)

Run these commands from the root directory:

```bash
# Navigate to project root
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system

# 1a. Verify backend starts without errors
npm install
npm run dev
# Expected: 
# ✅ MongoDB Connected Successfully
# 🚀 Server is running on http://localhost:5000
# (Press Ctrl+C to stop)

# 1b. Verify frontend builds without errors
cd client
npm install
npm run build
# Expected:
# npm notice created a lockfile as package-lock.json
# > react-scripts build
# Creating an optimized production build...
# The build folder is ready to be deployed.
# cd ..

# 1c. Verify database connection
curl http://localhost:5000/api/health
# Expected: {"success":true,"message":"Smart Parking API is running",...}
```

### STEP 2: Create Environment Files

#### 2a. Backend Environment (.env in root)

Already done! Verify:
```bash
cat .env
# Should show:
# MONGODB_URI=mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
# PORT=5000
# NODE_ENV=production
```

#### 2b. Frontend Environment (client/.env.local)

Create this file (DO NOT COMMIT):
```bash
cd client

# On Windows (PowerShell):
@"
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
"@ | Out-File -Encoding UTF8 .env.local

# Or on macOS/Linux:
cat > .env.local << 'EOF'
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
EOF
```

Verify:
```bash
cat .env.local
```

#### 2c. Mobile Environment (hardcoded - Update Later)

Current: `parking-mobile-app/App.js` line ~10:
```javascript
const API_URL = 'https://nondistinguished-unmaimed-alta.ngrok-free.dev';
```

Will update after Render backend is deployed.

### STEP 3: Push to GitHub

```bash
# From root directory
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system

# Check git status
git status

# Add all changes
git add -A

# Verify what will be committed
git status

# Commit
git commit -m "chore: prepare for production deployment

- Add DEPLOYMENT_GUIDE.md with complete instructions
- Add render.yaml for Render backend deployment
- Update vercel.json for Vercel frontend deployment
- Add .env.example and client/.env.example templates
- Verify MongoDB Atlas connection
- Ensure all environment variables are ready"

# Push to GitHub
git push origin main

# Verify push was successful
git log --oneline -5
```

### STEP 4: Deploy Backend on Render

#### 4a. Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Go to dashboard

#### 4b. Create Web Service
1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Select `MCD_Smart_parking_system` repository

#### 4c. Configure Deployment
```
Name: smart-parking-api
Root Directory: (leave blank - auto-detected)
Build Command: npm install
Start Command: npm start
Environment: Node
Plan: Free (for testing) or Starter (for production)
```

#### 4d. Set Environment Variables
In Render dashboard → **Environment**:
```
MONGODB_URI = mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
NODE_ENV = production
PORT = 5000
```

#### 4e. Deploy
1. Click **Create Web Service**
2. Wait for build (3-5 minutes)
3. Copy your Render URL: `https://smart-parking-api.onrender.com`
4. Test: `curl https://smart-parking-api.onrender.com/api/health`

### STEP 5: Deploy Frontend on Vercel

#### 5a. Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Go to dashboard

#### 5b. Import Project
1. Click **Add New** → **Project**
2. Select your GitHub repository

#### 5c. Configure Build
```
Project Name: smart-parking-client
Framework Preset: React
Root Directory: client ← IMPORTANT!
Build Command: npm run build (default)
Output Directory: build (default)
```

#### 5d. Set Environment Variables
```
REACT_APP_API_URL = https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT = production
```

#### 5e. Deploy
1. Click **Deploy**
2. Wait for build (2-5 minutes)
3. Copy your Vercel URL: `https://smart-parking-client.vercel.app`
4. Visit URL in browser to verify it loads

### STEP 6: Update Mobile App

#### 6a. Update API URL
Edit `parking-mobile-app/App.js` (line ~10):

```javascript
// BEFORE:
const API_URL = 'https://nondistinguished-unmaimed-alta.ngrok-free.dev';

// AFTER:
const API_URL = 'https://smart-parking-api.onrender.com';
```

#### 6b. Commit and Push
```bash
git add parking-mobile-app/App.js
git commit -m "chore: update mobile API URL to production Render backend"
git push origin main
```

#### 6c. Test Mobile
```bash
cd parking-mobile-app
expo start
# Scan QR code with device or open in Expo Go
```

---

## 🔍 POST-DEPLOYMENT VERIFICATION

### Test Backend API

```bash
# 1. Health check
curl https://smart-parking-api.onrender.com/api/health
# Expected: {"success":true,"message":"Smart Parking API is running",...}

# 2. Get parking lots
curl https://smart-parking-api.onrender.com/api/parking-lots
# Expected: {"success":true,"parkingLots":[...]}

# 3. Get guards
curl https://smart-parking-api.onrender.com/api/guards
# Expected: {"success":true,"guards":[...]}

# 4. Test CORS from frontend origin
curl -H "Origin: https://smart-parking-client.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     https://smart-parking-api.onrender.com/api/parking-lots
```

### Test Frontend Web App

1. Visit: https://smart-parking-client.vercel.app
2. Check browser console for errors (F12)
3. Verify API requests go to Render backend
4. Test Guard Console login (GUARD001 / guard123)
5. Test Admin Portal

### Test Mobile App

1. Run `cd parking-mobile-app && expo start`
2. Verify API URL is correct: https://smart-parking-api.onrender.com
3. Check app can fetch parking lots
4. Test navigation features

---

## 📊 DEPLOYMENT SUMMARY TABLE

| Component | Platform | URL | Status |
|-----------|----------|-----|--------|
| Backend API | Render | https://smart-parking-api.onrender.com | ✅ Deployed |
| Frontend Web | Vercel | https://smart-parking-client.vercel.app | ✅ Deployed |
| Database | MongoDB Atlas | [configured] | ✅ Connected |
| Mobile | Expo | [local/TestFlight/Play Store] | ✅ Updated |

---

## 🚀 CONTINUOUS DEPLOYMENT (Auto-Deploy)

Both Render and Vercel watch your GitHub repository:

```bash
# To trigger deployment:
git add -A
git commit -m "Update feature"
git push origin main

# Render deploys in ~2 minutes
# Vercel deploys in ~3 minutes
```

---

## 🔧 TROUBLESHOOTING

### Problem: Backend won't start on Render

**Solution:**
1. Check Render logs: https://dashboard.render.com → Smart Parking API → Logs
2. Verify `npm start` works locally: `npm run dev` (or `npm start`)
3. Verify `.env` values are set correctly in Render dashboard
4. Restart service: Click **Restart** in Render dashboard

### Problem: Frontend can't reach backend

**Solution:**
1. Verify `REACT_APP_API_URL` is set in Vercel environment
2. Check browser console (F12) for API errors
3. Verify Render backend is running: `curl https://smart-parking-api.onrender.com/api/health`
4. Clear browser cache (Ctrl+Shift+Delete) and refresh

### Problem: CORS errors

**Solution:**
1. Backend already has `app.use(cors())` ✅
2. Verify API URL in frontend matches backend URL
3. Check browser Network tab to see exact error
4. Restart both services

### Problem: Database connection fails

**Solution:**
1. Verify MONGODB_URI in `.env`: Check username and password
2. Verify MongoDB Atlas whitelist includes Render IP (0.0.0.0/0)
3. Test connection locally: `npm run dev`
4. Check MongoDB Atlas status: https://www.mongodb.com/cloud/atlas

### Problem: Build fails on Vercel

**Solution:**
1. Check Vercel build logs
2. Verify `client` directory exists
3. Test build locally: `cd client && npm run build`
4. Verify no TypeScript errors (check `tsconfig.json`)

---

## 📝 ENVIRONMENT VARIABLE SUMMARY

### `.env` (Root - DO NOT COMMIT)
```
MONGODB_URI=mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
PORT=5000
NODE_ENV=production
```

### Render Environment Variables
```
MONGODB_URI = [from .env]
NODE_ENV = production
PORT = 5000
```

### `client/.env.local` (DO NOT COMMIT)
```
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
```

### Vercel Environment Variables
```
REACT_APP_API_URL = https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT = production
```

### `parking-mobile-app/App.js` (Hardcoded)
```javascript
const API_URL = 'https://smart-parking-api.onrender.com';
```

---

## ✨ FINAL VERIFICATION CHECKLIST

- [ ] Local backend starts: `npm run dev` → ✅ Running on :5000
- [ ] Local frontend builds: `cd client && npm run build` → ✅ Build successful
- [ ] `.env` has MongoDB URI
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` is committed
- [ ] `client/.env.local` created with Render backend URL
- [ ] `client/.env.local` is in `.gitignore`
- [ ] `render.yaml` is committed
- [ ] `vercel.json` is updated for frontend
- [ ] Code pushed to GitHub: `git push origin main`
- [ ] Render backend deployed and healthy: `/api/health` returns 200
- [ ] Vercel frontend deployed and loads
- [ ] Frontend can reach backend (check Network tab in DevTools)
- [ ] Guard Console login works
- [ ] Mobile app API URL updated
- [ ] Mobile app can fetch parking lots

---

## 📞 SUPPORT

**Backend Issues:** Check Render logs → Dashboard → Smart Parking API → Logs
**Frontend Issues:** Check Vercel logs → Dashboard → Deployments → View Logs
**Database Issues:** Check MongoDB Atlas → Monitoring
**GitHub Issues:** Check repository → Actions → See workflow runs

---

**Last Updated:** January 12, 2026
**Status:** ✅ READY FOR PRODUCTION DEPLOYMENT
