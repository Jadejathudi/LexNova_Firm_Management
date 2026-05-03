const express = require('express');
const { v4: uuidv4 } = require('uuid');

module.exports = function (db) {
  const router = express.Router();

  // Get ALL consultation requests (for CRM dashboard)
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

  // Get consultation requests for a specific advocate
  router.get('/requests/:advocateId', (req, res) => {
    const { advocateId } = req.params;

    try {
      const requests = db.prepare(`
        SELECT * FROM consultation_requests
        WHERE advocate_id = ?
        ORDER BY submitted_at DESC
      `).all(advocateId);

      res.json(requests);
    } catch (error) {
      console.error('Error fetching consultation requests:', error);
      res.status(500).json({ error: 'Failed to fetch consultation requests' });
    }
  });

  // Create a new consultation request
  router.post('/requests', (req, res) => {
    const { advocate_id, client_name, client_phone, client_email, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time } = req.body;

    if (!advocate_id || !client_name || !client_phone || !matter_type) {
      return res.status(400).json({ error: 'Advocate, name, phone, and matter type are required' });
    }
    if (!/^\d{10}$/.test(client_phone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }

    // Verify advocate exists
    const advocateExists = db.prepare('SELECT advocate_id FROM advocates WHERE advocate_id = ?').get(advocate_id);
    if (!advocateExists) {
      return res.status(404).json({ error: 'Advocate not found' });
    }

    try {
      const requestId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO consultation_requests (request_id, advocate_id, client_name, client_phone, client_email, matter_type, brief, urgency, preferred_mode, preferred_date, preferred_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(requestId, advocate_id, client_name, client_phone, client_email || null, matter_type, brief || null, urgency || 'standard', preferred_mode || 'video', preferred_date, preferred_time);

      res.status(201).json({ request_id: requestId, message: 'Your free 30-minute consultation is confirmed. The advocate will contact you within 2 hours.' });
    } catch (error) {
      console.error('Error creating consultation request:', error);
      res.status(500).json({ error: 'Failed to create consultation request' });
    }
  });

  // Update consultation request status
  router.put('/requests/:requestId', (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;

    try {
      const stmt = db.prepare(`
        UPDATE consultation_requests
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = ?
      `);

      const result = stmt.run(status, requestId);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Consultation request not found' });
      }

      res.json({ message: 'Consultation request updated successfully' });
    } catch (error) {
      console.error('Error updating consultation request:', error);
      res.status(500).json({ error: 'Failed to update consultation request' });
    }
  });

  // Get consultation sessions for an advocate
  router.get('/sessions/:advocateId', (req, res) => {
    const { advocateId } = req.params;

    try {
      const sessions = db.prepare(`
        SELECT * FROM consultation_sessions
        WHERE advocate_id = ?
        ORDER BY scheduled_date DESC
      `).all(advocateId);

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching consultation sessions:', error);
      res.status(500).json({ error: 'Failed to fetch consultation sessions' });
    }
  });

  // Create a new consultation session
  router.post('/sessions', (req, res) => {
    const { advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes, session_mode, notes, request_id } = req.body;

    try {
      const sessionId = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO consultation_sessions (session_id, request_id, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes, session_mode, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(sessionId, request_id || null, advocate_id, client_name, client_phone, scheduled_date, scheduled_time, duration_minutes || 30, session_mode || 'video', notes || null);

      res.status(201).json({ session_id: sessionId, message: 'Consultation session created successfully' });
    } catch (error) {
      console.error('Error creating consultation session:', error);
      res.status(500).json({ error: 'Failed to create consultation session' });
    }
  });

  return router;
};
