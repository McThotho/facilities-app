const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get all grievances for a facility
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  try {
    const { facilityId } = req.params;
    const grievances = db.prepare(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.facility_id = ?
      ORDER BY g.created_at DESC
    `).all(facilityId);

    res.json(grievances);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ error: 'Failed to fetch grievances' });
  }
});

// Create a new grievance
router.post('/', authenticateToken, (req, res) => {
  try {
    const { facilityId, category, remarks } = req.body;
    const requesterId = req.user.id;

    const result = db.prepare(`
      INSERT INTO grievances (facility_id, requester_id, category, remarks, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(facilityId, requesterId, category, remarks);

    const grievance = db.prepare(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(grievance);
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

// Pick a grievance (Manager/Admin only)
router.post('/:id/pick', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const pickerId = req.user.id;

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can pick grievances' });
    }

    db.prepare(`
      UPDATE grievances
      SET picker_id = ?, status = 'picked', picked_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(pickerId, id);

    const grievance = db.prepare(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = ?
    `).get(id);

    res.json(grievance);
  } catch (error) {
    console.error('Error picking grievance:', error);
    res.status(500).json({ error: 'Failed to pick grievance' });
  }
});

// Update grievance status
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Only picker or admin can update status
    const grievance = db.prepare('SELECT * FROM grievances WHERE id = ?').get(id);

    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.picker_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update grievances you have picked' });
    }

    const updates = { status };
    if (status === 'working') {
      db.prepare(`UPDATE grievances SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    } else if (status === 'completed') {
      db.prepare(`UPDATE grievances SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    } else {
      db.prepare(`UPDATE grievances SET status = ? WHERE id = ?`).run(status, id);
    }

    const updatedGrievance = db.prepare(`
      SELECT g.*,
             u1.username as requester_name,
             u2.username as picker_name
      FROM grievances g
      LEFT JOIN users u1 ON g.requester_id = u1.id
      LEFT JOIN users u2 ON g.picker_id = u2.id
      WHERE g.id = ?
    `).get(id);

    res.json(updatedGrievance);
  } catch (error) {
    console.error('Error updating grievance:', error);
    res.status(500).json({ error: 'Failed to update grievance' });
  }
});

module.exports = router;
