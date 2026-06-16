const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/clients
  router.get('/', authenticateToken, async (req, res) => {
    const { role, user_id } = req.user;
    try {
      if (role === 'managing_partner' || role === 'advisor') {
        const clients = await sql`
          SELECT c.*, u.full_name as onboarded_by_name
          FROM clients c LEFT JOIN users u ON c.onboarded_by = u.user_id
          ORDER BY c.created_at DESC
        `;
        return res.json(clients);
      }
      if (role === 'senior_advocate' || role === 'junior_advocate') {
        const clients = await sql`
          SELECT DISTINCT c.client_id, c.full_name, c.email, c.phone, c.client_type, c.created_at
          FROM clients c
          JOIN cases m ON c.client_id = m.client_id
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${user_id} AND ma.is_active = 1
        `;
        return res.json(clients);
      }
      if (role === 'reception') {
        const clients = await sql`SELECT client_id, full_name, phone FROM clients ORDER BY created_at DESC`;
        return res.json(clients);
      }
      if (role === 'client') {
        const client = await sql`SELECT * FROM clients WHERE user_id = ${user_id}`;
        return res.json(client);
      }
      return res.status(403).json({ error: 'Forbidden' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/clients/:id
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT * FROM clients WHERE client_id = ${req.params.id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'Client not found' });
      const client = rows[0];

      if (req.user.role === 'billing') return res.status(403).json({ error: 'Client PII access not permitted' });
      if (req.user.role === 'reception') return res.json({ client_id: client.client_id, full_name: client.full_name, phone: client.phone });

      res.json(client);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
