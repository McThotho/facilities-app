const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const { put } = require('@vercel/blob');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Get all grievances for a facility
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const { facilityId } = req.params;
    const result = await pool.query(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.facility_id = $1
      ORDER BY g.created_at DESC
    `, [facilityId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});

// Create a new grievance (with optional voice recording)
router.post('/', authenticateToken, upload.single('voice'), async (req, res) => {
  try {
    const { facilityId, category, remarks } = req.body;
    const requesterId = req.user.id;
    let voiceUrl = null;

    // Upload voice file to Vercel Blob if provided
    if (req.file) {
      const filename = `grievances/voice-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });
      voiceUrl = blob.url;
    }

    const result = await pool.query(`
      INSERT INTO grievances (facility_id, requester_id, category, remarks, voice_url, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [facilityId, requesterId, category, remarks, voiceUrl]);

    const grievanceResult = await pool.query(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(grievanceResult.rows[0]);
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

// Pick a grievance (Manager/Admin only)
router.post('/:id/pick', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pickerId = req.user.id;

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can pick grievances' });
    }

    await pool.query(`
      UPDATE grievances
      SET picker_id = $1, status = 'picked', picked_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [pickerId, id]);

    const grievanceResult = await pool.query(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = $1
    `, [id]);

    res.json(grievanceResult.rows[0]);
  } catch (error) {
    console.error('Error picking grievance:', error);
    res.status(500).json({ error: 'Failed to pick grievance' });
  }
});

// Update grievance status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Only picker or admin can update status
    const grievanceResult = await pool.query('SELECT * FROM grievances WHERE id = $1', [id]);
    const grievance = grievanceResult.rows[0];

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.picker_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update grievances you have picked' });
    }

    if (status === 'working') {
      await pool.query(`UPDATE grievances SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    } else if (status === 'completed') {
      await pool.query(`UPDATE grievances SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    } else {
      await pool.query(`UPDATE grievances SET status = $1 WHERE id = $2`, [status, id]);
    }

    const updatedGrievanceResult = await pool.query(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = $1
    `, [id]);

    res.json(updatedGrievanceResult.rows[0]);
  } catch (error) {
    console.error('Error updating grievance:', error);
    res.status(500).json({ error: 'Failed to update grievance' });
  }
});

module.exports = router;
