const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all facilities (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === 'User') {
      // Users only see their assigned facilities
      result = await pool.query(`
        SELECT f.* FROM facilities f
        INNER JOIN user_facilities uf ON f.id = uf.facility_id
        WHERE uf.user_id = $1
        ORDER BY f.name
      `, [req.user.id]);
    } else {
      // Admins and Managers see all facilities
      result = await pool.query('SELECT * FROM facilities ORDER BY name');
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// Get single facility
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM facilities WHERE id = $1', [req.params.id]);
    const facility = result.rows[0];

    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json(facility);
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

// Create facility (Admin/Manager only)
router.post('/', authenticateToken, authorizeRoles('Administrator', 'Manager'), async (req, res) => {
  const { name, location, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Facility name required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO facilities (name, location, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, location || '', description || '']);

    res.status(201).json({
      message: 'Facility created successfully',
      facilityId: result.rows[0].id
    });
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// Update facility (Admin/Manager only)
router.put('/:id', authenticateToken, authorizeRoles('Administrator', 'Manager'), async (req, res) => {
  const { name, location, description } = req.body;

  try {
    await pool.query(`
      UPDATE facilities
      SET name = $1, location = $2, description = $3
      WHERE id = $4
    `, [name, location, description, req.params.id]);

    res.json({ message: 'Facility updated successfully' });
  } catch (error) {
    console.error('Update facility error:', error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// Delete facility (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('Administrator'), async (req, res) => {
  try {
    await pool.query('DELETE FROM facilities WHERE id = $1', [req.params.id]);
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error('Delete facility error:', error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// Assign user to facility (Admin/Manager only)
router.post('/:id/assign-user', authenticateToken, authorizeRoles('Administrator', 'Manager'), async (req, res) => {
  const { userId } = req.body;

  try {
    await pool.query(`
      INSERT INTO user_facilities (user_id, facility_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, req.params.id]);

    res.json({ message: 'User assigned to facility' });
  } catch (error) {
    console.error('Assign user error:', error);
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// Get users assigned to facility
router.get('/:id/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.email, u.role
      FROM users u
      JOIN user_facilities uf ON u.id = uf.user_id
      WHERE uf.facility_id = $1
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get facility users error:', error);
    res.status(500).json({ error: 'Failed to fetch facility users' });
  }
});

module.exports = router;
