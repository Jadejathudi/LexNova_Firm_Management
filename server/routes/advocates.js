const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

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

module.exports = function (sql) {
  const router = express.Router();

  // GET / — List verified advocates (with optional filters)
  router.get('/', async (req, res) => {
    const { state, spec, available } = req.query;
    try {
      let query = `SELECT a.*, u.full_name, u.email FROM advocates a JOIN users u ON a.user_id = u.user_id WHERE a.is_verified = 1`;
      const params = [];
      let paramIdx = 1;

      if (state && state !== 'all') { query += ` AND a.state = $${paramIdx++}`; params.push(state); }
      if (spec && spec !== 'all')   { query += ` AND LOWER(a.specializations) LIKE LOWER($${paramIdx++})`; params.push(`%${spec}%`); }
      if (available === 'true')     { query += ' AND a.is_available = 1'; }
      query += ' ORDER BY a.rating DESC, a.review_count DESC';

      const advocates = await sql(query, params);
      res.json(advocates.map(adv => ({
        ...adv,
        specializations: JSON.parse(adv.specializations),
        languages: JSON.parse(adv.languages),
      })));
    } catch (err) {
      console.error('Error fetching advocates:', err);
      res.status(500).json({ error: 'Failed to fetch advocates' });
    }
  });

  // GET /on-call
  router.get('/on-call', async (req, res) => {
    try {
      const rows = await sql`
        SELECT a.*, u.full_name, u.email FROM advocates a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.is_verified = 1 AND a.is_available = 1
        ORDER BY RANDOM() LIMIT 1
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'No on-call advocate available' });
      const advocate = rows[0];
      advocate.specializations = JSON.parse(advocate.specializations);
      advocate.languages = JSON.parse(advocate.languages);
      res.json(advocate);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch on-call advocate' });
    }
  });

  // GET /:id/available-slots?date=YYYY-MM-DD
  router.get('/:id/available-slots', async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date required (YYYY-MM-DD)' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.json({ date, is_available: false, reason: 'past', slots: [] });
    }

    try {
      const dayOfWeek = DAY_NAMES[new Date(date + 'T12:00:00').getDay()];

      const availRows = await sql`
        SELECT is_available, start_time, end_time
        FROM advocate_availability
        WHERE advocate_id = ${id} AND day_of_week = ${dayOfWeek}
      `;
      const avail = availRows[0];

      const defaultAvail = dayOfWeek !== 'Sun';
      const isAvailable = avail ? Boolean(avail.is_available) : defaultAvail;

      if (!isAvailable) {
        return res.json({ date, day_of_week: dayOfWeek, is_available: false, reason: 'day_off', working_hours: null, slots: [] });
      }

      const startTime = avail?.start_time || '09:00';
      const endTime   = avail?.end_time   || '18:00';
      const startMin  = toMinutes(startTime);
      const endMin    = toMinutes(endTime);

      const slotsInWindow = ALL_SLOTS_24.filter(slot => {
        const m = toMinutes(slot);
        return m >= startMin && m + 30 <= endMin;
      });

      const booked = await sql`
        SELECT scheduled_time FROM consultation_sessions
        WHERE advocate_id = ${id} AND scheduled_date = ${date}
          AND status NOT IN ('cancelled', 'completed')
      `;
      const bookedSet = new Set(booked.map(s => s.scheduled_time));

      const slots = slotsInWindow.map(t24 => ({
        time_24: t24,
        time_display: fmt12h(t24),
        is_booked: bookedSet.has(t24),
        is_available: !bookedSet.has(t24),
      }));

      res.json({
        date,
        day_of_week: dayOfWeek,
        is_available: true,
        working_hours: { start: startTime, end: endTime, start_display: fmt12h(startTime), end_display: fmt12h(endTime) },
        total_slots: slots.length,
        available_count: slots.filter(s => s.is_available).length,
        slots,
      });
    } catch (err) {
      console.error('Error fetching available slots:', err);
      res.status(500).json({ error: 'Failed to fetch available slots', detail: err.message });
    }
  });

  // GET /:id — Single advocate detail
  router.get('/:id', async (req, res) => {
    try {
      const rows = await sql`
        SELECT a.*, u.full_name, u.email
        FROM advocates a JOIN users u ON a.user_id = u.user_id
        WHERE a.advocate_id = ${req.params.id}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Advocate not found' });
      const advocate = { ...rows[0] };
      advocate.specializations = JSON.parse(advocate.specializations);
      advocate.languages = JSON.parse(advocate.languages);
      advocate.reviews = await sql`SELECT * FROM advocate_reviews WHERE advocate_id = ${req.params.id} ORDER BY created_at DESC LIMIT 10`;
      res.json(advocate);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch advocate' });
    }
  });

  // PUT /:id — update advocate details (managing partner / advisor)
  router.put('/:id', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    const { id } = req.params;
    const {
      full_name, email, phone, role,
      bar_number, experience_years, specializations,
      state, city, bio, languages, profile_photo, is_verified, is_available,
    } = req.body;

    if (!full_name || !email || !phone || !bar_number || !experience_years || !state || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const advocateRows = await sql`
        SELECT a.advocate_id, a.user_id, a.bar_number, u.email, u.phone
        FROM advocates a JOIN users u ON a.user_id = u.user_id
        WHERE a.advocate_id = ${id}
      `;
      if (advocateRows.length === 0) return res.status(404).json({ error: 'Advocate not found' });

      const current = advocateRows[0];
      const dupUser = await sql`
        SELECT user_id FROM users
        WHERE (email = ${email} OR phone = ${phone}) AND user_id != ${current.user_id}
      `;
      if (dupUser.length) return res.status(409).json({ error: 'Email or phone already in use' });

      const dupBar = await sql`
        SELECT advocate_id FROM advocates
        WHERE bar_number = ${bar_number} AND advocate_id != ${id}
      `;
      if (dupBar.length) return res.status(409).json({ error: 'Bar number already registered' });

      const normalizedSpecs = Array.isArray(specializations)
        ? JSON.stringify(specializations)
        : JSON.stringify((specializations || []).length ? specializations : []);
      const normalizedLanguages = Array.isArray(languages)
        ? JSON.stringify(languages)
        : JSON.stringify(String(languages || '').split(',').map(x => x.trim()).filter(Boolean));

      await sql`
        UPDATE users
        SET full_name = ${full_name}, email = ${email}, phone = ${phone}, role = ${role || 'senior_advocate'}, updated_at = NOW()
        WHERE user_id = ${current.user_id}
      `;

      await sql`
        UPDATE advocates
        SET bar_number = ${bar_number},
            experience_years = ${parseInt(experience_years, 10)},
            specializations = ${normalizedSpecs},
            state = ${state},
            city = ${city},
            bio = ${bio || ''},
            languages = ${normalizedLanguages},
            profile_photo = ${profile_photo || null},
            is_verified = ${is_verified ? 1 : 0},
            is_available = ${is_available ? 1 : 0}
        WHERE advocate_id = ${id}
      `;

      res.json({ message: 'Advocate updated successfully' });
    } catch (err) {
      console.error('Update advocate error:', err);
      res.status(500).json({ error: 'Failed to update advocate' });
    }
  });

  // DELETE /:id — deactivate advocate from managing partner UI
  router.delete('/:id', authenticateToken, requireRole('managing_partner', 'advisor'), async (req, res) => {
    const { id } = req.params;

    try {
      const advocateRows = await sql`
        SELECT a.user_id FROM advocates a WHERE a.advocate_id = ${id}
      `;
      if (advocateRows.length === 0) return res.status(404).json({ error: 'Advocate not found' });

      await sql`DELETE FROM advocate_availability WHERE advocate_id = ${id}`;
      await sql`DELETE FROM advocates WHERE advocate_id = ${id}`;
      await sql`UPDATE users SET is_active = 0 WHERE user_id = ${advocateRows[0].user_id}`;

      res.json({ message: 'Advocate deleted successfully' });
    } catch (err) {
      console.error('Delete advocate error:', err);
      res.status(500).json({ error: 'Failed to delete advocate' });
    }
  });

  // GET /:id/availability
  router.get('/:id/availability', async (req, res) => {
    try {
      const rows = await sql`
        SELECT day_of_week, is_available, start_time, end_time
        FROM advocate_availability
        WHERE advocate_id = ${req.params.id}
        ORDER BY CASE day_of_week
          WHEN 'Mon' THEN 1 WHEN 'Tue' THEN 2 WHEN 'Wed' THEN 3
          WHEN 'Thu' THEN 4 WHEN 'Fri' THEN 5 WHEN 'Sat' THEN 6
          WHEN 'Sun' THEN 7 END
      `;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  });

  // PUT /:id/availability
  router.put('/:id/availability', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { availability } = req.body;

    if (!Array.isArray(availability) || availability.length === 0) {
      return res.status(400).json({ error: 'availability array required' });
    }

    const advocateRows = await sql`SELECT advocate_id FROM advocates WHERE advocate_id = ${id} AND user_id = ${req.user.user_id}`;
    const isPartner = ['managing_partner', 'advisor'].includes(req.user.role);
    if (advocateRows.length === 0 && !isPartner) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      await sql`DELETE FROM advocate_availability WHERE advocate_id = ${id}`;
      for (const day of availability) {
        await sql`
          INSERT INTO advocate_availability (availability_id, advocate_id, day_of_week, is_available, start_time, end_time)
          VALUES (${uuidv4()}, ${id}, ${day.day_of_week}, ${day.is_available ? 1 : 0}, ${day.start_time || '09:00'}, ${day.end_time || '18:00'})
        `;
      }
      res.json({ message: 'Schedule updated successfully' });
    } catch (err) {
      console.error('Error updating availability:', err);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  });

  // GET /:id/earnings
  router.get('/:id/earnings', async (req, res) => {
    const { period = 'month' } = req.query;
    try {
      let rows;
      if (period === 'month') {
        rows = await sql`
          SELECT COALESCE(SUM(ae.amount), 0) as total_earnings,
                 COUNT(cs.session_id) as total_sessions,
                 COALESCE(AVG(cs.duration_minutes), 0) as avg_session_length
          FROM consultation_sessions cs
          LEFT JOIN advocate_earnings ae ON ae.session_id = cs.session_id
          WHERE cs.advocate_id = ${req.params.id} AND cs.status = 'completed'
            AND cs.scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
        `;
      } else if (period === 'year') {
        rows = await sql`
          SELECT COALESCE(SUM(ae.amount), 0) as total_earnings,
                 COUNT(cs.session_id) as total_sessions,
                 COALESCE(AVG(cs.duration_minutes), 0) as avg_session_length
          FROM consultation_sessions cs
          LEFT JOIN advocate_earnings ae ON ae.session_id = cs.session_id
          WHERE cs.advocate_id = ${req.params.id} AND cs.status = 'completed'
            AND cs.scheduled_date >= CURRENT_DATE - INTERVAL '1 year'
        `;
      } else {
        rows = await sql`
          SELECT COALESCE(SUM(ae.amount), 0) as total_earnings,
                 COUNT(cs.session_id) as total_sessions,
                 COALESCE(AVG(cs.duration_minutes), 0) as avg_session_length
          FROM consultation_sessions cs
          LEFT JOIN advocate_earnings ae ON ae.session_id = cs.session_id
          WHERE cs.advocate_id = ${req.params.id} AND cs.status = 'completed'
        `;
      }
      const e = rows[0];
      res.json({
        total_earnings:    parseFloat(e.total_earnings)    || 0,
        total_sessions:    Number(e.total_sessions)        || 0,
        avg_session_length: parseFloat(e.avg_session_length) || 0,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  });

  // POST /admin/create — managing partner creates a new advocate account + profile
  router.post('/admin/create', authenticateToken, requireRole('managing_partner'), async (req, res) => {
    const {
      full_name, email, phone, password, role,
      bar_number, experience_years, specializations,
      state, city, bio, languages, profile_photo, is_verified,
    } = req.body;

    if (!full_name || !email || !phone || !password || !bar_number || !experience_years || !state || !city) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const dupUser = await sql`SELECT user_id FROM users WHERE email = ${email} OR phone = ${phone}`;
      if (dupUser.length) return res.status(409).json({ error: 'Email or phone already in use' });

      const dupBar = await sql`SELECT advocate_id FROM advocates WHERE bar_number = ${bar_number}`;
      if (dupBar.length) return res.status(409).json({ error: 'Bar number already registered' });

      const user_id = uuidv4();
      const advocate_id = uuidv4();
      const password_hash = bcrypt.hashSync(password, 10);
      const advocateRole = role || 'senior_advocate';

      await sql`
        INSERT INTO users (user_id, full_name, email, phone, role, password_hash, is_active)
        VALUES (${user_id}, ${full_name}, ${email}, ${phone}, ${advocateRole}, ${password_hash}, 1)
      `;

      await sql`
        INSERT INTO advocates (
          advocate_id, user_id, bar_number, experience_years, specializations,
          state, city, bio, languages, profile_photo, is_verified, is_available
        ) VALUES (
          ${advocate_id}, ${user_id}, ${bar_number}, ${parseInt(experience_years)},
          ${JSON.stringify(specializations || [])}, ${state}, ${city},
          ${bio || ''}, ${JSON.stringify(languages || [])},
          ${profile_photo || null}, ${is_verified ? 1 : 0}, 1
        )
      `;

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (const day of days) {
        await sql`
          INSERT INTO advocate_availability (availability_id, advocate_id, day_of_week, is_available, start_time, end_time)
          VALUES (${uuidv4()}, ${advocate_id}, ${day}, 1, '09:00', '18:00')
        `;
      }

      res.status(201).json({ user_id, advocate_id, full_name, message: 'Advocate created successfully' });
    } catch (err) {
      console.error('Create advocate error:', err);
      res.status(500).json({ error: 'Failed to create advocate' });
    }
  });

  return router;
};
