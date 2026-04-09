const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, canAccessMatter } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/matters — Returns matters based on RBAC role
  router.get('/', authenticateToken, (req, res) => {
    const { role, user_id } = req.user;
    let matters;

    if (role === 'managing_partner' || role === 'advisor') {
      matters = db.prepare(`
        SELECT m.*, c.full_name as client_name FROM matters m
        JOIN clients c ON m.client_id = c.client_id
        ORDER BY m.created_at DESC
      `).all();
    } else if (role === 'senior_advocate' || role === 'junior_advocate') {
      matters = db.prepare(`
        SELECT m.*, c.full_name as client_name FROM matters m
        JOIN clients c ON m.client_id = c.client_id
        JOIN matter_assignments ma ON m.matter_id = ma.matter_id
        WHERE ma.advocate_id = ? AND ma.is_active = 1
        ORDER BY m.created_at DESC
      `).all(user_id);
    } else if (role === 'client') {
      matters = db.prepare(`
        SELECT m.*, c.full_name as client_name FROM matters m
        JOIN clients c ON m.client_id = c.client_id
        WHERE c.user_id = ?
        ORDER BY m.created_at DESC
      `).all(user_id);
    } else if (role === 'billing') {
      matters = db.prepare(`
        SELECT m.matter_id, m.matter_number, m.matter_type, m.title, m.status, m.created_at
        FROM matters m ORDER BY m.created_at DESC
      `).all();
    } else if (role === 'reception') {
      matters = db.prepare(`
        SELECT m.matter_id, m.matter_number, m.title, m.status FROM matters m
        ORDER BY m.created_at DESC
      `).all();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Add assigned advocate names
    matters = matters.map(m => {
      const advocates = db.prepare(`
        SELECT u.full_name, ma.role_on_matter FROM matter_assignments ma
        JOIN users u ON ma.advocate_id = u.user_id
        WHERE ma.matter_id = ? AND ma.is_active = 1
      `).all(m.matter_id);
      return { ...m, advocates };
    });

    // Add next hearing
    matters = matters.map(m => {
      const nextHearing = db.prepare(`
        SELECT hearing_date, hearing_time, court_name, purpose FROM hearings
        WHERE matter_id = ? AND hearing_date >= date('now')
        ORDER BY hearing_date ASC LIMIT 1
      `).get(m.matter_id);
      return { ...m, next_hearing: nextHearing || null };
    });

    res.json(matters);
  });

  // GET /api/matters/:id — Single matter detail
  router.get('/:id', authenticateToken, (req, res) => {
    const matterId = req.params.id;
    if (!canAccessMatter(db, req.user, matterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const matter = db.prepare(`
      SELECT m.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
      FROM matters m JOIN clients c ON m.client_id = c.client_id
      WHERE m.matter_id = ?
    `).get(matterId);

    if (!matter) return res.status(404).json({ error: 'Matter not found' });

    // Strip sensitive fields for billing/reception
    if (req.user.role === 'billing') {
      delete matter.description;
      delete matter.client_email;
      delete matter.client_phone;
      delete matter.opposing_party;
    }
    if (req.user.role === 'reception') {
      delete matter.description;
      delete matter.opposing_party;
      delete matter.client_email;
    }

    // Add advocates
    const advocates = db.prepare(`
      SELECT u.user_id, u.full_name, u.email, u.phone, ma.role_on_matter
      FROM matter_assignments ma JOIN users u ON ma.advocate_id = u.user_id
      WHERE ma.matter_id = ? AND ma.is_active = 1
    `).all(matterId);

    // Audit
    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), req.user.user_id, 'VIEW_MATTER', 'matter', matterId, req.ip);

    res.json({ ...matter, advocates });
  });

  // POST /api/matters — Create new matter (partner/senior only)
  router.post('/', authenticateToken, requireRole('managing_partner', 'senior_advocate'), (req, res) => {
    const { client_id, matter_type, title, description, court_name, opposing_party, urgency } = req.body;

    if (!client_id || !matter_type || !title) {
      return res.status(400).json({ error: 'client_id, matter_type, and title are required' });
    }

    const matter_id = uuidv4();
    const year = new Date().getFullYear();
    const count = db.prepare('SELECT COUNT(*) as c FROM matters').get().c;
    const matter_number = `LN-${year}-${String(count + 1).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO matters (matter_id, matter_number, client_id, matter_type, title, description, status, court_name, opposing_party, urgency)
      VALUES (?, ?, ?, ?, ?, ?, 'intake', ?, ?, ?)
    `).run(matter_id, matter_number, client_id, matter_type, title, description || null, court_name || null, opposing_party || null, urgency || 'standard');

    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (?,?,?,?,?,?)`)
      .run(uuidv4(), req.user.user_id, 'CREATE_MATTER', 'matter', matter_id, req.ip);

    res.status(201).json({ matter_id, matter_number });
  });

  // PATCH /api/matters/:id/status — Update status
  router.patch('/:id/status', authenticateToken, requireRole('managing_partner', 'senior_advocate'), (req, res) => {
    const { status } = req.body;
    const validStatuses = ['intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = db.prepare('UPDATE matters SET status = ?, updated_at = datetime("now") WHERE matter_id = ?')
      .run(status, req.params.id);

    if (result.changes === 0) return res.status(404).json({ error: 'Matter not found' });

    if (status === 'closed') {
      db.prepare('UPDATE matters SET closed_at = datetime("now") WHERE matter_id = ?').run(req.params.id);
    }

    res.json({ message: 'Status updated' });
  });

  // GET /api/matters/:id/timeline — Hearing + event timeline
  router.get('/:id/timeline', authenticateToken, (req, res) => {
    if (!canAccessMatter(db, req.user, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const hearings = db.prepare(`
      SELECT * FROM hearings WHERE matter_id = ? ORDER BY hearing_date ASC
    `).all(req.params.id);

    res.json(hearings);
  });

  // POST /api/matters/:id/assign — Assign advocate
  router.post('/:id/assign', authenticateToken, requireRole('managing_partner', 'senior_advocate'), (req, res) => {
    const { advocate_id, role_on_matter } = req.body;
    if (!advocate_id || !role_on_matter) {
      return res.status(400).json({ error: 'advocate_id and role_on_matter required' });
    }

    const assignment_id = uuidv4();
    db.prepare(`INSERT INTO matter_assignments (assignment_id, matter_id, advocate_id, role_on_matter, assigned_by) VALUES (?,?,?,?,?)`)
      .run(assignment_id, req.params.id, advocate_id, role_on_matter, req.user.user_id);

    res.status(201).json({ assignment_id });
  });

  return router;
};
