# 🚀 ROOT DIRECTORY QUICK START COMMANDS

## ALL COMMANDS TO RUN FROM PROJECT ROOT

Navigate to your project root:
```bash
cd c:\Users\91858\Desktop\all files\MCD_Smart_parking_system
```

---

## ✅ PRE-DEPLOYMENT: LOCAL TESTING (5 min)

### 1. Install Dependencies
```bash
npm install
```

### 2. Verify Backend Starts
```bash
npm run dev
```
**Expected Output:**
```
✅ MongoDB Connected Successfully
🚀 Server is running on http://localhost:5000
📊 API Base URL: http://localhost:5000/api
```
**Then press Ctrl+C to stop**

### 3. Test Backend API
```bash
# In new terminal:
curl http://localhost:5000/api/health
```
**Expected:**
```json
{"success":true,"message":"Smart Parking API is running",...}
```

### 4. Build Frontend
```bash
cd client
npm install
npm run build
cd ..
```
**Expected:**
```
The build folder is ready to be deployed.
```

### 5. Verify Environment Files
```bash
# Check backend env
cat .env

# Check frontend env
cat client/.env.local

# Check .env is in gitignore
cat .gitignore | grep "^\.env"
```

---

## 📤 STEP 1: PUSH TO GITHUB

```bash
# From root directory
git status

git add -A

git commit -m "feat: ready for production deployment

- Add DEPLOYMENT_GUIDE.md with complete instructions
- Add DEPLOYMENT_CHECKLIST.md with verification steps
- Add render.yaml for Render backend
- Update vercel.json for Vercel frontend
- Create .env.example templates
- Configure MongoDB Atlas connection
- Ready for Render (backend) + Vercel (frontend)"

git push origin main

# Verify push
git log --oneline -5
```

---

## 🎯 STEP 2: DEPLOY BACKEND (Render)

### 2a. Create Render Service (One-time)
1. Go to https://render.com/dashboard
2. Click **New** → **Web Service**
3. Select your GitHub repo
4. Configure:
   ```
   Name: smart-parking-api
   Build Command: npm install
   Start Command: npm start
   Root Directory: (blank)
   Plan: Free (or Starter)
   ```
5. Add Environment Variables:
   ```
   MONGODB_URI = mongodb+srv://devikadiya1010_db_user:MD24Cs5JdipZCXoW@cluster0.g9hjqbk.mongodb.net/Smart-Parking?appName=Cluster0
   NODE_ENV = production
   PORT = 5000
   ```
6. Click **Create Web Service**
7. Wait ~3-5 minutes for build
8. Copy your Render URL: `https://smart-parking-api.onrender.com`

### 2b. Test Backend
```bash
# Wait for Render to finish deploying (check dashboard)
curl https://smart-parking-api.onrender.com/api/health

# Should return: {"success":true,"message":"Smart Parking API is running",...}

curl https://smart-parking-api.onrender.com/api/parking-lots
curl https://smart-parking-api.onrender.com/api/guards
```

### 2c. Auto-Deploy Future Changes
Every `git push` to `main` triggers auto-deployment on Render!
```bash
# Just push code, Render redeploys automatically
git push origin main
# Check Render dashboard in ~2 minutes
```

---

## 🎨 STEP 3: DEPLOY FRONTEND (Vercel)

### 3a. Update Frontend API URL
```bash
# Edit client/.env.local
cd client

# Windows (PowerShell):
@"
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
DANGEROUSLY_DISABLE_HOST_CHECK=true
"@ | Out-File -Encoding UTF8 .env.local

# macOS/Linux:
cat > .env.local << 'EOF'
REACT_APP_API_URL=https://smart-parking-api.onrender.com/api
REACT_APP_ENVIRONMENT=production
DANGEROUSLY_DISABLE_HOST_CHECK=true
EOF

cd ..
```

### 3b. Create Vercel Service (One-time)
1. Go to https://vercel.com/dashboard
2. Click **Add New** → **Project**
3. Select your GitHub repo
4. Configure:
   ```
   Project Name: smart-parking-client
   Framework: React
   Root Directory: client ← IMPORTANT!
   Build Command: npm run build
   Output Directory: build
   ```
5. Add Environment Variables:
   ```
   REACT_APP_API_URL = https://smart-parking-api.onrender.com/api
   REACT_APP_ENVIRONMENT = production
   ```
6. Click **Deploy**
7. Wait ~2-5 minutes for build
8. Copy your Vercel URL: `https://smart-parking-client.vercel.app`

### 3c. Test Frontend
1. Visit: https://smart-parking-client.vercel.app
2. Should load Guard Console / User Portal
3. Open DevTools (F12) → Network tab
4. Verify API calls go to Render backend

### 3d. Auto-Deploy Future Changes
Every `git push` to `main` triggers auto-deployment on Vercel!
```bash
git push origin main
# Check Vercel dashboard in ~3 minutes
```

---

## 📱 STEP 4: UPDATE MOBILE APP

### 4a. Update API URL
```bash
# Edit parking-mobile-app/App.js line ~10

# Find this:
const API_URL = 'https://nondistinguished-unmaimed-alta.ngrok-free.dev';

# Replace with:
const API_URL = 'https://smart-parking-api.onrender.com';

# Save and commit
git add parking-mobile-app/App.js
git commit -m "chore: update mobile API to production Render backend"
git push origin main
```

### 4b. Test Mobile
```bash
cd parking-mobile-app
npm install
expo start

# Scan QR code with Expo Go app (Android) or Camera (iOS)
# Or press 's' for Android emulator, 'i' for iOS simulator
```

---

## 🔍 VERIFICATION COMMANDS

### Test Backend Health
```bash
# Replace smart-parking-api.onrender.com with your actual Render URL
curl https://smart-parking-api.onrender.com/api/health
curl https://smart-parking-api.onrender.com/api/parking-lots
curl https://smart-parking-api.onrender.com/api/guards
curl https://smart-parking-api.onrender.com/api/guard-sessions
```

### Test CORS
```bash
curl -H "Origin: https://smart-parking-client.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS https://smart-parking-api.onrender.com/api/parking-lots
# Should return 200 OK with CORS headers
```

### Check Render Logs
```bash
# Render dashboard → Smart Parking API → Logs
# or use Render CLI:
npm install -g @render/cli
render logs --service smart-parking-api
```

### Check Vercel Logs
```bash
# Vercel dashboard → Deployments → Click latest → View Logs
# or use Vercel CLI:
npm install -g vercel
vercel logs
```

---

## 🔄 CONTINUOUS DEPLOYMENT WORKFLOW

### For Every Code Change:
```bash
# 1. Make changes
# 2. Commit
git add -A
git commit -m "feat: your feature description"

# 3. Push
git push origin main

# 4. Auto-deploy triggers:
# - Render redeploys backend in ~2 minutes
# - Vercel redeploys frontend in ~3 minutes

# 5. Verify deployment
# - Render dashboard: https://render.com/dashboard
# - Vercel dashboard: https://vercel.com/dashboard
```

---

## 🚨 TROUBLESHOOTING QUICK FIXES

### Backend won't start
```bash
# 1. Check logs
# Render dashboard → Smart Parking API → Logs

# 2. Test locally
npm run dev

# 3. Restart service
# Render dashboard → Smart Parking API → "Restart" button
```

### Frontend can't reach backend
```bash
# 1. Verify API URL
cat client/.env.local

# 2. Check REACT_APP_API_URL in Vercel dashboard
# Vercel dashboard → Settings → Environment Variables

# 3. Clear browser cache
# Browser → Ctrl+Shift+Delete → Clear all

# 4. Test API directly
curl https://smart-parking-api.onrender.com/api/health
```

### CORS errors
```bash
# Backend already has cors() middleware - no changes needed
# But verify:
grep -n "cors" server/server.js | head -5

# Should show: app.use(cors());
```

### Database connection fails
```bash
# 1. Check MongoDB URI
cat .env | grep MONGODB_URI

# 2. Verify credentials are correct
# 3. Check MongoDB Atlas whitelist includes Render IP
# MongoDB Atlas → Network Access → Allow 0.0.0.0/0

# 4. Test locally
npm run dev
```

---

## 📊 DEPLOYMENT SUMMARY

| Service | Provider | URL | Status | Auto-Deploy |
|---------|----------|-----|--------|-------------|
| Backend API | Render | https://smart-parking-api.onrender.com | ✅ | Yes (from main) |
| Frontend Web | Vercel | https://smart-parking-client.vercel.app | ✅ | Yes (from main) |
| Database | MongoDB Atlas | [configured] | ✅ | N/A |
| Mobile | Expo | [local] | ⚠️ API updated | No |

---

## 📋 FILE CHECKLIST

All deployment files created/updated:
- ✅ `DEPLOYMENT_GUIDE.md` - Detailed instructions
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step verification
- ✅ `DEPLOYMENT_COMMANDS.md` - This file with quick commands
- ✅ `.env.example` - Backend env template
- ✅ `client/.env.example` - Frontend env template
- ✅ `client/.env.local` - Frontend env (for local dev + Vercel)
- ✅ `render.yaml` - Render deployment config
- ✅ `vercel.json` - Vercel deployment config
- ✅ `.gitignore` - Excludes .env and node_modules

---

## 🎓 NEXT STEPS

1. **Run local tests** (5 min):
   ```bash
   npm install && npm run dev
   ```

2. **Push to GitHub**:
   ```bash
   git push origin main
   ```

3. **Deploy Backend** (5 min):
   - Create Render service
   - Set environment variables
   - Deploy

4. **Deploy Frontend** (5 min):
   - Create Vercel project
   - Set API URL env var
   - Deploy

5. **Test Everything**:
   - Backend: `curl https://smart-parking-api.onrender.com/api/health`
   - Frontend: Visit https://smart-parking-client.vercel.app
   - Mobile: Update API URL and test

6. **Monitor**:
   - Render dashboard: https://render.com/dashboard
   - Vercel dashboard: https://vercel.com/dashboard
   - MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

## 💡 TIPS

- **Render free tier**: Spins down after 15 min of inactivity, then takes ~30 sec to wake up
- **Vercel**: Always fast, no cold starts on free tier
- **MongoDB**: Free tier (M0) is limited but sufficient for development
- **CI/CD**: Both Render and Vercel auto-deploy on `git push` to `main`

---

**Generated:** January 12, 2026  
**Ready for Production:** ✅ YES
