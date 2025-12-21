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
      role: user.role,
      must_change_password: user.must_change_password === 1
    }
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Helper function to generate username from name and emp_id
function generateUsername(fullName, empId) {
  // Extract last name (last word in full name)
  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  return `${lastName}${empId}`;
}

// Register new user (Admin only in production, open for demo)
router.post('/register', (req, res) => {
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
    const result = db.prepare(`
      INSERT INTO users (emp_id, username, email, contact, password, role, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(emp_id, generatedUsername, finalEmail, contact || null, hashedPassword, role, 1);

    // If facility_id is provided, assign user to facility
    if (facility_id) {
      db.prepare(`
        INSERT OR IGNORE INTO user_facilities (user_id, facility_id)
        VALUES (?, ?)
      `).run(result.lastInsertRowid, facility_id);
    }

    res.status(201).json({
      message: 'User created successfully',
      userId: result.lastInsertRowid,
      generatedUsername: generatedUsername,
      defaultPassword: 'welcome123'
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

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
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
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.prepare(`
      UPDATE users
      SET password = ?, must_change_password = 0
      WHERE id = ?
    `).run(hashedPassword, req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
