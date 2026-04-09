const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { canAccessMatter, requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/messages/matter/:matterId
  router.get('/matter/:matterId', authenticateToken, (req, res) => {
    const matterId = req.params.matterId;

    // Billing and reception cannot access messages
    if (['billing', 'reception'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Message access not permitted for your role' });
    }

    if (!canAccessMatter(db, req.user, matterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = db.prepare(`
      SELECT msg.*, u.full_name as sender_name, u.role as sender_role
      FROM messages msg
      JOIN users u ON msg.sender_id = u.user_id
      WHERE msg.matter_id = ?
      ORDER BY msg.sent_at ASC
    `).all(matterId);

    // Mark as read for the recipient
    db.prepare(`
      UPDATE messages SET is_read = 1
      WHERE matter_id = ? AND sender_id != ? AND is_read = 0
    `).run(matterId, req.user.user_id);

    res.json(messages);
  });

  // POST /api/messages — Send message
  router.post('/', authenticateToken, (req, res) => {
    const { matter_id, content } = req.body;

    if (!matter_id || !content) {
      return res.status(400).json({ error: 'matter_id and content are required' });
    }
    if (content.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
    }

    if (['billing', 'reception'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Messaging not permitted for your role' });
    }

    if (!canAccessMatter(db, req.user, matter_id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const message_id = uuidv4();
    db.prepare(`
      INSERT INTO messages (message_id, matter_id, sender_id, content)
      VALUES (?, ?, ?, ?)
    `).run(message_id, matter_id, req.user.user_id, content);

    // Create notification for relevant parties
    const matter = db.prepare('SELECT * FROM matters WHERE matter_id = ?').get(matter_id);
    const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(matter.client_id);

    // Notify assigned advocates if sender is client
    if (req.user.role === 'client') {
      const advocates = db.prepare(`
        SELECT advocate_id FROM matter_assignments WHERE matter_id = ? AND is_active = 1
      `).all(matter_id);
      advocates.forEach(a => {
        db.prepare(`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (?,?,?,?,?)`)
          .run(uuidv4(), a.advocate_id, 'New Message', `New message from ${req.user.full_name} re: ${matter.matter_number}`, 'message');
      });
    } else {
      // Notify client
      if (client && client.user_id) {
        db.prepare(`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (?,?,?,?,?)`)
          .run(uuidv4(), client.user_id, 'New Message', `New message from ${req.user.full_name} re: ${matter.matter_number}`, 'message');
      }
    }

    res.status(201).json({ message_id, sent_at: new Date().toISOString() });
  });

  // GET /api/messages/unread-count
  router.get('/unread-count', authenticateToken, (req, res) => {
    let count;
    if (req.user.role === 'client') {
      count = db.prepare(`
        SELECT COUNT(*) as c FROM messages msg
        JOIN matters m ON msg.matter_id = m.matter_id
        JOIN clients c ON m.client_id = c.client_id
        WHERE c.user_id = ? AND msg.sender_id != ? AND msg.is_read = 0
      `).get(req.user.user_id, req.user.user_id);
    } else {
      count = db.prepare(`
        SELECT COUNT(*) as c FROM messages msg
        JOIN matter_assignments ma ON msg.matter_id = ma.matter_id
        WHERE ma.advocate_id = ? AND msg.sender_id != ? AND msg.is_read = 0
      `).get(req.user.user_id, req.user.user_id);
    }
    res.json({ unread: count ? count.c : 0 });
  });

  return router;
};
