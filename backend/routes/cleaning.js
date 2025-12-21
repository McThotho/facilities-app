const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database');
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
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  const tasks = db.prepare(`
    SELECT ct.*, u.username as assigned_user_name
    FROM cleaning_tasks ct
    LEFT JOIN users u ON ct.assigned_user_id = u.id
    WHERE ct.facility_id = ?
    ORDER BY ct.scheduled_date DESC, ct.created_at DESC
  `).all(req.params.facilityId);

  res.json(tasks);
});

// Get today's cleaning tasks for a facility
router.get('/facility/:facilityId/today', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const tasks = db.prepare(`
    SELECT ct.*, u.username as assigned_user_name
    FROM cleaning_tasks ct
    LEFT JOIN users u ON ct.assigned_user_id = u.id
    WHERE ct.facility_id = ? AND ct.scheduled_date = ?
    ORDER BY ct.status, ct.room_name
  `).all(req.params.facilityId, today);

  res.json(tasks);
});

// Create cleaning task
router.post('/', authenticateToken, (req, res) => {
  const { facilityId, roomName, assignedUserId, scheduledDate } = req.body;

  if (!facilityId || !roomName || !scheduledDate) {
    return res.status(400).json({ error: 'Facility, room name, and scheduled date required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO cleaning_tasks (facility_id, room_name, assigned_user_id, scheduled_date)
      VALUES (?, ?, ?, ?)
    `).run(facilityId, roomName, assignedUserId || null, scheduledDate);

    res.status(201).json({
      message: 'Cleaning task created successfully',
      taskId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create cleaning task' });
  }
});

// Complete cleaning task with photo
router.post('/:id/complete', authenticateToken, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Photo is required to complete cleaning task' });
  }

  const photoUrl = '/uploads/' + req.file.filename;

  try {
    db.prepare(`
      UPDATE cleaning_tasks
      SET status = 'completed', photo_url = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(photoUrl, req.params.id);

    res.json({
      message: 'Cleaning task completed successfully',
      photoUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete cleaning task' });
  }
});

// Delete cleaning task
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM cleaning_tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Cleaning task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cleaning task' });
  }
});

module.exports = router;
