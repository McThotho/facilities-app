const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all visits for a facility
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, u.username as assigned_user_name
      FROM visits v
      LEFT JOIN users u ON v.assigned_user_id = u.id
      WHERE v.facility_id = $1
      ORDER BY v.scheduled_date DESC, v.scheduled_time DESC
    `, [req.params.facilityId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get visits error:', error);
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Create visit
router.post('/', authenticateToken, async (req, res) => {
  const { facilityId, scheduledDate, scheduledTime, assignedUserId, notes } = req.body;

  if (!facilityId || !scheduledDate) {
    return res.status(400).json({ error: 'Facility and scheduled date required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO visits (facility_id, scheduled_date, scheduled_time, assigned_user_id, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [facilityId, scheduledDate, scheduledTime || null, assignedUserId || null, notes || '']);

    res.status(201).json({
      message: 'Visit scheduled successfully',
      visitId: result.rows[0].id
    });
  } catch (error) {
    console.error('Create visit error:', error);
    res.status(500).json({ error: 'Failed to schedule visit' });
  }
});

// Update visit status
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;

  if (!['pending', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await pool.query(`
      UPDATE visits
      SET status = $1, completed_at = $2
      WHERE id = $3
    `, [status, completedAt, req.params.id]);

    res.json({ message: 'Visit status updated successfully' });
  } catch (error) {
    console.error('Update visit status error:', error);
    res.status(500).json({ error: 'Failed to update visit status' });
  }
});

// Update visit
router.put('/:id', authenticateToken, async (req, res) => {
  const { scheduledDate, scheduledTime, assignedUserId, notes, status } = req.body;

  try {
    await pool.query(`
      UPDATE visits
      SET scheduled_date = $1, scheduled_time = $2, assigned_user_id = $3, notes = $4, status = $5
      WHERE id = $6
    `, [scheduledDate, scheduledTime, assignedUserId, notes, status, req.params.id]);

    res.json({ message: 'Visit updated successfully' });
  } catch (error) {
    console.error('Update visit error:', error);
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete visit
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM visits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Delete visit error:', error);
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

module.exports = router;
