const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get messages for a facility
router.get('/facility/:facilityId', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  const messages = db.prepare(`
    SELECT cm.*, u.username
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.facility_id = ?
    ORDER BY cm.created_at DESC
    LIMIT ?
  `).all(req.params.facilityId, limit);

  res.json(messages.reverse());
});

// Send message
router.post('/', authenticateToken, (req, res) => {
  const { facilityId, message } = req.body;

  if (!facilityId || !message || message.trim() === '') {
    return res.status(400).json({ error: 'Facility ID and message required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO chat_messages (facility_id, user_id, message)
      VALUES (?, ?, ?)
    `).run(facilityId, req.user.id, message.trim());

    const newMessage = db.prepare(`
      SELECT cm.*, u.username
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete message (only by sender)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists and belongs to user
    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== req.user.id && req.user.role !== 'Administrator') {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
