const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all facilities (filtered by role)
router.get('/', authenticateToken, (req, res) => {
  let facilities;

  if (req.user.role === 'User') {
    // Users only see their assigned facilities
    facilities = db.prepare(`
      SELECT f.* FROM facilities f
      INNER JOIN user_facilities uf ON f.id = uf.facility_id
      WHERE uf.user_id = ?
      ORDER BY f.name
    `).all(req.user.id);
  } else {
    // Admins and Managers see all facilities
    facilities = db.prepare('SELECT * FROM facilities ORDER BY name').all();
  }

  res.json(facilities);
});

// Get single facility
router.get('/:id', authenticateToken, (req, res) => {
  const facility = db.prepare('SELECT * FROM facilities WHERE id = ?').get(req.params.id);

  if (!facility) {
    return res.status(404).json({ error: 'Facility not found' });
  }

  res.json(facility);
});

// Create facility (Admin/Manager only)
router.post('/', authenticateToken, authorizeRoles('Administrator', 'Manager'), (req, res) => {
  const { name, location, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Facility name required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO facilities (name, location, description)
      VALUES (?, ?, ?)
    `).run(name, location || '', description || '');

    res.status(201).json({
      message: 'Facility created successfully',
      facilityId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// Update facility (Admin/Manager only)
router.put('/:id', authenticateToken, authorizeRoles('Administrator', 'Manager'), (req, res) => {
  const { name, location, description } = req.body;

  try {
    db.prepare(`
      UPDATE facilities
      SET name = ?, location = ?, description = ?
      WHERE id = ?
    `).run(name, location, description, req.params.id);

    res.json({ message: 'Facility updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// Delete facility (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('Administrator'), (req, res) => {
  try {
    db.prepare('DELETE FROM facilities WHERE id = ?').run(req.params.id);
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// Assign user to facility (Admin/Manager only)
router.post('/:id/assign-user', authenticateToken, authorizeRoles('Administrator', 'Manager'), (req, res) => {
  const { userId } = req.body;

  try {
    db.prepare(`
      INSERT OR IGNORE INTO user_facilities (user_id, facility_id)
      VALUES (?, ?)
    `).run(userId, req.params.id);

    res.json({ message: 'User assigned to facility' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// Get users assigned to facility
router.get('/:id/users', authenticateToken, (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role
    FROM users u
    JOIN user_facilities uf ON u.id = uf.user_id
    WHERE uf.facility_id = ?
  `).all(req.params.id);

  res.json(users);
});

module.exports = router;
