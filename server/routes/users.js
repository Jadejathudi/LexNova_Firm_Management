const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/users — List team members (internal roles)
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor'), (req, res) => {
    const users = db.prepare(`
      SELECT user_id, full_name, email, phone, role, is_active, last_login, created_at
      FROM users WHERE role != 'client'
      ORDER BY role, full_name
    `).all();
    res.json(users);
  });

  // GET /api/users/advocates — List advocates
  router.get('/advocates', authenticateToken, (req, res) => {
    const advocates = db.prepare(`
      SELECT user_id, full_name, email, phone, role
      FROM users WHERE role IN ('senior_advocate', 'junior_advocate') AND is_active = 1
      ORDER BY role, full_name
    `).all();

    // Add workload info
    const result = advocates.map(a => {
      const workload = db.prepare(`
        SELECT COUNT(*) as active_cases FROM matter_assignments ma
        JOIN matters m ON ma.matter_id = m.matter_id
        WHERE ma.advocate_id = ? AND ma.is_active = 1 AND m.status != 'closed'
      `).get(a.user_id);
      return { ...a, active_cases: workload.active_cases };
    });

    res.json(result);
  });

  // GET /api/users/notifications — Get user notifications
  router.get('/notifications', authenticateToken, (req, res) => {
    const notifications = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(req.user.user_id);
    res.json(notifications);
  });

  // PATCH /api/users/notifications/:id/read
  router.patch('/notifications/:id/read', authenticateToken, (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?')
      .run(req.params.id, req.user.user_id);
    res.json({ message: 'Marked as read' });
  });

  // GET /api/users/notifications/unread-count
  router.get('/notifications/unread-count', authenticateToken, (req, res) => {
    const result = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(req.user.user_id);
    res.json({ count: result.c });
  });

  return router;
};
