const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/users
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    try {
      const users = await sql`
        SELECT user_id, full_name, email, phone, role, is_active, last_login, created_at
        FROM users WHERE role != 'client'
        ORDER BY role, full_name
      `;
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/users/advocates
  router.get('/advocates', authenticateToken, async (req, res) => {
    try {
      const advocates = await sql`
        SELECT user_id, full_name, email, phone, role
        FROM users WHERE role IN ('senior_advocate', 'junior_advocate') AND is_active = 1
        ORDER BY role, full_name
      `;

      const result = await Promise.all(advocates.map(async a => {
        const wl = await sql`
          SELECT COUNT(*) as active_cases FROM matter_assignments ma
          JOIN matters m ON ma.matter_id = m.matter_id
          WHERE ma.advocate_id = ${a.user_id} AND ma.is_active = 1 AND m.status != 'closed'
        `;
        return { ...a, active_cases: Number(wl[0].active_cases) };
      }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/users/notifications/unread-count  (must be before /:id style routes)
  router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT COUNT(*) as c FROM notifications WHERE user_id = ${req.user.user_id} AND is_read = 0`;
      res.json({ count: Number(rows[0].c) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/users/notifications
  router.get('/notifications', authenticateToken, async (req, res) => {
    try {
      const notifications = await sql`
        SELECT * FROM notifications WHERE user_id = ${req.user.user_id}
        ORDER BY created_at DESC LIMIT 50
      `;
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/users/notifications/:id/read
  router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
      await sql`UPDATE notifications SET is_read = 1 WHERE notification_id = ${req.params.id} AND user_id = ${req.user.user_id}`;
      res.json({ message: 'Marked as read' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
