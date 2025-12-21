const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all visits for a facility
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  const visits = db.prepare(`
    SELECT v.*, u.username as assigned_user_name
    FROM visits v
    LEFT JOIN users u ON v.assigned_user_id = u.id
    WHERE v.facility_id = ?
    ORDER BY v.scheduled_date DESC, v.scheduled_time DESC
  `).all(req.params.facilityId);

  res.json(visits);
});

// Create visit
router.post('/', authenticateToken, (req, res) => {
  const { facilityId, scheduledDate, scheduledTime, assignedUserId, notes } = req.body;

  if (!facilityId || !scheduledDate) {
    return res.status(400).json({ error: 'Facility and scheduled date required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO visits (facility_id, scheduled_date, scheduled_time, assigned_user_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(facilityId, scheduledDate, scheduledTime || null, assignedUserId || null, notes || '');

    res.status(201).json({
      message: 'Visit scheduled successfully',
      visitId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule visit' });
  }
});

// Update visit status
router.put('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;

  if (!['pending', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE visits
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).run(status, completedAt, req.params.id);

    res.json({ message: 'Visit status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update visit status' });
  }
});

// Update visit
router.put('/:id', authenticateToken, (req, res) => {
  const { scheduledDate, scheduledTime, assignedUserId, notes, status } = req.body;

  try {
    db.prepare(`
      UPDATE visits
      SET scheduled_date = ?, scheduled_time = ?, assigned_user_id = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(scheduledDate, scheduledTime, assignedUserId, notes, status, req.params.id);

    res.json({ message: 'Visit updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update visit' });
  }
});

// Delete visit
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM visits WHERE id = ?').run(req.params.id);
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete visit' });
  }
});

module.exports = router;
