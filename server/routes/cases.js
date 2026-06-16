const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, canAccessMatter } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/cases
  router.get('/', authenticateToken, async (req, res) => {
    const { role, user_id } = req.user;
    try {
      let cases;
      if (role === 'managing_partner' || role === 'advisor') {
        cases = await sql`
          SELECT m.*, c.full_name as client_name FROM cases m
          JOIN clients c ON m.client_id = c.client_id
          ORDER BY m.created_at DESC
        `;
      } else if (role === 'senior_advocate' || role === 'junior_advocate') {
        cases = await sql`
          SELECT m.*, c.full_name as client_name FROM cases m
          JOIN clients c ON m.client_id = c.client_id
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${user_id} AND ma.is_active = 1
          ORDER BY m.created_at DESC
        `;
      } else if (role === 'client') {
        cases = await sql`
          SELECT m.*, c.full_name as client_name FROM cases m
          JOIN clients c ON m.client_id = c.client_id
          WHERE c.user_id = ${user_id}
          ORDER BY m.created_at DESC
        `;
      } else if (role === 'billing') {
        cases = await sql`
          SELECT m.matter_id, m.matter_number, m.matter_type, m.title, m.status, m.created_at
          FROM cases m ORDER BY m.created_at DESC
        `;
      } else if (role === 'reception') {
        cases = await sql`
          SELECT m.matter_id, m.matter_number, m.title, m.status FROM cases m
          ORDER BY m.created_at DESC
        `;
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }

      cases = await Promise.all(cases.map(async m => {
        const advocates = await sql`
          SELECT u.full_name, ma.role_on_matter FROM matter_assignments ma
          JOIN users u ON ma.advocate_id = u.user_id
          WHERE ma.matter_id = ${m.matter_id} AND ma.is_active = 1
        `;
        const nextHearingRows = await sql`
          SELECT hearing_date, hearing_time, court_name, purpose FROM hearings
          WHERE matter_id = ${m.matter_id} AND hearing_date >= CURRENT_DATE
          ORDER BY hearing_date ASC LIMIT 1
        `;
        return { ...m, advocates, next_hearing: nextHearingRows[0] || null };
      }));

      res.json(cases);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/cases/:id
  router.get('/:id', authenticateToken, async (req, res) => {
    const matterId = req.params.id;
    try {
      if (!(await canAccessMatter(sql, req.user, matterId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const rows = await sql`
        SELECT m.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
        FROM cases m JOIN clients c ON m.client_id = c.client_id
        WHERE m.matter_id = ${matterId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Case not found' });
      const matter = { ...rows[0] };

      if (req.user.role === 'billing') { delete matter.description; delete matter.client_email; delete matter.client_phone; delete matter.opposing_party; }
      if (req.user.role === 'reception') { delete matter.description; delete matter.opposing_party; delete matter.client_email; }

      const advocates = await sql`
        SELECT u.user_id, u.full_name, u.email, u.phone, ma.role_on_matter
        FROM matter_assignments ma JOIN users u ON ma.advocate_id = u.user_id
        WHERE ma.matter_id = ${matterId} AND ma.is_active = 1
      `;

      await sql`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (${uuidv4()}, ${req.user.user_id}, 'VIEW_CASE', 'case', ${matterId}, ${req.ip})`;

      res.json({ ...matter, advocates });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/cases
  router.post('/', authenticateToken, requireRole('managing_partner', 'senior_advocate'), async (req, res) => {
    const { client_id, matter_type, title, description, court_name, opposing_party, urgency } = req.body;

    if (!client_id || !matter_type || !title) {
      return res.status(400).json({ error: 'client_id, matter_type, and title are required' });
    }

    const matter_id = uuidv4();
    try {
      const year = new Date().getFullYear();
      const countRows = await sql`SELECT COUNT(*) as c FROM cases`;
      const count = Number(countRows[0].c);
      const matter_number = `CC-${year}-${String(count + 1).padStart(4, '0')}`;

      await sql`
        INSERT INTO cases (matter_id, matter_number, client_id, matter_type, title, description, status, court_name, opposing_party, urgency)
        VALUES (${matter_id}, ${matter_number}, ${client_id}, ${matter_type}, ${title}, ${description || null}, 'intake', ${court_name || null}, ${opposing_party || null}, ${urgency || 'standard'})
      `;

      await sql`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (${uuidv4()}, ${req.user.user_id}, 'CREATE_CASE', 'case', ${matter_id}, ${req.ip})`;

      res.status(201).json({ matter_id, matter_number });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/cases/:id
  router.patch('/:id', authenticateToken, requireRole('managing_partner', 'senior_advocate', 'junior_advocate'), async (req, res) => {
    try {
      if (!(await canAccessMatter(sql, req.user, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden — not assigned to this case' });
      }

      const allowed = ['title', 'description', 'court_name', 'opposing_party', 'urgency', 'status'];
      const validStatuses = ['intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'];
      const setClauses = [];
      const params = [];
      let paramIdx = 1;

      for (const field of allowed) {
        if (req.body[field] !== undefined) {
          if (field === 'status' && !validStatuses.includes(req.body[field])) {
            return res.status(400).json({ error: `Invalid status: ${req.body[field]}` });
          }
          setClauses.push(`${field} = $${paramIdx++}`);
          params.push(req.body[field]);
        }
      }

      if (req.body.conflict_checked !== undefined) {
        if (!['managing_partner', 'advisor'].includes(req.user.role)) {
          return res.status(403).json({ error: 'Only a managing partner or advisor can record a conflict check' });
        }
        setClauses.push(`conflict_checked = $${paramIdx++}`);
        params.push(req.body.conflict_checked ? 1 : 0);
        setClauses.push(`conflict_checked_by = $${paramIdx++}`);
        params.push(req.user.user_id);
      }

      if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      setClauses.push(`updated_at = NOW()`);
      params.push(req.params.id);

      const rows = await sql(`UPDATE cases SET ${setClauses.join(', ')} WHERE matter_id = $${paramIdx} RETURNING matter_id`, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Case not found' });

      if (req.body.status === 'closed') {
        await sql`UPDATE cases SET closed_at = NOW() WHERE matter_id = ${req.params.id}`;
      }

      await sql`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, resource_id, ip_address) VALUES (${uuidv4()}, ${req.user.user_id}, 'UPDATE_CASE', 'case', ${req.params.id}, ${req.ip})`;

      res.json({ message: 'Case updated successfully' });
    } catch (err) {
      console.error('[PATCH case] error:', err.message);
      res.status(500).json({ error: 'Failed to update case: ' + err.message });
    }
  });

  // PATCH /api/cases/:id/status
  router.patch('/:id/status', authenticateToken, requireRole('managing_partner', 'senior_advocate'), async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['intake', 'active', 'hearing_pending', 'awaiting_docs', 'judgment', 'closed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    try {
      const rows = await sql`UPDATE cases SET status = ${status}, updated_at = NOW() WHERE matter_id = ${req.params.id} RETURNING matter_id`;
      if (rows.length === 0) return res.status(404).json({ error: 'Case not found' });

      if (status === 'closed') {
        await sql`UPDATE cases SET closed_at = NOW() WHERE matter_id = ${req.params.id}`;
      }
      res.json({ message: 'Status updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/cases/:id/timeline
  router.get('/:id/timeline', authenticateToken, async (req, res) => {
    try {
      if (!(await canAccessMatter(sql, req.user, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const hearings = await sql`SELECT * FROM hearings WHERE matter_id = ${req.params.id} ORDER BY hearing_date ASC`;
      res.json(hearings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/cases/:id/assign
  router.post('/:id/assign', authenticateToken, requireRole('managing_partner', 'senior_advocate'), async (req, res) => {
    const { advocate_id, role_on_matter } = req.body;
    if (!advocate_id || !role_on_matter) return res.status(400).json({ error: 'advocate_id and role_on_matter required' });

    const assignment_id = uuidv4();
    try {
      await sql`INSERT INTO matter_assignments (assignment_id, matter_id, advocate_id, role_on_matter, assigned_by) VALUES (${assignment_id}, ${req.params.id}, ${advocate_id}, ${role_on_matter}, ${req.user.user_id})`;
      res.status(201).json({ assignment_id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
