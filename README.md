# Facilities Management App

A full-stack facilities management application with user authentication, cleaning task tracking, visit scheduling, and team communication.

## Features

- **User Authentication** - 3-level role system (Administrator, Manager, User)
- **Dashboard** - Overview with KPIs (visit completion rate, cleaning adherence, overdue tasks)
- **Facility Management** - Manage multiple facilities with dedicated pages
- **Cleaning Tasks** - Daily cleaning checklist with photo upload requirement
- **Visit Scheduling** - Calendar-based visit scheduling with status tracking
- **Team Chat** - Facility-specific team communication
- **Responsive UI** - Modern, clean interface built with React and Tailwind CSS

## Tech Stack

**Frontend:**
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Recharts for data visualization
- Axios for API calls
- Lucide React for icons
- date-fns for date formatting

**Backend:**
- Node.js + Express
- SQLite database (better-sqlite3)
- JWT authentication
- Multer for file uploads
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js v18+ and npm installed

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd facilities-app
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

1. **Start the backend server (from backend directory):**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on http://localhost:5000

2. **Start the frontend (from frontend directory in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on http://localhost:5173

3. **Access the app:**
   Open http://localhost:5173 in your browser

### Default Login Credentials

```
Username: admin
Password: admin123
Role: Administrator
```

The database comes pre-populated with:
- 1 admin user
- 3 sample facilities (Building A, B, C)

## Project Structure

```
facilities-app/
├── backend/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Auth middleware
│   ├── uploads/         # Uploaded photos
│   ├── database.js      # SQLite database setup
│   ├── server.js        # Express server
│   └── facilities.db    # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── context/     # Auth context
│   │   ├── utils/       # API utilities
│   │   └── App.jsx      # Main app component
│   └── index.html
└── README.md
```

## Key Features Explained

### User Roles
- **Administrator**: Full access - manage users, facilities, all features
- **Manager**: Manage facilities, assign tasks, view reports
- **User**: View assigned facilities, complete tasks, participate in chat

### Dashboard KPIs
- Total facilities count
- Visit completion rate (last 30 days)
- Cleaning adherence rate (last 30 days)
- Overdue tasks count
- Upcoming visits (next 7 days)

### Cleaning Tasks
- Daily checklist per facility
- Photo upload required before marking as complete
- User assignment tracking
- Status: Pending → Completed (with photo proof)

### Visit Scheduling
- Calendar-based date picker
- Optional time selection
- Notes field for visit details
- Status tracking: Pending → Completed/Cancelled

### Team Chat
- Facility-specific message boards
- Refresh-based (reload to see new messages)
- Shows username and timestamp
- Clean, modern chat UI

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - List all users (Admin/Manager)

### Facilities
- `GET /api/facilities` - List all facilities
- `GET /api/facilities/:id` - Get single facility
- `POST /api/facilities` - Create facility (Admin/Manager)
- `PUT /api/facilities/:id` - Update facility (Admin/Manager)
- `DELETE /api/facilities/:id` - Delete facility (Admin)
- `GET /api/facilities/:id/users` - Get assigned users
- `POST /api/facilities/:id/assign-user` - Assign user to facility

### Cleaning
- `GET /api/cleaning/facility/:id` - Get all cleaning tasks
- `GET /api/cleaning/facility/:id/today` - Get today's tasks
- `POST /api/cleaning` - Create cleaning task
- `POST /api/cleaning/:id/complete` - Complete task (with photo)
- `DELETE /api/cleaning/:id` - Delete task

### Visits
- `GET /api/visits/facility/:id` - Get all visits
- `POST /api/visits` - Create visit
- `PUT /api/visits/:id` - Update visit
- `PUT /api/visits/:id/status` - Update visit status
- `DELETE /api/visits/:id` - Delete visit

### Chat
- `GET /api/chat/facility/:id` - Get messages
- `POST /api/chat` - Send message

### Dashboard
- `GET /api/dashboard/kpis` - Get overall KPIs
- `GET /api/dashboard/facility/:id` - Get facility stats

## Deployment

### Backend Deployment (Railway/Render)

1. Create a new project on Railway or Render
2. Connect your GitHub repository
3. Set environment variables:
   ```
   PORT=5000
   JWT_SECRET=your-secure-secret-key-here
   NODE_ENV=production
   ```
4. Deploy from the `/backend` directory
5. Note your backend URL (e.g., https://your-app.railway.app)

### Frontend Deployment (Vercel/Netlify)

1. Create a new project on Vercel or Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Root directory: `frontend`
3. Set environment variable:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   ```
4. Deploy

### Alternative: Deploy Both Together

You can serve the frontend from the backend by:
1. Building the frontend: `cd frontend && npm run build`
2. Moving `dist` folder to `backend/public`
3. Adding to backend `server.js`:
   ```javascript
   app.use(express.static(path.join(__dirname, 'public')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'index.html'));
   });
   ```

## Future Enhancements

- Real-time chat with WebSockets
- Email notifications for overdue tasks
- Mobile app (React Native)
- Advanced reporting and analytics
- Multi-tenant support
- File attachments in chat
- Task recurring schedules
- User activity logs
- Dark mode

## Troubleshooting

**Backend won't start:**
- Make sure port 5000 is not in use
- Check if all dependencies are installed
- Verify .env file exists

**Frontend can't connect to backend:**
- Ensure backend is running on port 5000
- Check VITE_API_URL in frontend/.env
- Check browser console for CORS errors

**Photo uploads not working:**
- Ensure `/backend/uploads` directory exists
- Check file size (max 5MB)
- Verify file type is jpg/jpeg/png/webp

## License

MIT

## Author

Built with Claude Code
