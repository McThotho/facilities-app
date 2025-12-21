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
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
