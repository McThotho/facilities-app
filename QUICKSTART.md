# Quick Start Guide

## Running the App Locally

### Terminal 1 - Backend
```bash
cd facilities-app/backend
npm run dev
```

Backend will start on: http://localhost:5000

### Terminal 2 - Frontend
```bash
cd facilities-app/frontend
npm run dev
```

Frontend will start on: http://localhost:5173

### Access the App
Open your browser to: **http://localhost:5173**

## Default Login
```
Username: admin
Password: admin123
```

## What You Can Do

### 1. View Dashboard
- See overall KPIs
- Visit completion rate
- Cleaning adherence
- Charts and stats

### 2. Click on a Facility (e.g., "Building A")
You'll see 3 tabs:

#### Today's Cleaning
- View today's cleaning tasks
- Upload a photo to mark task as complete
- See who's assigned to each room

#### Schedule Visits
- Click "Schedule Visit" button
- Pick a date and optional time
- Add notes
- Mark visits as completed or cancelled

#### Team Chat
- Send messages to facility team
- Click refresh icon to see new messages
- Messages show username and timestamp

### 3. Try Different Features
- Create sample cleaning tasks (you'll need to add them via API or database)
- Schedule multiple visits
- Chat with yourself (messages persist)

## Sample API Calls (Optional)

### Create a Cleaning Task for Today
```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# Create cleaning task for Building A (facility_id=1)
curl -X POST http://localhost:5000/api/cleaning \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "facilityId": 1,
    "roomName": "Conference Room A",
    "assignedUserId": 1,
    "scheduledDate": "'$(date +%Y-%m-%d)'"
  }'
```

### Create a Visit
```bash
curl -X POST http://localhost:5000/api/visits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "facilityId": 1,
    "scheduledDate": "2025-12-25",
    "scheduledTime": "10:00",
    "notes": "Holiday maintenance check"
  }'
```

## Stopping the App

Press `Ctrl+C` in both terminals to stop the servers.

## Resetting the Database

If you want to start fresh:

```bash
cd facilities-app/backend
rm facilities.db
npm run dev
```

This will recreate the database with default data.

## Next Steps

1. **Add more users**: Use the register endpoint or add via database
2. **Create facilities**: Admin can create new facilities via API
3. **Customize**: Edit the code to fit your specific needs
4. **Deploy**: See DEPLOYMENT.md for production deployment

## Troubleshooting

**Port already in use:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Database errors:**
```bash
cd backend
rm facilities.db
npm run dev
```

**Dependencies missing:**
```bash
# In backend
cd backend
npm install

# In frontend
cd frontend
npm install
```

## Project Structure at a Glance

```
facilities-app/
├── backend/           # Express API
│   ├── routes/        # API endpoints
│   ├── middleware/    # Auth
│   └── server.js      # Main server
├── frontend/          # React app
│   ├── src/
│   │   ├── pages/     # Dashboard, FacilityDetail, Login
│   │   ├── components/ # Reusable components
│   │   └── context/   # Auth context
│   └── ...
├── README.md          # Full documentation
└── DEPLOYMENT.md      # Deployment guide
```

## Have Fun!

Explore the app, test all features, and customize it to your needs!
