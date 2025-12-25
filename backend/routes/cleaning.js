const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cleaning-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all cleaning tasks for a facility
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ct.*, u.username as assigned_user_name
      FROM cleaning_tasks ct
      LEFT JOIN users u ON ct.assigned_user_id = u.id
      WHERE ct.facility_id = $1
      ORDER BY ct.scheduled_date DESC, ct.created_at DESC
    `, [req.params.facilityId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get cleaning tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch cleaning tasks' });
  }
});

// Get today's cleaning tasks for a facility
router.get('/facility/:facilityId/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT ct.*, u.username as assigned_user_name
      FROM cleaning_tasks ct
      LEFT JOIN users u ON ct.assigned_user_id = u.id
      WHERE ct.facility_id = $1 AND ct.scheduled_date = $2
      ORDER BY ct.status, ct.room_name
    `, [req.params.facilityId, today]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get today cleaning tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s cleaning tasks' });
  }
});

// Create cleaning task
router.post('/', authenticateToken, async (req, res) => {
  const { facilityId, roomName, assignedUserId, scheduledDate } = req.body;

  if (!facilityId || !roomName || !scheduledDate) {
    return res.status(400).json({ error: 'Facility, room name, and scheduled date required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO cleaning_tasks (facility_id, room_name, assigned_user_id, scheduled_date)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [facilityId, roomName, assignedUserId || null, scheduledDate]);

    res.status(201).json({
      message: 'Cleaning task created successfully',
      taskId: result.rows[0].id
    });
  } catch (error) {
    console.error('Create cleaning task error:', error);
    res.status(500).json({ error: 'Failed to create cleaning task' });
  }
});

// Complete cleaning task with photo
router.post('/:id/complete', authenticateToken, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Photo is required to complete cleaning task' });
  }

  const photoUrl = '/uploads/' + req.file.filename;

  try {
    await pool.query(`
      UPDATE cleaning_tasks
      SET status = 'completed', photo_url = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [photoUrl, req.params.id]);

    res.json({
      message: 'Cleaning task completed successfully',
      photoUrl
    });
  } catch (error) {
    console.error('Complete cleaning task error:', error);
    res.status(500).json({ error: 'Failed to complete cleaning task' });
  }
});

// Delete cleaning task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM cleaning_tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cleaning task deleted successfully' });
  } catch (error) {
    console.error('Delete cleaning task error:', error);
    res.status(500).json({ error: 'Failed to delete cleaning task' });
  }
});

module.exports = router;
