const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get messages for a facility
router.get('/facility/:facilityId', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(`
      SELECT cm.*, u.username
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.facility_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2
    `, [req.params.facilityId, limit]);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/', authenticateToken, async (req, res) => {
  const { facilityId, message } = req.body;

  if (!facilityId || !message || message.trim() === '') {
    return res.status(400).json({ error: 'Facility ID and message required' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO chat_messages (facility_id, user_id, message)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [facilityId, req.user.id, message.trim()]);

    const newMessageResult = await pool.query(`
      SELECT cm.*, u.username
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(newMessageResult.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete message (only by sender)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists and belongs to user
    const messageResult = await pool.query('SELECT * FROM chat_messages WHERE id = $1', [id]);
    const message = messageResult.rows[0];

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await pool.query('DELETE FROM chat_messages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
