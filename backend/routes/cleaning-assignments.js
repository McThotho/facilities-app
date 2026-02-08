const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const { put } = require('@vercel/blob');

// Use memory storage for multer (works in serverless)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
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

const toDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get assignments for a facility (with date range)
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const facilityId = Number.parseInt(req.params.facilityId, 10);
    const { startDate, endDate } = req.query;
    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(400).json({ error: 'Invalid facility ID' });
    }

    let query = `
      SELECT
        ca.id,
        ca.facility_id,
        ca.assigned_user_id,
        TO_CHAR(ca.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
        ca.status,
        ca.started_at,
        ca.completed_at,
        ca.created_at,
        u.username as cleaner_name,
        u.email as cleaner_email,
        COUNT(CASE WHEN cci.is_completed = true THEN 1 END)::int as completed_items,
        COUNT(cci.id)::int as total_items
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      LEFT JOIN cleaning_checklist_items cci ON ca.id = cci.assignment_id
      WHERE ca.facility_id = $1
    `;

    const params = [facilityId];

    if (startDate && endDate) {
      query += ` AND ca.scheduled_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY ca.id, ca.facility_id, ca.assigned_user_id, ca.scheduled_date, ca.status, ca.started_at, ca.completed_at, ca.created_at, u.username, u.email ORDER BY ca.scheduled_date DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get single assignment with checklist
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const assignmentResult = await pool.query(`
      SELECT
        ca.*,
        u.username as cleaner_name,
        u.email as cleaner_email
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      WHERE ca.id = $1
    `, [id]);

    const assignment = assignmentResult.rows[0];

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const checklistResult = await pool.query(`
      SELECT * FROM cleaning_checklist_items
      WHERE assignment_id = $1
      ORDER BY area, id
    `, [id]);

    res.json({ ...assignment, checklist: checklistResult.rows });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Create assignment (Manager/Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const facilityId = Number.parseInt(req.body.facilityId, 10);
    const assignedUserId = Number.parseInt(req.body.assignedUserId, 10);
    const scheduledDate = toDateOnly(req.body.scheduledDate);

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can create assignments' });
    }
    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(400).json({ error: 'Invalid facility ID' });
    }
    if (!Number.isInteger(assignedUserId) || assignedUserId <= 0) {
      return res.status(400).json({ error: 'Invalid cleaner selection' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ error: 'Invalid scheduled date' });
    }

    const cleanerInFacilityResult = await pool.query(`
      SELECT 1
      FROM user_facilities uf
      JOIN users u ON u.id = uf.user_id
      WHERE uf.facility_id = $1 AND uf.user_id = $2 AND u.role = 'User'
      LIMIT 1
    `, [facilityId, assignedUserId]);
    if (cleanerInFacilityResult.rowCount === 0) {
      return res.status(400).json({ error: 'Selected cleaner is not assigned to this facility' });
    }

    // Check if assignment already exists for this date
    const existingResult = await pool.query(`
      SELECT id, assigned_user_id FROM cleaning_assignments
      WHERE facility_id = $1 AND scheduled_date = $2
    `, [facilityId, scheduledDate]);

    const existing = existingResult.rows[0];
    let assignmentId;

    if (existing) {
      // Override: Update existing assignment with new user
      await pool.query(`
        UPDATE cleaning_assignments
        SET assigned_user_id = $1
        WHERE id = $2
      `, [assignedUserId, existing.id]);

      assignmentId = existing.id;
    } else {
      // Create new assignment
      const result = await pool.query(`
        INSERT INTO cleaning_assignments (facility_id, assigned_user_id, scheduled_date)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [facilityId, assignedUserId, scheduledDate]);

      assignmentId = result.rows[0].id;
    }

    // Create checklist items from templates (only if new assignment)
    if (!existing) {
      for (const [area, tasks] of Object.entries(CHECKLIST_TEMPLATES)) {
        for (const taskName of tasks) {
          await pool.query(`
            INSERT INTO cleaning_checklist_items (assignment_id, area, task_name)
            VALUES ($1, $2, $3)
          `, [assignmentId, area, taskName]);
        }
      }
    }

    // Fetch the created assignment
    const assignmentResult = await pool.query(`
      SELECT
        ca.id,
        ca.facility_id,
        ca.assigned_user_id,
        TO_CHAR(ca.scheduled_date, 'YYYY-MM-DD') as scheduled_date,
        ca.status,
        ca.started_at,
        ca.completed_at,
        ca.created_at,
        u.username as cleaner_name,
        COUNT(cci.id)::int as total_items
      FROM cleaning_assignments ca
      LEFT JOIN users u ON ca.assigned_user_id = u.id
      LEFT JOIN cleaning_checklist_items cci ON ca.id = cci.assignment_id
      WHERE ca.id = $1
      GROUP BY ca.id, ca.facility_id, ca.assigned_user_id, ca.scheduled_date, ca.status, ca.started_at, ca.completed_at, ca.created_at, u.username
    `, [assignmentId]);

    res.status(201).json(assignmentResult.rows[0]);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Auto-assign cleaners for next 7 days (Manager/Admin only)
router.post('/auto-assign/:facilityId', authenticateToken, async (req, res) => {
  try {
    const facilityId = Number.parseInt(req.params.facilityId, 10);

    // Check if user is Manager or Admin
    if (req.user.role !== 'Manager' && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'Only managers and administrators can auto-assign' });
    }
    if (!Number.isInteger(facilityId) || facilityId <= 0) {
      return res.status(400).json({ error: 'Invalid facility ID' });
    }

    // Get users assigned to this facility
    const usersResult = await pool.query(`
      SELECT u.id, u.username
      FROM users u
      INNER JOIN user_facilities uf ON u.id = uf.user_id
      WHERE uf.facility_id = $1 AND u.role = 'User'
      ORDER BY u.id
    `, [facilityId]);

    const users = usersResult.rows;

    if (users.length === 0) {
      return res.status(400).json({ error: 'No users assigned to this facility' });
    }

    // Find the last assigned user to continue rotation from there
    const lastAssignmentResult = await pool.query(`
      SELECT assigned_user_id
      FROM cleaning_assignments
      WHERE facility_id = $1
      ORDER BY scheduled_date DESC
      LIMIT 1
    `, [facilityId]);

    const lastAssignment = lastAssignmentResult.rows[0];

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
      const scheduledDate = toDateOnly(date);

      // Check if assignment already exists
      const existingResult = await pool.query(`
        SELECT id FROM cleaning_assignments
        WHERE facility_id = $1 AND scheduled_date = $2
      `, [facilityId, scheduledDate]);

      if (existingResult.rows.length === 0) {
        // Round-robin assignment starting from where we left off
        const userIndex = (startIndex + assignmentCount) % users.length;
        const assignedUser = users[userIndex];
        assignmentCount++; // Increment after using

        const result = await pool.query(`
          INSERT INTO cleaning_assignments (facility_id, assigned_user_id, scheduled_date)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [facilityId, assignedUser.id, scheduledDate]);

        const assignmentId = result.rows[0].id;

        // Create checklist items
        for (const [area, tasks] of Object.entries(CHECKLIST_TEMPLATES)) {
          for (const taskName of tasks) {
            await pool.query(`
              INSERT INTO cleaning_checklist_items (assignment_id, area, task_name)
              VALUES ($1, $2, $3)
            `, [assignmentId, area, taskName]);
          }
        }

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
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const assignmentResult = await pool.query('SELECT * FROM cleaning_assignments WHERE id = $1', [id]);
    const assignment = assignmentResult.rows[0];

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only assigned user or admin can update
    if (assignment.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update your own assignments' });
    }

    if (status === 'in_progress' && !assignment.started_at) {
      await pool.query(`UPDATE cleaning_assignments SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    } else if (status === 'completed') {
      await pool.query(`UPDATE cleaning_assignments SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, id]);
    } else {
      await pool.query(`UPDATE cleaning_assignments SET status = $1 WHERE id = $2`, [status, id]);
    }

    const updatedResult = await pool.query('SELECT * FROM cleaning_assignments WHERE id = $1', [id]);
    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Toggle checklist item
router.patch('/checklist/:itemId/toggle', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const itemResult = await pool.query(`
      SELECT cci.*, ca.assigned_user_id
      FROM cleaning_checklist_items cci
      JOIN cleaning_assignments ca ON cci.assignment_id = ca.id
      WHERE cci.id = $1
    `, [itemId]);

    const item = itemResult.rows[0];

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Only assigned user can toggle
    if (item.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only update your own checklist' });
    }

    const newStatus = !item.is_completed;

    if (newStatus) {
      await pool.query(`
        UPDATE cleaning_checklist_items
        SET is_completed = true, completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [itemId]);
    } else {
      await pool.query(`
        UPDATE cleaning_checklist_items
        SET is_completed = false, completed_at = NULL, photo_url = NULL
        WHERE id = $1
      `, [itemId]);
    }

    const updatedResult = await pool.query('SELECT * FROM cleaning_checklist_items WHERE id = $1', [itemId]);
    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error toggling checklist item:', error);
    res.status(500).json({ error: 'Failed to toggle checklist item' });
  }
});

// Upload photo for checklist item
router.post('/checklist/:itemId/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Photo is required' });
    }

    const itemResult = await pool.query(`
      SELECT cci.*, ca.assigned_user_id
      FROM cleaning_checklist_items cci
      JOIN cleaning_assignments ca ON cci.assignment_id = ca.id
      WHERE cci.id = $1
    `, [itemId]);

    const item = itemResult.rows[0];

    if (!item) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    // Only assigned user can upload
    if (item.assigned_user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only upload to your own checklist' });
    }

    const filename = `cleaning/checklist-${Date.now()}-${Math.round(Math.random() * 1E9)}.${req.file.mimetype.split('/')[1]}`;
    const blob = await put(filename, req.file.buffer, { access: 'public' });

    await pool.query(`
      UPDATE cleaning_checklist_items
      SET photo_url = $1, is_completed = true, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [blob.url, itemId]);

    const updatedResult = await pool.query('SELECT * FROM cleaning_checklist_items WHERE id = $1', [itemId]);
    res.json(updatedResult.rows[0]);
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

module.exports = router;
