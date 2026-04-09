const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/invoices — Based on role
  router.get('/', authenticateToken, (req, res) => {
    let invoices;
    if (req.user.role === 'managing_partner' || req.user.role === 'billing') {
      invoices = db.prepare(`
        SELECT i.*, m.matter_number, m.title as matter_title, c.full_name as client_name
        FROM invoices i
        JOIN matters m ON i.matter_id = m.matter_id
        JOIN clients c ON i.client_id = c.client_id
        ORDER BY i.created_at DESC
      `).all();
    } else if (req.user.role === 'senior_advocate') {
      invoices = db.prepare(`
        SELECT i.*, m.matter_number, m.title as matter_title
        FROM invoices i
        JOIN matters m ON i.matter_id = m.matter_id
        JOIN matter_assignments ma ON m.matter_id = ma.matter_id
        WHERE ma.advocate_id = ? AND ma.is_active = 1
        ORDER BY i.created_at DESC
      `).all(req.user.user_id);
    } else if (req.user.role === 'client') {
      invoices = db.prepare(`
        SELECT i.*, m.matter_number, m.title as matter_title
        FROM invoices i
        JOIN matters m ON i.matter_id = m.matter_id
        JOIN clients c ON i.client_id = c.client_id
        WHERE c.user_id = ?
        ORDER BY i.created_at DESC
      `).all(req.user.user_id);
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(invoices);
  });

  // POST /api/invoices — Create invoice
  router.post('/', authenticateToken, requireRole('managing_partner', 'billing'), (req, res) => {
    const { matter_id, client_id, amount_base, billing_type, due_date } = req.body;

    if (!matter_id || !client_id || !amount_base || !due_date) {
      return res.status(400).json({ error: 'matter_id, client_id, amount_base, and due_date are required' });
    }

    const gst_amount = Math.round(amount_base * 0.18 * 100) / 100;
    const total_amount = amount_base + gst_amount;
    const invoice_id = uuidv4();
    const count = db.prepare('SELECT COUNT(*) as c FROM invoices').get().c;
    const invoice_number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO invoices (invoice_id, matter_id, client_id, invoice_number, amount_base, gst_amount, total_amount, billing_type, status, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `).run(invoice_id, matter_id, client_id, invoice_number, amount_base, gst_amount, total_amount, billing_type || 'per_case', due_date);

    res.status(201).json({ invoice_id, invoice_number, total_amount });
  });

  // PATCH /api/invoices/:id/status — Update invoice status
  router.patch('/:id/status', authenticateToken, requireRole('managing_partner', 'billing'), (req, res) => {
    const { status } = req.body;
    const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'waived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = status === 'paid'
      ? db.prepare('UPDATE invoices SET status = ?, paid_at = datetime("now") WHERE invoice_id = ?').run(status, req.params.id)
      : db.prepare('UPDATE invoices SET status = ? WHERE invoice_id = ?').run(status, req.params.id);

    if (updates.changes === 0) return res.status(404).json({ error: 'Invoice not found' });

    // Notify client if invoice sent
    if (status === 'sent') {
      const invoice = db.prepare('SELECT * FROM invoices WHERE invoice_id = ?').get(req.params.id);
      const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(invoice.client_id);
      if (client && client.user_id) {
        db.prepare(`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (?,?,?,?,?)`)
          .run(uuidv4(), client.user_id, 'Invoice Generated', `Invoice ${invoice.invoice_number} for ₹${invoice.total_amount} is ready`, 'invoice');
      }
    }

    res.json({ message: 'Invoice status updated' });
  });

  return router;
};
