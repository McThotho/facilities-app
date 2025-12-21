# Facilities App Deployment Guide

## Overview
This guide will help you deploy your Facilities Management Application to production so you can share it with your team for feedback.

---

## Option 1: Deploy Using Vercel Web Interface (Recommended - Easiest)

### Frontend Deployment (Vercel)

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account
3. **Import your project**:
   - Click "Add New Project"
   - If your code is on GitHub, select the repository
   - If not on GitHub yet, you'll need to push to GitHub first OR use the CLI method below

4. **Configure the project**:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. **Environment Variables** (Add these in Vercel dashboard):
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app/api
   ```
   (You'll get the backend URL after deploying the backend in step 2)

6. **Deploy**: Click "Deploy" button

### Backend Deployment (Railway or Render)

#### Using Railway (Recommended):

1. **Go to Railway**: https://railway.app
2. **Sign up/Login** with your GitHub account
3. **New Project** > **Deploy from GitHub repo** (or "Empty Project" if not on GitHub)
4. **Configure**:
   - Root Directory: `backend`
   - Start Command: `node server.js`
   - Port: `3001` (Railway auto-detects)

5. **Add Environment Variables**:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=3001
   NODE_ENV=production
   ```

6. **Deploy** and copy the provided URL (e.g., `https://your-app.up.railway.app`)

7. **Update Frontend**: Go back to Vercel, update the `VITE_API_URL` environment variable with your Railway backend URL, then redeploy

#### Using Render (Alternative):

1. **Go to Render**: https://render.com
2. **Sign up/Login**
3. **New** > **Web Service**
4. **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment: `Node`

5. **Add Environment Variables** (same as Railway above)

6. **Deploy** and copy the URL

---

## Option 2: Deploy Using CLI (For Advanced Users)

### Prerequisites
You need to authenticate first:

```bash
# For Vercel
npx vercel login

# For Railway
npm install -g @railway/cli
railway login
```

### Deploy Frontend to Vercel

```bash
cd /Users/ameeraaboobakur/facilities-app/frontend

# Login to Vercel (opens browser)
npx vercel login

# Deploy to production
npx vercel --prod
```

### Deploy Backend to Railway

```bash
cd /Users/ameeraaboobakur/facilities-app/backend

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

---

## Important Notes

### Database Considerations
Your app currently uses SQLite, which works fine for Railway/Render as they have persistent storage. However:

- **For production**: Consider migrating to PostgreSQL for better scalability
- **For testing/feedback**: SQLite is perfectly fine and will work

### CORS Configuration
The backend is already configured to accept requests from any origin (during development). For production, you may want to restrict this to your Vercel URL only.

In `/Users/ameeraaboobakur/facilities-app/backend/server.js`, you can update:

```javascript
app.use(cors({
  origin: 'https://your-vercel-app.vercel.app'
}));
```

### File Uploads
Currently, files are stored locally in the `uploads` folder. For production:
- Railway/Render provide persistent storage, so this will work
- For better scalability, consider using cloud storage (AWS S3, Cloudinary, etc.)

---

## Quick Start (Fastest Way to Deploy)

1. **Create accounts**:
   - Vercel: https://vercel.com (for frontend)
   - Railway: https://railway.app (for backend)

2. **Deploy Backend First** (Railway):
   - Go to railway.app, click "Start a New Project"
   - Choose "Deploy from GitHub" or "Empty Project"
   - Upload the `backend` folder
   - Set environment variables
   - Copy the deployed URL

3. **Deploy Frontend** (Vercel):
   - Go to vercel.com, click "Add New Project"
   - Upload the `frontend` folder
   - Set `VITE_API_URL` to your Railway backend URL
   - Deploy

4. **Share the Vercel URL** with your team!

---

## Deployment URLs

After deployment, you'll have:
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend**: `https://your-app-name.up.railway.app`

Share the frontend URL with your team for testing and feedback.

---

## Troubleshooting

### Frontend can't connect to backend
- Check that `VITE_API_URL` environment variable is set correctly in Vercel
- Make sure the backend URL ends with `/api`
- Verify CORS is properly configured

### Backend deployment fails
- Check that all dependencies are in package.json
- Verify Node version compatibility
- Check environment variables are set

### Database issues
- Railway/Render provide persistent storage
- The SQLite database will be created automatically on first run
- Initial data will be seeded from database.js

---

## Need Help?

If you encounter any issues during deployment, please let me know and I can help troubleshoot!
