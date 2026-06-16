const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { generateMeetUrl } = require('../googleCalendar');

module.exports = function (sql) {
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

  async function isSlotAvailable(advocate_id, scheduled_date, scheduled_time, duration_minutes) {
    const normalizedTime = normalizeTimeString(scheduled_time);
    if (!normalizedTime) return true;
    const conflict = await sql`
      SELECT session_id FROM consultation_sessions
      WHERE advocate_id = ${advocate_id}
        AND scheduled_date = ${scheduled_date}
        AND status NOT IN ('cancelled', 'completed')
        AND ABS(
          (CAST(SUBSTR(scheduled_time, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(scheduled_time, 4, 2) AS INTEGER)) -
          (CAST(SUBSTR(${normalizedTime}, 1, 2) AS INTEGER) * 60 + CAST(SUBSTR(${normalizedTime}, 4, 2) AS INTEGER))
        ) < ${duration_minutes || 30}
      LIMIT 1
    `;
    return conflict.length === 0;
  }

  async function createSessionRecord({ request_id, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes = 30, session_mode = 'video', notes }) {
    const sessionId = uuidv4();
    const normalizedTime = normalizeTimeString(scheduled_time) || scheduled_time;
    const meeting_link = session_mode === 'video' ? generateMeetUrl(sessionId) : null;

    await sql`
      INSERT INTO consultation_sessions
        (session_id, request_id, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes, session_mode, status, meeting_link, notes)
      VALUES (${sessionId}, ${request_id || null}, ${advocate_id}, ${client_name}, ${client_phone}, ${scheduled_date}, ${normalizedTime}, ${duration_minutes}, ${session_mode}, 'scheduled', ${meeting_link}, ${notes || null})
    `;

    return { session_id: sessionId, advocate_id, client_name, client_phone, scheduled_date, scheduled_time: normalizedTime, duration_minutes, session_mode, status: 'scheduled', meeting_link, notes: notes || null };
  }

  // GET /my-requests
  router.get('/my-requests', authenticateToken, async (req, res) => {
    try {
      const requests = await sql`
        SELECT cr.*, a.city, a.state,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name
        FROM consultation_requests cr
        LEFT JOIN advocates a ON cr.advocate_id = a.advocate_id
        WHERE cr.user_id = ${req.user.user_id}
        ORDER BY cr.submitted_at DESC
      `;
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // GET /requests
  router.get('/requests', async (req, res) => {
    try {
      const requests = await sql`
        SELECT cr.*, a.city, a.state,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name
        FROM consultation_requests cr
        LEFT JOIN advocates a ON cr.advocate_id = a.advocate_id
        ORDER BY cr.submitted_at DESC
      `;
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // GET /requests/:advocateId
  router.get('/requests/:advocateId', async (req, res) => {
    try {
      const requests = await sql`SELECT * FROM consultation_requests WHERE advocate_id = ${req.params.advocateId} ORDER BY submitted_at DESC`;
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // POST /requests
  router.post('/requests', authenticateToken, async (req, res) => {
    const { advocate_id, client_name, client_phone, client_email, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time } = req.body;

    if (!advocate_id || !matter_type) return res.status(400).json({ error: 'Advocate and matter type are required' });
    if (!client_name || !client_phone) return res.status(400).json({ error: 'Client name and phone are required' });
    if (!preferred_date || !preferred_time) return res.status(400).json({ error: 'Preferred date and time are required' });

    try {
      const advocateRows = await sql`SELECT advocate_id FROM advocates WHERE advocate_id = ${advocate_id}`;
      if (advocateRows.length === 0) return res.status(404).json({ error: 'Advocate not found' });

      const normalizedUrgency = urgency === 'urgent' ? 'high' : urgency === 'standard' ? 'normal' : urgency || 'normal';
      const session_mode = ['video', 'phone', 'office'].includes(preferred_mode) ? preferred_mode : 'video';

      if (!(await isSlotAvailable(advocate_id, preferred_date, preferred_time, 30))) {
        return res.status(409).json({ error: 'This time slot is no longer available. Please choose a different time.' });
      }

      const requestId = uuidv4();
      await sql`
        INSERT INTO consultation_requests
          (request_id, user_id, advocate_id, client_name, client_phone, client_email, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time, status)
        VALUES (${requestId}, ${req.user.user_id}, ${advocate_id}, ${client_name.trim()}, ${client_phone.trim()}, ${client_email || null}, ${matter_type}, ${brief || null}, ${normalizedUrgency}, ${session_mode}, ${preferred_date}, ${preferred_time}, 'accepted')
      `;

      const session = await createSessionRecord({
        request_id: requestId, advocate_id,
        client_name: client_name.trim(), client_phone: client_phone.trim(),
        scheduled_date: preferred_date, scheduled_time: preferred_time,
        duration_minutes: 30, session_mode, notes: brief || null,
      });

      // Auto-create a lightweight matter linked to this consultation
      try {
        const year = new Date().getFullYear();
        const countRows = await sql`SELECT COUNT(*) as c FROM matters`;
        const matterRef = `M-${year}-${String(Number(countRows[0].c) + 1).padStart(4, '0')}`;
        const matterId = uuidv4();

        let clientId = null;
        if (req.user?.user_id) {
          const clientRows = await sql`SELECT client_id FROM clients WHERE user_id = ${req.user.user_id}`;
          if (clientRows.length > 0) clientId = clientRows[0].client_id;
        }

        if (clientId) {
          await sql`
            INSERT INTO matters (matter_id, matter_ref, client_id, user_id, matter_type, title, status, brief, consultation_id, created_by)
            VALUES (${matterId}, ${matterRef}, ${clientId}, ${req.user.user_id}, ${matter_type}, ${'Consultation: ' + (brief?.slice(0, 80) || matter_type)}, 'open', ${brief || null}, ${requestId}, ${req.user.user_id})
          `;

          const advUserRows = await sql`SELECT user_id FROM advocates WHERE advocate_id = ${advocate_id}`;
          if (advUserRows.length > 0) {
            await sql`INSERT INTO matter_advocates (id, matter_id, advocate_id) VALUES (${uuidv4()}, ${matterId}, ${advUserRows[0].user_id})`;
          }
        }
      } catch (mErr) {
        console.error('[Matter auto-create] skipped:', mErr.message);
      }

      res.status(201).json({ request_id: requestId, session_id: session.session_id, meeting_link: session.meeting_link, scheduled_date: session.scheduled_date, scheduled_time: session.scheduled_time, session_mode: session.session_mode, message: 'Consultation scheduled successfully.' });
    } catch (err) {
      console.error('Error creating consultation request:', err);
      res.status(500).json({ error: 'Failed to create consultation request' });
    }
  });

  // PUT /requests/:requestId
  router.put('/requests/:requestId', async (req, res) => {
    const { status } = req.body;
    try {
      const rows = await sql`UPDATE consultation_requests SET status = ${status}, updated_at = NOW() WHERE request_id = ${req.params.requestId} RETURNING request_id`;
      if (rows.length === 0) return res.status(404).json({ error: 'Consultation request not found' });
      res.json({ message: 'Updated successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update consultation request' });
    }
  });

  // GET /sessions
  router.get('/sessions', async (req, res) => {
    try {
      const sessions = await sql`
        SELECT cs.*, u.full_name as advocate_name
        FROM consultation_sessions cs
        LEFT JOIN advocates a ON cs.advocate_id = a.advocate_id
        LEFT JOIN users u ON a.user_id = u.user_id
        ORDER BY cs.scheduled_date DESC, cs.scheduled_time DESC
      `;
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch consultation sessions' });
    }
  });

  // GET /sessions/:advocateId
  router.get('/sessions/:advocateId', async (req, res) => {
    try {
      const sessions = await sql`
        SELECT cs.*, u.full_name as advocate_name
        FROM consultation_sessions cs
        LEFT JOIN advocates a ON cs.advocate_id = a.advocate_id
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE cs.advocate_id = ${req.params.advocateId}
        ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
      `;
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch consultation sessions' });
    }
  });

  // POST /sessions
  router.post('/sessions', async (req, res) => {
    const { advocate_id, client_name, client_phone, client_email, scheduled_date, scheduled_time, duration_minutes, session_mode, notes, request_id } = req.body;
    if (!advocate_id || !client_name || !client_phone) return res.status(400).json({ error: 'Advocate, client name, and phone are required' });
    try {
      const session = await createSessionRecord({ request_id, advocate_id, client_name, client_phone, client_email, scheduled_date, scheduled_time, duration_minutes, session_mode, notes });
      res.status(201).json({ ...session, message: 'Session created successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to create session' });
    }
  });

  // GET /:sessionId/details
  router.get('/:sessionId/details', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`
        SELECT cs.*,
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cs.advocate_id) as advocate_name,
          (SELECT u.email FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cs.advocate_id) as advocate_email
        FROM consultation_sessions cs
        WHERE cs.session_id = ${req.params.sessionId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Session not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  return router;
};
