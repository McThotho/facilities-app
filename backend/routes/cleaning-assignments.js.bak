const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/cleaning');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cleaning-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Predefined checklist templates
const CHECKLIST_TEMPLATES = {
  living_area: [
    'Dust all surfaces',
    'Vacuum or mop floors',
    'Clean windows and mirrors',
    'Empty trash bins',
    'Organize furniture',
    'Clean light fixtures'
  ],
  bathroom: [
    'Clean toilet',
    'Clean sink and counter',
    'Clean shower/bathtub',
    'Clean mirrors',
    'Mop floor',
    'Empty trash',
    'Restock supplies'
  ],
  bedroom: [
    'Change bed linens',
    'Dust furniture',
    'Vacuum or mop floors',
    'Organize items',
    'Empty trash',
    'Clean mirrors'
  ]
};

// Get assignments for a facility (with date range)
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  try {
    const { facilityId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT
        ca.*,
        u.username as cleaner_name,
        u.email as cleaner_email,
        COUNT(CASE WHEN cci.is_completed = 1 THEN 1 END) as completed_items,
        COUNT(cci.id) as total_items
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      LEFT JOIN cleaning_checklist_items cci ON ca.id = cci.assignment_id
      WHERE ca.facility_id = ?
    `;

    const params = [facilityId];

    if (startDate && endDate) {
      query += ` AND ca.scheduled_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY ca.id ORDER BY ca.scheduled_date DESC`;

    const assignments = db.prepare(query).all(...params);

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get single assignment with checklist
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const assignment = db.prepare(`
      SELECT
        ca.*,
        u.username as cleaner_name,
        u.email as cleaner_email
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      WHERE ca.id = ?
    `).get(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const checklist = db.prepare(`
      SELECT * FROM cleaning_checklist_items
      WHERE assignment_id = ?
      ORDER BY area, id
    `).all(id);

    res.json({ ...assignment, checklist });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Create assignment (Manager/Admin only)
router.post('/', authenticateToken, (req, res) => {
  try {
    const { facilityId, assignedUserId, scheduledDate } = req.body;

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can create assignments' });
    }

    // Check if assignment already exists for this date
    const existing = db.prepare(`
      SELECT id FROM cleaning_assignments
      WHERE facility_id = ? AND scheduled_date = ?
    `).get(facilityId, scheduledDate);

    if (existing) {
      return res.status(400).json({ error: 'Assignment already exists for this date' });
    }

    // Create assignment
    const result = db.prepare(`
      INSERT INTO cleaning_assignments (facility_id, assigned_user_id, scheduled_date)
      VALUES (?, ?, ?)
    `).run(facilityId, assignedUserId, scheduledDate);

    const assignmentId = result.lastInsertRowid;

    // Create checklist items from templates
    const insertChecklist = db.prepare(`
      INSERT INTO cleaning_checklist_items (assignment_id, area, task_name)
      VALUES (?, ?, ?)
    `);

    Object.entries(CHECKLIST_TEMPLATES).forEach(([area, tasks]) => {
      tasks.forEach(taskName => {
        insertChecklist.run(assignmentId, area, taskName);
      });
    });

    // Fetch the created assignment
    const assignment = db.prepare(`
      SELECT
        ca.*,
        u.username as cleaner_name,
        COUNT(cci.id) as total_items
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      LEFT JOIN cleaning_checklist_items cci ON ca.id = cci.assignment_id
      WHERE ca.id = ?
      GROUP BY ca.id
    `).get(assignmentId);

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Auto-assign cleaners for next 7 days (Manager/Admin only)
router.post('/auto-assign/:facilityId', authenticateToken, (req, res) => {
  try {
    const { facilityId } = req.params;

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can auto-assign' });
    }

    // Get users assigned to this facility
    const users = db.prepare(`
      SELECT u.id, u.username
      FROM users u
      INNER JOIN user_facilities uf ON u.id = uf.user_id
      WHERE uf.facility_id = ? AND u.role = 'User'
      ORDER BY u.id
    `).all(facilityId);

    if (users.length === 0) {
      return res.status(400).json({ error: 'No users assigned to this facility' });
    }

    // Find the last assigned user to continue rotation from there
    const lastAssignment = db.prepare(`
      SELECT assigned_user_id
      FROM cleaning_assignments
      WHERE facility_id = ?
      ORDER BY scheduled_date DESC
      LIMIT 1
    `).get(facilityId);

    // Determine starting index for rotation
    let startIndex = 0;
    if (lastAssignment) {
      const lastUserIndex = users.findIndex(u => u.id === lastAssignment.assigned_user_id);
      if (lastUserIndex !== -1) {
        startIndex = (lastUserIndex + 1) % users.length;
      }
    }

    const assignments = [];
    const today = new Date();
    let assignmentCount = 0; // Track how many new assignments we've made

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const scheduledDate = date.toISOString().split('T')[0];

      // Check if assignment already exists
      const existing = db.prepare(`
        SELECT id FROM cleaning_assignments
        WHERE facility_id = ? AND scheduled_date = ?
      `).get(facilityId, scheduledDate);

      if (!existing) {
        // Round-robin assignment starting from where we left off
        const userIndex = (startIndex + assignmentCount) % users.length;
        const assignedUser = users[userIndex];
        assignmentCount++; // Increment after using

        const result = db.prepare(`
          INSERT INTO cleaning_assignments (facility_id, assigned_user_id, scheduled_date)
          VALUES (?, ?, ?)
        `).run(facilityId, assignedUser.id, scheduledDate);

        const assignmentId = result.lastInsertRowid;

        // Create checklist items
        const insertChecklist = db.prepare(`
          INSERT INTO cleaning_checklist_items (assignment_id, area, task_name)
          VALUES (?, ?, ?)
        `);

        Object.entries(CHECKLIST_TEMPLATES).forEach(([area, tasks]) => {
          tasks.forEach(taskName => {
            insertChecklist.run(assignmentId, area, taskName);
          });
        });

        assignments.push({
          id: assignmentId,
          scheduled_date: scheduledDate,
          cleaner_name: assignedUser.username
        });
      }
    }

    res.json({ created: assignments.length, assignments });
  } catch (error) {
    console.error('Error auto-assigning:', error);
    res.status(500).json({ error: 'Failed to auto-assign' });
  }
});

// Update assignment status
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assignment = db.prepare('SELECT * FROM cleaning_assignments WHERE id = ?').get(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only assigned user or admin can update
    if (assignment.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update your own assignments' });
    }

    const updates = { status };
    if (status === 'in_progress' && !assignment.started_at) {
      db.prepare(`UPDATE cleaning_assignments SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    } else if (status === 'completed') {
      db.prepare(`UPDATE cleaning_assignments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
    } else {
      db.prepare(`UPDATE cleaning_assignments SET status = ? WHERE id = ?`).run(status, id);
    }

    const updated = db.prepare('SELECT * FROM cleaning_assignments WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Toggle checklist item
router.patch('/checklist/:itemId/toggle', authenticateToken, (req, res) => {
  try {
    const { itemId } = req.params;

    const item = db.prepare(`
      SELECT cci.*, ca.assigned_user_id
      FROM cleaning_checklist_items cci
      JOIN cleaning_assignments ca ON cci.assignment_id = ca.id
      WHERE cci.id = ?
    `).get(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Only assigned user can toggle
    if (item.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update your own checklist' });
    }

    const newStatus = !item.is_completed;

    if (newStatus) {
      db.prepare(`
        UPDATE cleaning_checklist_items
        SET is_completed = 1, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(itemId);
    } else {
      db.prepare(`
        UPDATE cleaning_checklist_items
        SET is_completed = 0, completed_at = NULL, photo_url = NULL
        WHERE id = ?
      `).run(itemId);
    }

    const updated = db.prepare('SELECT * FROM cleaning_checklist_items WHERE id = ?').get(itemId);
    res.json(updated);
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ error: 'Failed to toggle checklist item' });
  }
});

// Upload photo for checklist item
router.post('/checklist/:itemId/photo', authenticateToken, upload.single('photo'), (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const item = db.prepare(`
      SELECT cci.*, ca.assigned_user_id
      FROM cleaning_checklist_items cci
      JOIN cleaning_assignments ca ON cci.assignment_id = ca.id
      WHERE cci.id = ?
    `).get(itemId);

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Only assigned user can upload
    if (item.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only upload to your own checklist' });
    }

    const photoUrl = `/uploads/cleaning/${req.file.filename}`;

    db.prepare(`
      UPDATE cleaning_checklist_items
      SET photo_url = ?, is_completed = 1, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(photoUrl, itemId);

    const updated = db.prepare('SELECT * FROM cleaning_checklist_items WHERE id = ?').get(itemId);
    res.json(updated);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

module.exports = router;
