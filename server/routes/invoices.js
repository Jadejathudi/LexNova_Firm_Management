const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/invoices
  router.get('/', authenticateToken, async (req, res) => {
    try {
      let invoices;
      if (req.user.role === 'managing_partner' || req.user.role === 'billing') {
        invoices = await sql`
          SELECT i.*, m.matter_number, m.title as matter_title, c.full_name as client_name
          FROM invoices i
          JOIN cases m ON i.matter_id = m.matter_id
          JOIN clients c ON i.client_id = c.client_id
          ORDER BY i.created_at DESC
        `;
      } else if (req.user.role === 'senior_advocate') {
        invoices = await sql`
          SELECT i.*, m.matter_number, m.title as matter_title
          FROM invoices i
          JOIN cases m ON i.matter_id = m.matter_id
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${req.user.user_id} AND ma.is_active = 1
          ORDER BY i.created_at DESC
        `;
      } else if (req.user.role === 'client') {
        invoices = await sql`
          SELECT i.*, m.matter_number, m.title as matter_title
          FROM invoices i
          JOIN cases m ON i.matter_id = m.matter_id
          JOIN clients c ON i.client_id = c.client_id
          WHERE c.user_id = ${req.user.user_id}
          ORDER BY i.created_at DESC
        `;
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
      res.json(invoices);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/invoices
  router.post('/', authenticateToken, requireRole('managing_partner', 'billing'), async (req, res) => {
    const { matter_id, client_id, amount_base, billing_type, due_date } = req.body;

    if (!matter_id || !client_id || !amount_base || !due_date) {
      return res.status(400).json({ error: 'matter_id, client_id, amount_base, and due_date are required' });
    }

    const gst_amount = Math.round(amount_base * 0.18 * 100) / 100;
    const total_amount = amount_base + gst_amount;
    const invoice_id = uuidv4();

    try {
      const countRows = await sql`SELECT COUNT(*) as c FROM invoices`;
      const count = Number(countRows[0].c);
      const invoice_number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      await sql`
        INSERT INTO invoices (invoice_id, matter_id, client_id, invoice_number, amount_base, gst_amount, total_amount, billing_type, status, due_date)
        VALUES (${invoice_id}, ${matter_id}, ${client_id}, ${invoice_number}, ${amount_base}, ${gst_amount}, ${total_amount}, ${billing_type || 'per_case'}, 'draft', ${due_date})
      `;
      res.status(201).json({ invoice_id, invoice_number, total_amount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/invoices/:id/status
  router.patch('/:id/status', authenticateToken, requireRole('managing_partner', 'billing'), async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'waived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    try {
      let rows;
      if (status === 'paid') {
        rows = await sql`UPDATE invoices SET status = ${status}, paid_at = NOW() WHERE invoice_id = ${req.params.id} RETURNING *`;
      } else {
        rows = await sql`UPDATE invoices SET status = ${status} WHERE invoice_id = ${req.params.id} RETURNING *`;
      }
      if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

      if (status === 'sent') {
        const invoice = rows[0];
        const clientRows = await sql`SELECT * FROM clients WHERE client_id = ${invoice.client_id}`;
        const client = clientRows[0];
        if (client && client.user_id) {
          await sql`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (${uuidv4()}, ${client.user_id}, 'Invoice Generated', ${`Invoice ${invoice.invoice_number} for ₹${invoice.total_amount} is ready`}, 'invoice')`;
        }
      }

      res.json({ message: 'Invoice status updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
