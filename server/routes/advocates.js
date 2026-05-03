const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  // Get all advocates
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

      if (state && state !== 'all') {
        query += ' AND a.state = ?';
        params.push(state);
      }

      if (spec && spec !== 'all') {
        query += ' AND a.specializations LIKE ?';
        params.push(`%${spec}%`);
      }

      if (available === 'true') {
        query += ' AND a.is_available = 1';
      }

      query += ' ORDER BY a.rating DESC, a.review_count DESC';

      const advocates = db.prepare(query).all(...params);

      // Parse JSON fields
      const formatted = advocates.map(adv => ({
        ...adv,
        specializations: JSON.parse(adv.specializations),
        languages: JSON.parse(adv.languages)
      }));

      res.json(formatted);
    } catch (error) {
      console.error('Error fetching advocates:', error);
      res.status(500).json({ error: 'Failed to fetch advocates' });
    }
  });

  // Get advocate by ID
  router.get('/:id', (req, res) => {
    const { id } = req.params;

    try {
      const advocate = db.prepare(`
        SELECT a.*, u.full_name, u.email
        FROM advocates a
        JOIN users u ON a.user_id = u.user_id
        WHERE a.advocate_id = ?
      `).get(id);

      if (!advocate) {
        return res.status(404).json({ error: 'Advocate not found' });
      }

      // Parse JSON fields
      advocate.specializations = JSON.parse(advocate.specializations);
      advocate.languages = JSON.parse(advocate.languages);

      // Get reviews
      const reviews = db.prepare(`
        SELECT * FROM advocate_reviews
        WHERE advocate_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(id);

      advocate.reviews = reviews;

      res.json(advocate);
    } catch (error) {
      console.error('Error fetching advocate:', error);
      res.status(500).json({ error: 'Failed to fetch advocate' });
    }
  });

  // Get advocate availability
  router.get('/:id/availability', (req, res) => {
    const { id } = req.params;

    try {
      const availability = db.prepare(`
        SELECT day_of_week, is_available
        FROM advocate_availability
        WHERE advocate_id = ?
        ORDER BY day_of_week
      `).all(id);

      res.json(availability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  });

  // Update advocate availability
  router.put('/:id/availability', (req, res) => {
    const { id } = req.params;
    const { availability } = req.body;

    try {
      // Delete existing availability
      db.prepare('DELETE FROM advocate_availability WHERE advocate_id = ?').run(id);

      // Insert new availability
      const stmt = db.prepare(`
        INSERT INTO advocate_availability (advocate_id, day_of_week, is_available)
        VALUES (?, ?, ?)
      `);

      for (const day of availability) {
        stmt.run(id, day.day_of_week, day.is_available ? 1 : 0);
      }

      res.json({ message: 'Availability updated successfully' });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ error: 'Failed to update availability' });
    }
  });

  // Get advocate earnings
  router.get('/:id/earnings', (req, res) => {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    try {
      let dateFilter = '';
      if (period === 'month') {
        dateFilter = "AND cs.scheduled_date >= date('now', '-30 days')";
      } else if (period === 'year') {
        dateFilter = "AND cs.scheduled_date >= date('now', '-1 year')";
      }

      const earnings = db.prepare(`
        SELECT
          COALESCE(SUM(ae.amount), 0) as total_earnings,
          COUNT(cs.session_id) as total_sessions,
          COALESCE(AVG(cs.duration_minutes), 0) as avg_session_length
        FROM consultation_sessions cs
        LEFT JOIN advocate_earnings ae ON ae.session_id = cs.session_id
        WHERE cs.advocate_id = ? AND cs.status = 'completed'
        ${dateFilter}
      `).get(id);

      res.json({
        total_earnings: earnings.total_earnings || 0,
        total_sessions: earnings.total_sessions || 0,
        avg_session_length: earnings.avg_session_length || 0,
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
      res.status(500).json({ error: 'Failed to fetch earnings' });
    }
  });

  return router;
};