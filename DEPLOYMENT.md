# Deployment Guide

This guide covers deploying your Facilities Management App to production.

## Option 1: Separate Deployments (Recommended)

### Backend Deployment - Railway

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder as root directory

3. **Environment Variables**
   Add these in Railway dashboard:
   ```
   PORT=5000
   JWT_SECRET=generate-a-strong-random-secret-here
   NODE_ENV=production
   ```

4. **Deploy**
   - Railway will auto-deploy
   - Note your backend URL (e.g., `https://your-app.railway.app`)

### Frontend Deployment - Vercel

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Framework Preset: Vite
   - Root Directory: `frontend`

3. **Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Environment Variables**
   Add in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

5. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-app.vercel.app`

---

## Option 2: Render (Both Frontend & Backend)

### Backend on Render

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Name: `facilities-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**
   ```
   PORT=10000
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

4. **Deploy**
   - Note your backend URL

### Frontend on Render

1. **Create Static Site**
   - Click "New +" → "Static Site"
   - Connect same repository
   - Name: `facilities-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Publish Directory: `dist`

2. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```

3. **Deploy**

---

## Option 3: Netlify (Frontend) + Railway (Backend)

### Backend - Railway
Follow Railway steps from Option 1

### Frontend - Netlify

1. **Create Netlify Account**
   - Go to https://netlify.com
   - Sign up with GitHub

2. **Deploy Site**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables**
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```

4. **Deploy**

---

## Post-Deployment Checklist

### Backend
- [ ] Database is created and initialized
- [ ] Environment variables are set correctly
- [ ] Default admin user exists (check logs)
- [ ] CORS is configured to allow frontend domain
- [ ] Uploads directory exists and is writable

### Frontend
- [ ] Can connect to backend API
- [ ] Login page loads correctly
- [ ] Environment variables are set
- [ ] All routes work (refresh on any page)

### Testing
- [ ] Login with admin credentials
- [ ] View dashboard
- [ ] Click on a facility
- [ ] Create a visit
- [ ] Upload a cleaning photo
- [ ] Send a chat message

---

## Updating CORS for Production

Edit `backend/server.js` to allow your frontend domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app',
    'https://your-app.netlify.app'
  ],
  credentials: true
}));
```

---

## Database Persistence

### Railway/Render
- SQLite database will persist with mounted volumes
- Railway: Automatically handles persistence
- Render: May need to use external database for production (PostgreSQL recommended)

### Migrating to PostgreSQL (Production)
If you need better database reliability:

1. Add pg package: `npm install pg`
2. Replace better-sqlite3 with pg
3. Update database.js to use PostgreSQL
4. Use Railway or Render's PostgreSQL addon

---

## Environment Variables Reference

### Backend (.env)
```
PORT=5000
JWT_SECRET=your-very-secure-random-string-min-32-chars
NODE_ENV=production
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.com/api
```

---

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### Railway
1. Go to Project Settings → Domains
2. Add custom domain
3. Update DNS records

### Netlify
1. Go to Site Settings → Domain management
2. Add custom domain
3. Configure DNS

---

## Monitoring & Logs

### Railway
- Click on deployment → View logs
- Real-time logging available

### Vercel
- Click on deployment → View function logs
- Real-time edge logs

### Render
- Click on service → Logs tab
- Live logs with search

---

## Troubleshooting

### "Cannot connect to backend"
- Check VITE_API_URL is correct
- Verify backend is running
- Check CORS configuration
- Inspect browser console for errors

### "Database errors"
- Ensure database file permissions are correct
- Check Railway/Render has volume mounted
- Verify database initialization ran (check logs)

### "Photo uploads not working"
- Verify uploads directory exists
- Check file size limits on hosting platform
- Ensure backend has write permissions

### "Routes not working on refresh"
- Frontend: Ensure rewrites are configured (vercel.json)
- Check static site configuration

---

## Cost Estimates

### Free Tier Options
- **Railway**: $5 free credit/month (backend)
- **Vercel**: Unlimited for hobby projects (frontend)
- **Netlify**: 100GB bandwidth/month free (frontend)
- **Render**: 750 hours/month free (both)

### Recommended for Production
- Railway backend: ~$5-10/month
- Vercel frontend: Free (or $20/month Pro)
- Total: ~$5-30/month depending on usage

---

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable HTTPS (automatic on Vercel/Railway/Netlify)
- [ ] Configure CORS properly
- [ ] Add rate limiting (future enhancement)
- [ ] Regular dependency updates
- [ ] Monitor error logs

---

## Backup Strategy

### Database Backup
```bash
# Download database from Railway/Render
# Run locally or via cron job
scp user@your-server:/path/to/facilities.db ./backup-$(date +%Y%m%d).db
```

### Automated Backups
- Railway: Use scheduled tasks
- Render: Configure cron jobs
- Or use external backup service

---

## Support

If you encounter issues:
1. Check the logs on your hosting platform
2. Verify all environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors

For Railway: https://railway.app/help
For Vercel: https://vercel.com/support
For Netlify: https://docs.netlify.com
For Render: https://render.com/docs
