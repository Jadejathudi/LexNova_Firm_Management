const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/clients — Role-based client list
  router.get('/', authenticateToken, (req, res) => {
    const { role, user_id } = req.user;

    if (role === 'managing_partner' || role === 'advisor') {
      const clients = db.prepare(`
        SELECT c.*, u.full_name as onboarded_by_name
        FROM clients c LEFT JOIN users u ON c.onboarded_by = u.user_id
        ORDER BY c.created_at DESC
      `).all();
      return res.json(clients);
    }
    if (role === 'senior_advocate' || role === 'junior_advocate') {
      const clients = db.prepare(`
        SELECT DISTINCT c.client_id, c.full_name, c.email, c.phone, c.client_type, c.created_at
        FROM clients c
        JOIN matters m ON c.client_id = m.client_id
        JOIN matter_assignments ma ON m.matter_id = ma.matter_id
        WHERE ma.advocate_id = ? AND ma.is_active = 1
      `).all(user_id);
      return res.json(clients);
    }
    if (role === 'reception') {
      const clients = db.prepare(`SELECT client_id, full_name, phone FROM clients ORDER BY created_at DESC`).all();
      return res.json(clients);
    }
    if (role === 'client') {
      const client = db.prepare(`SELECT * FROM clients WHERE user_id = ?`).get(user_id);
      return res.json(client ? [client] : []);
    }
    return res.status(403).json({ error: 'Forbidden' });
  });

  // GET /api/clients/:id
  router.get('/:id', authenticateToken, (req, res) => {
    const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    // Restrict for billing
    if (req.user.role === 'billing') {
      return res.status(403).json({ error: 'Client PII access not permitted' });
    }
    // Restrict for reception
    if (req.user.role === 'reception') {
      return res.json({ client_id: client.client_id, full_name: client.full_name, phone: client.phone });
    }

    res.json(client);
  });

  return router;
};
