const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const facilityRoutes = require('./routes/facilities');
const cleaningRoutes = require('./routes/cleaning');
const cleaningAssignmentsRoutes = require('./routes/cleaning-assignments');
const visitRoutes = require('./routes/visits');
const chatRoutes = require('./routes/chat');
const dashboardRoutes = require('./routes/dashboard');
const grievanceRoutes = require('./routes/grievances');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://facility-hub-vhpl-01.vercel.app'],
  credentials: true
}));
app.use(express.json());
// Static uploads only for local dev; in production, photos use Vercel Blob URLs
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/cleaning-assignments', cleaningAssignmentsRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/grievances', grievanceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Facilities Management API is running' });
});

// Only listen when run directly (not when imported by Vercel serverless)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
