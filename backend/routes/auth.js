const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        must_change_password: user.must_change_password === 1
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, full_name, email, role, must_change_password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    res.json({
      ...user,
      must_change_password: user.must_change_password === 1
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Helper function to generate username from name and emp_id
function generateUsername(fullName, empId) {
  // Extract last name (last word in full name)
  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  return `${lastName}${empId}`;
}

// Register new user (Admin only in production, open for demo)
router.post('/register', async (req, res) => {
  const { emp_id, username: providedName, email, contact, password, role, facility_id } = req.body;

  if (!providedName || !role || !emp_id) {
    return res.status(400).json({ error: 'Name, Employee ID, and role are required' });
  }

  if (!['Administrator', 'Manager', 'User'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Auto-generate username from last name + emp_id
  const generatedUsername = generateUsername(providedName, emp_id);

  // Set default password to 'welcome123' and mark for password change
  const finalPassword = password || 'welcome123';
  const hashedPassword = bcrypt.hashSync(finalPassword, 10);

  // Generate default email if not provided
  const finalEmail = email || `${generatedUsername}@facilities.com`;

  try {
    const result = await pool.query(`
      INSERT INTO users (emp_id, username, full_name, email, contact, password, role, must_change_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [emp_id, generatedUsername, providedName, finalEmail, contact || null, hashedPassword, role, 1]);

    const userId = result.rows[0].id;

    // If facility_id is provided, assign user to facility
    if (facility_id) {
      await pool.query(`
        INSERT INTO user_facilities (user_id, facility_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userId, facility_id]);
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: userId,
      generatedUsername: generatedUsername,
      defaultPassword: 'welcome123'
    });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({ error: 'Username, email, or employee ID already exists' });
    } else {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Get all users (Admin and Manager only)
router.get('/users', authenticateToken, async (req, res) => {
  if (!['Administrator', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.emp_id,
        u.username,
        u.full_name,
        u.email,
        u.contact,
        u.role,
        u.created_at,
        STRING_AGG(f.name, ', ') as facilities
      FROM users u
      LEFT JOIN user_facilities uf ON u.id = uf.user_id
      LEFT JOIN facilities f ON uf.facility_id = f.id
      GROUP BY u.id, u.emp_id, u.username, u.full_name, u.email, u.contact, u.role, u.created_at
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user (Admin and Manager only)
router.put('/users/:id', authenticateToken, async (req, res) => {
  if (!['Administrator', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { id } = req.params;
  const { emp_id, username, contact, role, facility_id } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  if (!['Administrator', 'Manager', 'User'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await pool.query(`
      UPDATE users
      SET emp_id = $1, username = $2, contact = $3, role = $4
      WHERE id = $5
    `, [emp_id || null, username, contact || null, role, id]);

    // Update facility assignment
    if (facility_id) {
      await pool.query('DELETE FROM user_facilities WHERE user_id = $1', [id]);
      await pool.query(`
        INSERT INTO user_facilities (user_id, facility_id)
        VALUES ($1, $2)
      `, [id, facility_id]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({ error: 'Username or employee ID already exists' });
    } else {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// Delete user (Admin and Manager only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
  if (!['Administrator', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { id } = req.params;

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  // Validate new password strength (min 8 chars, uppercase, lowercase, number)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
    });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await pool.query(`
      UPDATE users
      SET password = $1, must_change_password = 0
      WHERE id = $2
    `, [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
