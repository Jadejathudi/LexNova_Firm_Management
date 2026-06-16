const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { canAccessMatter } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/messages/unread-count  (must be before /matter/:matterId)
  router.get('/unread-count', authenticateToken, async (req, res) => {
    try {
      let rows;
      if (req.user.role === 'client') {
        rows = await sql`
          SELECT COUNT(*) as c FROM messages msg
          JOIN cases m ON msg.matter_id = m.matter_id
          JOIN clients c ON m.client_id = c.client_id
          WHERE c.user_id = ${req.user.user_id} AND msg.sender_id != ${req.user.user_id} AND msg.is_read = 0
        `;
      } else {
        rows = await sql`
          SELECT COUNT(*) as c FROM messages msg
          JOIN matter_assignments ma ON msg.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${req.user.user_id} AND msg.sender_id != ${req.user.user_id} AND msg.is_read = 0
        `;
      }
      res.json({ unread: Number(rows[0].c) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/messages/matter/:matterId
  router.get('/matter/:matterId', authenticateToken, async (req, res) => {
    const matterId = req.params.matterId;

    if (['billing', 'reception'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Message access not permitted for your role' });
    }

    try {
      if (!(await canAccessMatter(sql, req.user, matterId))) return res.status(403).json({ error: 'Forbidden' });

      const messages = await sql`
        SELECT msg.*, u.full_name as sender_name, u.role as sender_role
        FROM messages msg
        JOIN users u ON msg.sender_id = u.user_id
        WHERE msg.matter_id = ${matterId}
        ORDER BY msg.sent_at ASC
      `;

      await sql`
        UPDATE messages SET is_read = 1
        WHERE matter_id = ${matterId} AND sender_id != ${req.user.user_id} AND is_read = 0
      `;

      res.json(messages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/messages
  router.post('/', authenticateToken, async (req, res) => {
    const { matter_id, content } = req.body;

    if (!matter_id || !content) return res.status(400).json({ error: 'matter_id and content are required' });
    if (content.length > 5000) return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
    if (['billing', 'reception'].includes(req.user.role)) return res.status(403).json({ error: 'Messaging not permitted for your role' });

    try {
      if (!(await canAccessMatter(sql, req.user, matter_id))) return res.status(403).json({ error: 'Forbidden' });

      const message_id = uuidv4();
      await sql`INSERT INTO messages (message_id, matter_id, sender_id, content) VALUES (${message_id}, ${matter_id}, ${req.user.user_id}, ${content})`;

      const matterRows = await sql`SELECT * FROM cases WHERE matter_id = ${matter_id}`;
      const matter = matterRows[0];
      const clientRows = matter ? await sql`SELECT * FROM clients WHERE client_id = ${matter.client_id}` : [];
      const client = clientRows[0];

      if (req.user.role === 'client') {
        const advocates = await sql`SELECT advocate_id FROM matter_assignments WHERE matter_id = ${matter_id} AND is_active = 1`;
        for (const a of advocates) {
          await sql`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (${uuidv4()}, ${a.advocate_id}, 'New Message', ${`New message from ${req.user.full_name} re: ${matter.matter_number}`}, 'message')`;
        }
      } else if (client && client.user_id) {
        await sql`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (${uuidv4()}, ${client.user_id}, 'New Message', ${`New message from ${req.user.full_name} re: ${matter.matter_number}`}, 'message')`;
      }

      res.status(201).json({ message_id, sent_at: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
