const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/hearings/matter/:matterId
  router.get('/matter/:matterId', authenticateToken, (req, res) => {
    const hearings = db.prepare(`
      SELECT * FROM hearings WHERE matter_id = ? ORDER BY hearing_date ASC
    `).all(req.params.matterId);
    res.json(hearings);
  });

  // GET /api/hearings/upcoming — Upcoming hearings for the user
  router.get('/upcoming', authenticateToken, (req, res) => {
    let hearings;
    if (req.user.role === 'managing_partner' || req.user.role === 'advisor') {
      hearings = db.prepare(`
        SELECT h.*, m.matter_number, m.title as matter_title, c.full_name as client_name
        FROM hearings h
        JOIN matters m ON h.matter_id = m.matter_id
        JOIN clients c ON m.client_id = c.client_id
        WHERE h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC
      `).all();
    } else if (req.user.role === 'senior_advocate' || req.user.role === 'junior_advocate') {
      hearings = db.prepare(`
        SELECT h.*, m.matter_number, m.title as matter_title, c.full_name as client_name
        FROM hearings h
        JOIN matters m ON h.matter_id = m.matter_id
        JOIN clients c ON m.client_id = c.client_id
        JOIN matter_assignments ma ON m.matter_id = ma.matter_id
        WHERE ma.advocate_id = ? AND ma.is_active = 1 AND h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC
      `).all(req.user.user_id);
    } else if (req.user.role === 'client') {
      hearings = db.prepare(`
        SELECT h.*, m.matter_number, m.title as matter_title
        FROM hearings h
        JOIN matters m ON h.matter_id = m.matter_id
        JOIN clients c ON m.client_id = c.client_id
        WHERE c.user_id = ? AND h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC
      `).all(req.user.user_id);
    } else {
      hearings = db.prepare(`
        SELECT h.hearing_id, h.hearing_date, h.hearing_time, h.court_name, m.matter_number
        FROM hearings h JOIN matters m ON h.matter_id = m.matter_id
        WHERE h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC
      `).all();
    }
    res.json(hearings);
  });

  // POST /api/hearings — Add new hearing
  router.post('/', authenticateToken, requireRole('managing_partner', 'senior_advocate', 'junior_advocate'), (req, res) => {
    const { matter_id, hearing_date, hearing_time, court_name, courtroom_number, purpose } = req.body;

    if (!matter_id || !hearing_date || !court_name) {
      return res.status(400).json({ error: 'matter_id, hearing_date, and court_name are required' });
    }

    const hearing_id = uuidv4();
    db.prepare(`
      INSERT INTO hearings (hearing_id, matter_id, hearing_date, hearing_time, court_name, courtroom_number, purpose)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(hearing_id, matter_id, hearing_date, hearing_time || null, court_name, courtroom_number || null, purpose || null);

    // Notify client
    const matter = db.prepare('SELECT * FROM matters WHERE matter_id = ?').get(matter_id);
    const client = db.prepare('SELECT * FROM clients WHERE client_id = ?').get(matter.client_id);
    if (client && client.user_id) {
      db.prepare(`INSERT INTO notifications (notification_id, user_id, title, message, type) VALUES (?,?,?,?,?)`)
        .run(uuidv4(), client.user_id, 'Hearing Scheduled', `Hearing for ${matter.matter_number} on ${hearing_date} at ${court_name}`, 'hearing');
    }

    res.status(201).json({ hearing_id });
  });

  // PATCH /api/hearings/:id — Update hearing details
  router.patch('/:id', authenticateToken, requireRole('managing_partner', 'senior_advocate', 'junior_advocate'), (req, res) => {
    const allowed = ['hearing_date', 'hearing_time', 'court_name', 'courtroom_number', 'purpose', 'outcome', 'next_date'];
    const setClauses = [];
    const params = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(req.body[field] === '' ? null : req.body[field]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.params.id);
    const result = db.prepare(`UPDATE hearings SET ${setClauses.join(', ')} WHERE hearing_id = ?`).run(...params);

    if (result.changes === 0) return res.status(404).json({ error: 'Hearing not found' });
    res.json({ message: 'Hearing updated' });
  });

  return router;
};
