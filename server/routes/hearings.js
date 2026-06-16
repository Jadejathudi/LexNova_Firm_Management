const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/hearings/matter/:matterId
  router.get('/matter/:matterId', authenticateToken, async (req, res) => {
    try {
      const hearings = await sql`SELECT * FROM hearings WHERE matter_id = ${req.params.matterId} ORDER BY hearing_date ASC`;
      res.json(hearings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/hearings/upcoming
  router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
      let hearings;
      if (req.user.role === 'managing_partner' || req.user.role === 'advisor') {
        hearings = await sql`
          SELECT h.*, m.matter_number, m.title as matter_title, c.full_name as client_name
          FROM hearings h
          JOIN cases m ON h.matter_id = m.matter_id
          JOIN clients c ON m.client_id = c.client_id
          WHERE h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC
        `;
      } else if (req.user.role === 'senior_advocate' || req.user.role === 'junior_advocate') {
        hearings = await sql`
          SELECT h.*, m.matter_number, m.title as matter_title, c.full_name as client_name
          FROM hearings h
          JOIN cases m ON h.matter_id = m.matter_id
          JOIN clients c ON m.client_id = c.client_id
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${req.user.user_id} AND ma.is_active = 1 AND h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC
        `;
      } else if (req.user.role === 'client') {
        hearings = await sql`
          SELECT h.*, m.matter_number, m.title as matter_title
          FROM hearings h
          JOIN cases m ON h.matter_id = m.matter_id
          JOIN clients c ON m.client_id = c.client_id
          WHERE c.user_id = ${req.user.user_id} AND h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC
        `;
      } else {
        hearings = await sql`
          SELECT h.hearing_id, h.hearing_date, h.hearing_time, h.court_name, m.matter_number
          FROM hearings h JOIN cases m ON h.matter_id = m.matter_id
          WHERE h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC
        `;
      }
      res.json(hearings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/hearings
  router.post('/', authenticateToken, requireRole('managing_partner', 'senior_advocate', 'junior_advocate'), async (req, res) => {
    const { matter_id, hearing_date, hearing_time, court_name, courtroom_number, purpose } = req.body;

    if (!matter_id || !hearing_date || !court_name) {
      return res.status(400).json({ error: 'matter_id, hearing_date, and court_name are required' });
    }

    const hearing_id = uuidv4();
    try {
      await sql`
        INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time, court_name, courtroom_number, purpose)
        VALUES (${hearing_id}, ${matter_id}, ${hearing_date}, ${hearing_time || null}, ${court_name}, ${courtroom_number || null}, ${purpose || null})
      `;

      const matterRows = await sql`SELECT * FROM cases WHERE matter_id = ${matter_id}`;
      const matter = matterRows[0];
      if (matter) {
        const clientRows = await sql`SELECT * FROM clients WHERE client_id = ${matter.client_id}`;
        const client = clientRows[0];
        if (client && client.user_id) {
          await sql`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (${uuidv4()}, ${client.user_id}, 'Hearing Scheduled', ${`Hearing for ${matter.matter_number} on ${hearing_date} at ${court_name}`}, 'hearing')`;
        }
      }

      res.status(201).json({ hearing_id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/hearings/:id
  router.patch('/:id', authenticateToken, requireRole('managing_partner', 'senior_advocate', 'junior_advocate'), async (req, res) => {
    const allowed = ['hearing_date', 'hearing_time', 'court_name', 'courtroom_number', 'purpose', 'outcome', 'next_date'];
    const setClauses = [];
    const params = [];
    let paramIdx = 1;

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        params.push(req.body[field] === '' ? null : req.body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.params.id);
    try {
      const rows = await sql(`UPDATE hearings SET ${setClauses.join(', ')} WHERE hearing_id = $${paramIdx} RETURNING hearing_id`, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Hearing not found' });
      res.json({ message: 'Hearing updated' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
