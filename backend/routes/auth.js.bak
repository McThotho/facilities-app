const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

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
      email: user.email,
      role: user.role
    }
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Register new user (Admin only in production, open for demo)
router.post('/register', (req, res) => {
  const { emp_id, username, email, contact, password, role, facility_id } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role are required' });
  }

  if (!['Administrator', 'Manager', 'User'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Generate default password if not provided
  const finalPassword = password || 'password123';
  const hashedPassword = bcrypt.hashSync(finalPassword, 10);

  // Generate default email if not provided
  const finalEmail = email || `${username.toLowerCase().replace(/\s+/g, '_')}@facilities.com`;

  try {
    const result = db.prepare(`
      INSERT INTO users (emp_id, username, email, contact, password, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(emp_id || null, username, finalEmail, contact || null, hashedPassword, role);

    // If facility_id is provided, assign user to facility
    if (facility_id) {
      db.prepare(`
        INSERT OR IGNORE INTO user_facilities (user_id, facility_id)
        VALUES (?, ?)
      `).run(result.lastInsertRowid, facility_id);
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: result.lastInsertRowid
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Username, email, or employee ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Get all users (Admin and Manager only)
router.get('/users', authenticateToken, (req, res) => {
  if (!['Administrator', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const users = db.prepare(`
    SELECT
      u.id,
      u.emp_id,
      u.username,
      u.email,
      u.contact,
      u.role,
      u.created_at,
      GROUP_CONCAT(f.name) as facilities
    FROM users u
    LEFT JOIN user_facilities uf ON u.id = uf.user_id
    LEFT JOIN facilities f ON uf.facility_id = f.id
    GROUP BY u.id
  `).all();
  res.json(users);
});

// Update user (Admin and Manager only)
router.put('/users/:id', authenticateToken, (req, res) => {
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
    db.prepare(`
      UPDATE users
      SET emp_id = ?, username = ?, contact = ?, role = ?
      WHERE id = ?
    `).run(emp_id || null, username, contact || null, role, id);

    // Update facility assignment
    if (facility_id) {
      db.prepare('DELETE FROM user_facilities WHERE user_id = ?').run(id);
      db.prepare(`
        INSERT INTO user_facilities (user_id, facility_id)
        VALUES (?, ?)
      `).run(id, facility_id);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Username or employee ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// Delete user (Admin and Manager only)
router.delete('/users/:id', authenticateToken, (req, res) => {
  if (!['Administrator', 'Manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { id } = req.params;

  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
