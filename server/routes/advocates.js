const express = require('express');
const { authenticateToken } = require('../middleware/auth');

// Standard consultation slots the platform offers (24-hour)
const ALL_SLOTS_24 = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toMinutes(time24) {
  const [h, m] = time24.split(':').map(Number);
  return h * 60 + m;
}

function fmt12h(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

module.exports = function (db) {
  const router = express.Router();

  // ── GET / — List verified advocates (with optional filters) ─────────────────
  router.get('/', (req, res) => {
    const { state, spec, available } = req.query;
    try {
      let query = `
        SELECT a.*, u.full_name, u.email
        FROM advocates a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.is_verified = 1
      `;
      const params = [];
      if (state && state !== 'all') { query += ' AND a.state = ?'; params.push(state); }
      if (spec && spec !== 'all') { query += ' AND a.specializations LIKE ?'; params.push(`%${spec}%`); }
      if (available === 'true') { query += ' AND a.is_available = 1'; }
      query += ' ORDER BY a.rating DESC, a.review_count DESC';

      const advocates = db.prepare(query).all(...params).map(adv => ({
        ...adv,
        specializations: JSON.parse(adv.specializations),
        languages: JSON.parse(adv.languages),
      }));
      res.json(advocates);
    } catch (err) {
      console.error('Error fetching advocates:', err);
      res.status(500).json({ error: 'Failed to fetch advocates' });
    }
  });

  // ── GET /on-call — Random available advocate ─────────────────────────────────
  router.get('/on-call', (req, res) => {
    try {
      const advocate = db.prepare(`
        SELECT a.*, u.full_name, u.email FROM advocates a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.is_verified = 1 AND a.is_available = 1
        ORDER BY RANDOM() LIMIT 1
      `).get();
      if (!advocate) return res.status(404).json({ error: 'No on-call advocate available' });
      advocate.specializations = JSON.parse(advocate.specializations);
      advocate.languages = JSON.parse(advocate.languages);
      res.json(advocate);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch on-call advocate' });
    }
  });

  // ── GET /:id/available-slots?date=YYYY-MM-DD ─────────────────────────────────
  // Returns which time slots are available for a given advocate on a given date.
  // Accounts for: working hours, day-off, and already-booked sessions.
  router.get('/:id/available-slots', (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date required (YYYY-MM-DD)' });
    }

    // Reject past dates
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({ date, is_available: false, reason: 'past', slots: [] });
    }

    try {
      const dayOfWeek = DAY_NAMES[new Date(date + 'T12:00:00').getDay()];

      // Look up the advocate's schedule for this day
      // Gracefully handle DBs that don't yet have start_time/end_time columns
      let avail = null;
      try {
        avail = db.prepare(`
          SELECT is_available, start_time, end_time
          FROM advocate_availability
          WHERE advocate_id = ? AND day_of_week = ?
        `).get(id, dayOfWeek);
      } catch (_) {
        // Columns may be missing on older DBs — fall back to is_available only
        const row = db.prepare(`
          SELECT is_available
          FROM advocate_availability
          WHERE advocate_id = ? AND day_of_week = ?
        `).get(id, dayOfWeek);
        if (row) avail = { is_available: row.is_available, start_time: '09:00', end_time: '18:00' };
      }

      // If no record exists, treat Mon–Sat as available 09:00–18:00, Sunday off
      const defaultAvail = dayOfWeek !== 'Sun';
      const isAvailable = avail ? Boolean(avail.is_available) : defaultAvail;

      if (!isAvailable) {
        return res.json({
          date,
          day_of_week: dayOfWeek,
          is_available: false,
          reason: 'day_off',
          working_hours: null,
          slots: [],
        });
      }

      const startTime = avail?.start_time || '09:00';
      const endTime = avail?.end_time || '18:00';
      const startMin = toMinutes(startTime);
      const endMin = toMinutes(endTime);

      // Filter standard slots to those within working hours
      const slotsInWindow = ALL_SLOTS_24.filter(slot => {
        const m = toMinutes(slot);
        return m >= startMin && m + 30 <= endMin;
      });

      // Get sessions already booked on this date (not cancelled/completed)
      const booked = db.prepare(`
        SELECT scheduled_time FROM consultation_sessions
        WHERE advocate_id = ? AND scheduled_date = ?
          AND status NOT IN ('cancelled', 'completed')
      `).all(id, date);

      const bookedSet = new Set(booked.map(s => s.scheduled_time));

      const slots = slotsInWindow.map(t24 => ({
        time_24: t24,
        time_display: fmt12h(t24),
        is_booked: bookedSet.has(t24),
        is_available: !bookedSet.has(t24),
      }));

      const availableCount = slots.filter(s => s.is_available).length;

      res.json({
        date,
        day_of_week: dayOfWeek,
        is_available: true,
        working_hours: { start: startTime, end: endTime, start_display: fmt12h(startTime), end_display: fmt12h(endTime) },
        total_slots: slots.length,
        available_count: availableCount,
        slots,
      });
    } catch (err) {
      console.error('Error fetching available slots:', err);
      res.status(500).json({ error: 'Failed to fetch available slots', detail: err.message });
    }
  });

  // ── GET /:id — Single advocate detail ────────────────────────────────────────
  router.get('/:id', (req, res) => {
    try {
      const advocate = db.prepare(`
        SELECT a.*, u.full_name, u.email
        FROM advocates a JOIN users u ON a.user_id = u.user_id
        WHERE a.advocate_id = ?
      `).get(req.params.id);

      if (!advocate) return res.status(404).json({ error: 'Advocate not found' });

      advocate.specializations = JSON.parse(advocate.specializations);
      advocate.languages = JSON.parse(advocate.languages);
      advocate.reviews = db.prepare(
        'SELECT * FROM advocate_reviews WHERE advocate_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(req.params.id);

      res.json(advocate);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch advocate' });
    }
  });

  // ── GET /:id/availability — Weekly schedule ──────────────────────────────────
  router.get('/:id/availability', (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT day_of_week, is_available, start_time, end_time
        FROM advocate_availability
        WHERE advocate_id = ?
        ORDER BY CASE day_of_week
          WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
          WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6
          WHEN 'Sun' THEN 7 END
      `).all(req.params.id);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  });

  // ── PUT /:id/availability — Save weekly schedule (advocate only) ─────────────
  // Body: { availability: [{day_of_week, is_available, start_time, end_time}] }
  router.put('/:id/availability', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { availability } = req.body;

    if (!Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({ error: 'availability array required' });
    }

    // Advocates can only update their own schedule
    const advocate = db.prepare('SELECT advocate_id FROM advocates WHERE advocate_id = ? AND user_id = ?').get(id, req.user.user_id);
    const isPartner = ['managing_partner', 'advisor'].includes(req.user.role);
    if (!advocate && !isPartner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      db.prepare('DELETE FROM advocate_availability WHERE advocate_id = ?').run(id);

      const ins = db.prepare(`
        INSERT INTO advocate_availability (availability_id, advocate_id, day_of_week, is_available, start_time, end_time)
        VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
                substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || '-' ||
                lower(hex(randomblob(6))), ?, ?, ?, ?, ?)
      `);

      const tx = db.transaction(() => {
        for (const day of availability) {
          ins.run(
            id,
            day.day_of_week,
            day.is_available ? 1 : 0,
            day.start_time || '09:00',
            day.end_time || '18:00',
          );
        }
      });
      tx();

      res.json({ message: 'Schedule updated successfully' });
    } catch (err) {
      console.error('Error updating availability:', err);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  // ── GET /:id/earnings ────────────────────────────────────────────────────────
  router.get('/:id/earnings', (req, res) => {
    const { period = 'month' } = req.query;
    try {
      const dateFilter = period === 'month'
        ? "AND cs.scheduled_date >= date('now', '-30 days')"
        : period === 'year' ? "AND cs.scheduled_date >= date('now', '-1 year')" : '';

      const earnings = db.prepare(`
        SELECT COALESCE(SUM(ae.amount), 0) as total_earnings,
               COUNT(cs.session_id) as total_sessions,
               COALESCE(AVG(cs.duration_minutes), 0) as avg_session_length
        FROM consultation_sessions cs
        LEFT JOIN advocate_earnings ae ON ae.session_id = cs.session_id
        WHERE cs.advocate_id = ? AND cs.status = 'completed' ${dateFilter}
      `).get(req.params.id);

      res.json({
        total_earnings: earnings.total_earnings || 0,
        total_sessions: earnings.total_sessions || 0,
        avg_session_length: earnings.avg_session_length || 0,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  });

  return router;
};
