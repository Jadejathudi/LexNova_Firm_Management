const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { generateMeetUrl } = require('../googleCalendar');

module.exports = function (db) {
  const router = express.Router();

  function normalizeTimeString(time) {
    if (!time) return null;
    const cleaned = time.trim().toLowerCase().replace('.', '');
    const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const meridiem = match[3];
    if (meridiem) {
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
    }
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  function isSlotAvailable(advocate_id, scheduled_date, scheduled_time, duration_minutes) {
    const normalizedTime = normalizeTimeString(scheduled_time);
    if (!normalizedTime) return true;
    // Check for any session that overlaps this time window (within duration)
    const conflict = db.prepare(`
      SELECT session_id FROM consultation_sessions
      WHERE advocate_id = ?
        AND scheduled_date = ?
        AND status NOT IN ('cancelled', 'completed')
        AND ABS(
          (CAST(SUBSTR(scheduled_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(scheduled_time, 4, 2) AS INTEGER)) -
          (CAST(SUBSTR(?, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(?, 4, 2) AS INTEGER))
        ) < ?
      LIMIT 1
    `).get(advocate_id, scheduled_date, normalizedTime, normalizedTime, duration_minutes || 30);
    return !conflict;
  }

  function createSessionRecord({ request_id, advocate_id, client_name, client_phone, client_email, scheduled_date, scheduled_time, duration_minutes = 30, session_mode = 'video', notes }) {
    const sessionId = uuidv4();
    const normalizedTime = normalizeTimeString(scheduled_time) || scheduled_time;

    // Generate Meet URL only for video sessions; phone/office don't need one
    const meeting_link = session_mode === 'video' ? generateMeetUrl(sessionId) : null;

    db.prepare(`
      INSERT INTO consultation_sessions
        (session_id, request_id, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes, session_mode, status, meeting_link, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).run(
      sessionId, request_id || null, advocate_id,
      client_name, client_phone,
      scheduled_date, normalizedTime,
      duration_minutes, session_mode,
      meeting_link, notes || null,
    );

    return {
      session_id: sessionId,
      advocate_id,
      client_name,
      client_phone,
      scheduled_date,
      scheduled_time: normalizedTime,
      duration_minutes,
      session_mode,
      status: 'scheduled',
      meeting_link,
      notes: notes || null,
    };
  }

  // ── GET /my-requests ─────────────────────────────────────────────────────────
  router.get('/my-requests', authenticateToken, (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT cr.*, a.city, a.state,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name
        FROM consultation_requests cr
        LEFT JOIN advocates a ON cr.advocate_id = a.advocate_id
        WHERE cr.user_id = ?
        ORDER BY cr.submitted_at DESC
      `).all(req.user.user_id);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching user consultation requests:', error);
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // ── GET /requests ─────────────────────────────────────────────────────────────
  router.get('/requests', (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT cr.*, a.city, a.state,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name
        FROM consultation_requests cr
        LEFT JOIN advocates a ON cr.advocate_id = a.advocate_id
        ORDER BY cr.submitted_at DESC
      `).all();
      res.json(requests);
    } catch (error) {
      console.error('Error fetching all consultation requests:', error);
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // ── GET /requests/:advocateId ────────────────────────────────────────────────
  router.get('/requests/:advocateId', (req, res) => {
    try {
      const requests = db.prepare(
        'SELECT * FROM consultation_requests WHERE advocate_id = ? ORDER BY submitted_at DESC'
      ).all(req.params.advocateId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // ── POST /requests — Create request AND auto-schedule session ────────────────
  router.post('/requests', authenticateToken, (req, res) => {
    const {
      advocate_id, client_name, client_phone, client_email,
      matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time,
    } = req.body;

    if (!advocate_id || !matter_type) {
      return res.status(400).json({ error: 'Advocate and matter type are required' });
    }
    if (!client_name || !client_phone) {
      return res.status(400).json({ error: 'Client name and phone are required' });
    }
    if (!preferred_date || !preferred_time) {
      return res.status(400).json({ error: 'Preferred date and time are required' });
    }

    const advocateExists = db.prepare('SELECT advocate_id FROM advocates WHERE advocate_id = ?').get(advocate_id);
    if (!advocateExists) {
      return res.status(404).json({ error: 'Advocate not found' });
    }

    const normalizedUrgency = urgency === 'urgent' ? 'high' : urgency === 'standard' ? 'normal' : urgency || 'normal';
    const session_mode = ['video', 'phone', 'office'].includes(preferred_mode) ? preferred_mode : 'video';

    // Check advocate availability for the requested slot
    if (!isSlotAvailable(advocate_id, preferred_date, preferred_time, 30)) {
      return res.status(409).json({
        error: 'This time slot is no longer available. Please choose a different time.',
      });
    }

    try {
      const requestId = uuidv4();

      // Insert the request (immediately accepted — no manual advocate review)
      db.prepare(`
        INSERT INTO consultation_requests
          (request_id, user_id, advocate_id, client_name, client_phone, client_email, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')
      `).run(
        requestId, req.user.user_id, advocate_id,
        client_name.trim(), client_phone.trim(), client_email || null,
        matter_type, brief || null, normalizedUrgency,
        session_mode, preferred_date, preferred_time,
      );

      // Auto-create the session immediately
      const session = createSessionRecord({
        request_id: requestId,
        advocate_id,
        client_name: client_name.trim(),
        client_phone: client_phone.trim(),
        client_email: client_email || null,
        scheduled_date: preferred_date,
        scheduled_time: preferred_time,
        duration_minutes: 30,
        session_mode,
        notes: brief || null,
      });

      res.status(201).json({
        request_id: requestId,
        session_id: session.session_id,
        meeting_link: session.meeting_link,
        scheduled_date: session.scheduled_date,
        scheduled_time: session.scheduled_time,
        session_mode: session.session_mode,
        message: 'Consultation scheduled successfully.',
      });
    } catch (error) {
      console.error('Error creating consultation request:', error);
      res.status(500).json({ error: 'Failed to create consultation request' });
    }
  });

  // ── PUT /requests/:requestId — Update status (cancel only) ──────────────────
  router.put('/requests/:requestId', (req, res) => {
    const { status } = req.body;
    try {
      const result = db.prepare(
        'UPDATE consultation_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ?'
      ).run(status, req.params.requestId);
      if (result.changes === 0) return res.status(404).json({ error: 'Consultation request not found' });
      res.json({ message: 'Updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update consultation request' });
    }
  });

  // ── GET /sessions ─────────────────────────────────────────────────────────────
  router.get('/sessions', (req, res) => {
    try {
      const sessions = db.prepare(`
        SELECT cs.*, u.full_name as advocate_name
        FROM consultation_sessions cs
        LEFT JOIN advocates a ON cs.advocate_id = a.advocate_id
        LEFT JOIN users u ON a.user_id = u.user_id
        ORDER BY cs.scheduled_date DESC, cs.scheduled_time DESC
      `).all();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch consultation sessions' });
    }
  });

  // ── GET /sessions/:advocateId ────────────────────────────────────────────────
  router.get('/sessions/:advocateId', (req, res) => {
    try {
      const sessions = db.prepare(`
        SELECT cs.*, u.full_name as advocate_name
        FROM consultation_sessions cs
        LEFT JOIN advocates a ON cs.advocate_id = a.advocate_id
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE cs.advocate_id = ?
        ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
      `).all(req.params.advocateId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch consultation sessions' });
    }
  });

  // ── POST /sessions — Direct session creation (internal/CRM use) ──────────────
  router.post('/sessions', (req, res) => {
    const { advocate_id, client_name, client_phone, client_email, scheduled_date, scheduled_time, duration_minutes, session_mode, notes, request_id } = req.body;
    if (!advocate_id || !client_name || !client_phone) {
      return res.status(400).json({ error: 'Advocate, client name, and phone are required' });
    }
    try {
      const session = createSessionRecord({ request_id, advocate_id, client_name, client_phone, client_email, scheduled_date, scheduled_time, duration_minutes, session_mode, notes });
      res.status(201).json({ ...session, message: 'Session created successfully' });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: error.message || 'Failed to create session' });
    }
  });

  // ── GET /:sessionId/details ──────────────────────────────────────────────────
  router.get('/:sessionId/details', authenticateToken, (req, res) => {
    try {
      const session = db.prepare(`
        SELECT cs.*,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cs.advocate_id) as advocate_name,
          (SELECT u.email FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cs.advocate_id) as advocate_email
        FROM consultation_sessions cs
        WHERE cs.session_id = ?
      `).get(req.params.sessionId);
      if (!session) return res.status(404).json({ error: 'Session not found' });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  return router;
};
