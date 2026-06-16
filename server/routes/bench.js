const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const BENCH_SERVICES = [
  { id: 'review',  name: 'Case Review',          duration: '60 min call', icon: '📋',
    desc: 'The judge reviews the structured notes from your intake call and gives a frank judicial assessment of where your case stands.' },
  { id: 'second',  name: 'Second Opinion',        duration: '45 min call', icon: '🔍',
    desc: "Share your advocate's strategy. The judge gives an independent view on whether the approach is sound — and what they would do differently." },
  { id: 'prehear', name: 'Pre-Hearing Readiness', duration: '45 min call', icon: '⚖️',
    desc: 'Is your case actually ready to go before court? The judge does a structured readiness check — same rigour they applied from the bench.' },
  { id: 'settle',  name: 'Settlement Assessment', duration: '30 min call', icon: '🤝',
    desc: 'Has the other side made an offer? The judge tells you what courts actually award in comparable cases — so you can decide with full information.' },
];

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

function generateBookingRef() {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `BCH-${num}`;
}

function getAvailableDates() {
  const dates = [];
  const d = new Date();
  d.setDate(d.getDate() + 2);
  while (dates.length < 14) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function parseJudge(j, slotsBooked) {
  return {
    ...j,
    areas: JSON.parse(j.areas || '[]'),
    languages: JSON.parse(j.languages || '[]'),
    slots_booked: slotsBooked,
    slots_left: j.total_slots - slotsBooked,
    is_available: (j.total_slots - slotsBooked) > 0,
  };
}

module.exports = function (sql) {
  const router = express.Router();

  // ── GET /services ──────────────────────────────────────────────
  router.get('/services', (_req, res) => {
    res.json(BENCH_SERVICES);
  });

  // ── GET /judges ────────────────────────────────────────────────
  router.get('/judges', async (req, res) => {
    const { tier, area } = req.query;
    try {
      let query = `SELECT * FROM bench_judges WHERE is_active = 1`;
      const params = [];
      let idx = 1;
      if (tier && tier !== 'all') { query += ` AND tier = $${idx++}`; params.push(tier); }
      if (area && area !== 'all') { query += ` AND areas ILIKE $${idx++}`; params.push(`%${area}%`); }
      query += ` ORDER BY CASE tier WHEN 'hc' THEN 1 WHEN 'district' THEN 2 WHEN 'senior' THEN 3 WHEN 'junior' THEN 4 END, name`;

      const judges = await sql(query, params);
      const monthYear = currentMonthYear();
      const slotRows = await sql`SELECT judge_id, slots_booked FROM bench_judge_slots WHERE month_year = ${monthYear}`;
      const slotMap = {};
      slotRows.forEach(r => { slotMap[r.judge_id] = r.slots_booked; });

      res.json(judges.map(j => parseJudge(j, slotMap[j.judge_id] || 0)));
    } catch (err) {
      console.error('GET /bench/judges:', err);
      res.status(500).json({ error: 'Failed to fetch judges' });
    }
  });

  // ── GET /judges/:id ────────────────────────────────────────────
  router.get('/judges/:id', async (req, res) => {
    try {
      const rows = await sql`SELECT * FROM bench_judges WHERE judge_id = ${req.params.id} AND is_active = 1`;
      if (!rows.length) return res.status(404).json({ error: 'Judge not found' });

      const monthYear = currentMonthYear();
      const slotRows = await sql`SELECT slots_booked FROM bench_judge_slots WHERE judge_id = ${req.params.id} AND month_year = ${monthYear}`;
      const slotsBooked = slotRows[0]?.slots_booked || 0;

      res.json(parseJudge(rows[0], slotsBooked));
    } catch (err) {
      console.error('GET /bench/judges/:id:', err);
      res.status(500).json({ error: 'Failed to fetch judge' });
    }
  });

  // ── GET /judges/:id/slots?date=YYYY-MM-DD ─────────────────────
  router.get('/judges/:id/slots', async (req, res) => {
    const { date } = req.query;
    try {
      let blockedSlots = [];
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const rows = await sql`
          SELECT time_slot FROM bench_blocked_slots
          WHERE judge_id = ${req.params.id} AND slot_date = ${date}
        `;
        blockedSlots = rows.map(r => r.time_slot);

        // Also block slots already booked for this date
        const booked = await sql`
          SELECT preferred_slot FROM bench_bookings
          WHERE judge_id = ${req.params.id} AND preferred_date = ${date}
          AND status NOT IN ('cancelled')
        `;
        booked.forEach(b => {
          if (!blockedSlots.includes(b.preferred_slot)) blockedSlots.push(b.preferred_slot);
        });
      }
      res.json({
        available_dates: getAvailableDates(),
        time_slots: TIME_SLOTS,
        blocked_slots: blockedSlots,
      });
    } catch (err) {
      console.error('GET /bench/judges/:id/slots:', err);
      res.status(500).json({ error: 'Failed to fetch slots' });
    }
  });

  // ── POST /bookings ─────────────────────────────────────────────
  router.post('/bookings', async (req, res) => {
    // Optional auth — attach user if token present
    let userId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
        userId = decoded.user_id;
      } catch (_) { /* anonymous booking is fine */ }
    }

    const {
      judge_id, service_type, preferred_date, preferred_slot, session_format,
      guest_name, guest_phone, guest_email,
    } = req.body;

    if (!judge_id || !service_type || !preferred_date || !preferred_slot || !session_format) {
      return res.status(400).json({ error: 'judge_id, service_type, preferred_date, preferred_slot, session_format are required' });
    }
    if (!userId && (!guest_name || !guest_phone)) {
      return res.status(400).json({ error: 'Name and phone are required for guest bookings' });
    }
    const validServices = ['review', 'second', 'prehear', 'settle'];
    if (!validServices.includes(service_type)) {
      return res.status(400).json({ error: 'Invalid service_type' });
    }

    try {
      // Verify judge exists and has capacity
      const judgeRows = await sql`SELECT * FROM bench_judges WHERE judge_id = ${judge_id} AND is_active = 1`;
      if (!judgeRows.length) return res.status(404).json({ error: 'Judge not found' });
      const judge = judgeRows[0];

      const monthYear = currentMonthYear();
      const slotRows = await sql`SELECT slots_booked FROM bench_judge_slots WHERE judge_id = ${judge_id} AND month_year = ${monthYear}`;
      const slotsBooked = slotRows[0]?.slots_booked || 0;

      if (slotsBooked >= judge.total_slots) {
        return res.status(400).json({ error: 'This judge has no available slots this month' });
      }

      // Check slot not already taken on that date
      const slotTaken = await sql`
        SELECT booking_id FROM bench_bookings
        WHERE judge_id = ${judge_id} AND preferred_date = ${preferred_date}
        AND preferred_slot = ${preferred_slot} AND status NOT IN ('cancelled')
      `;
      if (slotTaken.length) {
        return res.status(400).json({ error: 'This time slot is already booked. Please choose another.' });
      }

      // Generate unique booking ref
      let bookingRef = generateBookingRef();
      const refCheck = await sql`SELECT booking_id FROM bench_bookings WHERE booking_ref = ${bookingRef}`;
      if (refCheck.length) bookingRef = `BCH-${Math.floor(Math.random() * 90000) + 10000}`;

      const bookingId = uuidv4();

      await sql`
        INSERT INTO bench_bookings
          (booking_id, booking_ref, judge_id, user_id, guest_name, guest_phone, guest_email,
           service_type, preferred_date, preferred_slot, session_format, status, created_at, updated_at)
        VALUES
          (${bookingId}, ${bookingRef}, ${judge_id}, ${userId}, ${guest_name || null}, ${guest_phone || null},
           ${guest_email || null}, ${service_type}, ${preferred_date}, ${preferred_slot}, ${session_format},
           'pending', NOW(), NOW())
      `;

      // Increment slot count
      if (slotRows.length) {
        await sql`UPDATE bench_judge_slots SET slots_booked = slots_booked + 1 WHERE judge_id = ${judge_id} AND month_year = ${monthYear}`;
      } else {
        await sql`INSERT INTO bench_judge_slots (slot_id, judge_id, month_year, slots_booked) VALUES (${uuidv4()}, ${judge_id}, ${monthYear}, 1)`;
      }

      // Auto-create lightweight matter for logged-in users
      let matterId = null;
      if (userId) {
        try {
          const clientRows = await sql`SELECT client_id FROM clients WHERE user_id = ${userId}`;
          if (clientRows.length > 0) {
            const clientId = clientRows[0].client_id;
            const year = new Date().getFullYear();
            const countRows = await sql`SELECT COUNT(*) as c FROM matters`;
            const matterRef = `M-${year}-${String(Number(countRows[0].c) + 1).padStart(4, '0')}`;
            matterId = uuidv4();
            const serviceLabel = { review: 'Case Review', second: 'Second Opinion', prehear: 'Pre-Hearing Prep', settle: 'Settlement Assessment' }[service_type] || service_type;
            await sql`
              INSERT INTO matters (matter_id, matter_ref, client_id, user_id, matter_type, title, status, brief, bench_booking_id, vertical_data, created_by)
              VALUES (${matterId}, ${matterRef}, ${clientId}, ${userId}, 'bench',
                      ${'Bench Session: ' + serviceLabel}, 'open', null, ${bookingId},
                      ${JSON.stringify({ service_type, session_format, judge_name: judge.name })}, ${userId})
            `;
            await sql`INSERT INTO matter_advocates (id, matter_id, advocate_id) VALUES (${uuidv4()}, ${matterId}, ${judge.user_id})`;
          }
        } catch (mErr) {
          console.error('[Bench matter auto-create] skipped:', mErr.message);
        }
      }

      res.status(201).json({
        booking_id: bookingId,
        booking_ref: bookingRef,
        status: 'pending',
        judge_name: judge.name,
        preferred_date,
        preferred_slot,
        service_type,
        session_format,
        matter_id: matterId,
      });
    } catch (err) {
      console.error('POST /bench/bookings:', err);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  // ── GET /bookings/ref/:ref ─────────────────────────────────────
  router.get('/bookings/ref/:ref', async (req, res) => {
    try {
      const rows = await sql`
        SELECT b.*, j.name AS judge_name, j.tier, j.city, j.initials
        FROM bench_bookings b
        JOIN bench_judges j ON b.judge_id = j.judge_id
        WHERE b.booking_ref = ${req.params.ref}
      `;
      if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error('GET /bench/bookings/ref/:ref:', err);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  });

  // ── GET /my-sessions (requires auth) ──────────────────────────
  router.get('/my-sessions', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`
        SELECT b.*, j.name AS judge_name, j.tier, j.city, j.initials, j.years_on_bench,
               m.matter_id AS matter_id, m.matter_ref AS matter_ref, cd.case_summary
        FROM bench_bookings b
        JOIN bench_judges j ON b.judge_id = j.judge_id
        LEFT JOIN matters m ON m.bench_booking_id = b.booking_id
        LEFT JOIN bench_case_details cd ON cd.booking_id = b.booking_id
        WHERE b.user_id = ${req.user.user_id}
        ORDER BY b.created_at DESC
      `;
      res.json(rows);
    } catch (err) {
      console.error('GET /bench/my-sessions:', err);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // ── Admin: GET /admin/bookings ─────────────────────────────────
  router.get('/admin/bookings',
    authenticateToken,
    requireRole('managing_partner', 'advisor', 'reception'),
    async (req, res) => {
      const { status } = req.query;
      try {
        let query = `
          SELECT b.*, j.name AS judge_name, j.tier, j.city
          FROM bench_bookings b
          JOIN bench_judges j ON b.judge_id = j.judge_id
          WHERE 1=1
        `;
        const params = [];
        let idx = 1;
        if (status && status !== 'all') { query += ` AND b.status = $${idx++}`; params.push(status); }
        query += ` ORDER BY b.created_at DESC`;

        const rows = await sql(query, params);
        res.json(rows);
      } catch (err) {
        console.error('GET /bench/admin/bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
      }
    }
  );

  // ── Admin: PATCH /admin/bookings/:id ──────────────────────────
  router.patch('/admin/bookings/:id',
    authenticateToken,
    requireRole('managing_partner', 'advisor', 'reception'),
    async (req, res) => {
      const { status, intake_notes, session_notes, confirmed_date, confirmed_slot } = req.body;
      try {
        await sql`
          UPDATE bench_bookings SET
            status         = COALESCE(${status || null}, status),
            intake_notes   = COALESCE(${intake_notes || null}, intake_notes),
            session_notes  = COALESCE(${session_notes || null}, session_notes),
            confirmed_date = COALESCE(${confirmed_date || null}::DATE, confirmed_date),
            confirmed_slot = COALESCE(${confirmed_slot || null}, confirmed_slot),
            updated_at     = NOW()
          WHERE booking_id = ${req.params.id}
        `;
        res.json({ success: true });
      } catch (err) {
        console.error('PATCH /bench/admin/bookings/:id:', err);
        res.status(500).json({ error: 'Failed to update booking' });
      }
    }
  );

  // ── Admin: GET /admin/judges ───────────────────────────────────
  router.get('/admin/judges',
    authenticateToken,
    requireRole('managing_partner', 'advisor'),
    async (req, res) => {
      try {
        const monthYear = currentMonthYear();
        const judges = await sql`
          SELECT * FROM bench_judges
          ORDER BY CASE tier WHEN 'hc' THEN 1 WHEN 'district' THEN 2 WHEN 'senior' THEN 3 WHEN 'junior' THEN 4 END, name
        `;
        const slotRows = await sql`SELECT judge_id, slots_booked FROM bench_judge_slots WHERE month_year = ${monthYear}`;
        const slotMap = {};
        slotRows.forEach(r => { slotMap[r.judge_id] = r.slots_booked; });

        res.json(judges.map(j => parseJudge(j, slotMap[j.judge_id] || 0)));
      } catch (err) {
        console.error('GET /bench/admin/judges:', err);
        res.status(500).json({ error: 'Failed to fetch judges' });
      }
    }
  );

  // ── Admin: GET /admin/stats ────────────────────────────────────
  router.get('/admin/stats',
    authenticateToken,
    requireRole('managing_partner', 'advisor'),
    async (req, res) => {
      try {
        const monthYear = currentMonthYear();
        const totalBookings = await sql`SELECT COUNT(*) AS count FROM bench_bookings`;
        const pendingBookings = await sql`SELECT COUNT(*) AS count FROM bench_bookings WHERE status = 'pending'`;
        const completedBookings = await sql`SELECT COUNT(*) AS count FROM bench_bookings WHERE status = 'completed'`;
        const thisMonth = await sql`
          SELECT COUNT(*) AS count FROM bench_bookings
          WHERE TO_CHAR(created_at, 'YYYY-MM') = ${monthYear}
        `;
        const judgeCount = await sql`SELECT COUNT(*) AS count FROM bench_judges WHERE is_active = 1`;

        res.json({
          total_bookings: Number(totalBookings[0].count),
          pending_bookings: Number(pendingBookings[0].count),
          completed_bookings: Number(completedBookings[0].count),
          bookings_this_month: Number(thisMonth[0].count),
          active_judges: Number(judgeCount[0].count),
        });
      } catch (err) {
        console.error('GET /bench/admin/stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }
  );

  // ── JUDGE ENDPOINTS ────────────────────────────────────────────
  // Judges authenticate via POST /api/auth/login (unified endpoint)

  // ── GET /judge/me (requires auth & judge role) ─────────────────
  router.get('/judge/me', authenticateToken, async (req, res) => {
    if (req.user.role !== 'judge') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const judges = await sql`SELECT * FROM bench_judges WHERE user_id = ${req.user.user_id}`;
      if (!judges.length) {
        return res.status(404).json({ error: 'Judge profile not found' });
      }

      const judge = judges[0];
      const monthYear = currentMonthYear();
      const slotRows = await sql`SELECT slots_booked FROM bench_judge_slots WHERE judge_id = ${judge.judge_id} AND month_year = ${monthYear}`;
      const slotsBooked = slotRows[0]?.slots_booked || 0;

      res.json({
        ...judge,
        areas: JSON.parse(judge.areas || '[]'),
        languages: JSON.parse(judge.languages || '[]'),
        slots_booked: slotsBooked,
        slots_left: judge.total_slots - slotsBooked,
      });
    } catch (err) {
      console.error('GET /bench/judge/me:', err);
      res.status(500).json({ error: 'Failed to fetch judge profile' });
    }
  });

  // ── GET /judge/sessions (requires auth & judge role) ──────────
  router.get('/judge/sessions', authenticateToken, async (req, res) => {
    if (req.user.role !== 'judge') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status } = req.query;
    try {
      const judges = await sql`SELECT judge_id FROM bench_judges WHERE user_id = ${req.user.user_id}`;
      if (!judges.length) {
        return res.status(404).json({ error: 'Judge profile not found' });
      }

      const judgeId = judges[0].judge_id;
      let rows;
      if (status && status !== 'all') {
        rows = await sql`
          SELECT b.*, j.name AS judge_name, j.tier, j.city, j.initials, j.years_on_bench,
                 u.full_name AS client_name, u.email AS client_email, u.phone AS client_phone,
                 m.matter_id AS matter_id, m.matter_ref AS matter_ref
          FROM bench_bookings b
          JOIN bench_judges j ON b.judge_id = j.judge_id
          LEFT JOIN users u ON b.user_id = u.user_id
          LEFT JOIN matters m ON m.bench_booking_id = b.booking_id
          WHERE b.judge_id = ${judgeId} AND b.status = ${status}
          ORDER BY b.preferred_date ASC, b.preferred_slot ASC
        `;
      } else {
        rows = await sql`
          SELECT b.*, j.name AS judge_name, j.tier, j.city, j.initials, j.years_on_bench,
                 u.full_name AS client_name, u.email AS client_email, u.phone AS client_phone,
                 m.matter_id AS matter_id, m.matter_ref AS matter_ref
          FROM bench_bookings b
          JOIN bench_judges j ON b.judge_id = j.judge_id
          LEFT JOIN users u ON b.user_id = u.user_id
          LEFT JOIN matters m ON m.bench_booking_id = b.booking_id
          WHERE b.judge_id = ${judgeId}
          ORDER BY b.preferred_date ASC, b.preferred_slot ASC
        `;
      }

      res.json(rows);
    } catch (err) {
      console.error('GET /bench/judge/sessions:', err);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // ── PATCH /judge/sessions/:id (requires auth & judge role) ────
  router.patch('/judge/sessions/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'judge') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { status, judge_notes, session_notes } = req.body;
    try {
      // Verify judge owns this booking
      const judges = await sql`SELECT judge_id FROM bench_judges WHERE user_id = ${req.user.user_id}`;
      if (!judges.length) {
        return res.status(404).json({ error: 'Judge profile not found' });
      }

      const bookings = await sql`
        SELECT * FROM bench_bookings WHERE booking_id = ${req.params.id} AND judge_id = ${judges[0].judge_id}
      `;
      if (!bookings.length) {
        return res.status(404).json({ error: 'Booking not found or unauthorized' });
      }

      await sql`
        UPDATE bench_bookings SET
          status         = COALESCE(${status || null}, status),
          judge_notes    = COALESCE(${judge_notes || null}, judge_notes),
          session_notes  = COALESCE(${session_notes || null}, session_notes),
          updated_at     = NOW()
        WHERE booking_id = ${req.params.id}
      `;

      res.json({ success: true });
    } catch (err) {
      console.error('PATCH /bench/judge/sessions/:id:', err);
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  // ── GET /judge/sessions/:id/case-details ──────────────────────────
  router.get('/judge/sessions/:id/case-details', authenticateToken, async (req, res) => {
    if (req.user.role !== 'judge') return res.status(403).json({ error: 'Forbidden' });
    try {
      const bookings = await sql`
        SELECT b.booking_id FROM bench_bookings b
        JOIN bench_judges j ON b.judge_id = j.judge_id
        WHERE b.booking_id = ${req.params.id} AND j.user_id = ${req.user.user_id}
      `;
      if (!bookings.length) return res.status(404).json({ error: 'Booking not found or unauthorized' });

      const rows = await sql`
        SELECT cd.*, m.matter_number, m.title AS matter_title, m.status AS matter_status, m.matter_type
        FROM bench_case_details cd
        LEFT JOIN cases m ON cd.linked_matter_id = m.matter_id
        WHERE cd.booking_id = ${req.params.id}
      `;
      res.json(rows[0] || {});
    } catch (err) {
      console.error('GET /bench/judge/sessions/:id/case-details:', err);
      res.status(500).json({ error: 'Failed to fetch case details' });
    }
  });

  // ── PATCH /judge/sessions/:id/case-details ────────────────────────
  router.patch('/judge/sessions/:id/case-details', authenticateToken, async (req, res) => {
    if (req.user.role !== 'judge') return res.status(403).json({ error: 'Forbidden' });
    const { case_summary, linked_matter_ref } = req.body;
    try {
      const bookings = await sql`
        SELECT b.booking_id FROM bench_bookings b
        JOIN bench_judges j ON b.judge_id = j.judge_id
        WHERE b.booking_id = ${req.params.id} AND j.user_id = ${req.user.user_id}
      `;
      if (!bookings.length) return res.status(404).json({ error: 'Booking not found or unauthorized' });

      let matterId = null;
      if (linked_matter_ref) {
        const matters = await sql`SELECT matter_id FROM cases WHERE matter_number = ${linked_matter_ref}`;
        if (matters.length) matterId = matters[0].matter_id;
      }

      const detailId = require('crypto').randomUUID();
      await sql`
        INSERT INTO bench_case_details (detail_id, booking_id, case_summary, linked_matter_id, linked_matter_ref, updated_at)
        VALUES (${detailId}, ${req.params.id}, ${case_summary || null}, ${matterId}, ${linked_matter_ref || null}, NOW())
        ON CONFLICT (booking_id) DO UPDATE SET
          case_summary      = EXCLUDED.case_summary,
          linked_matter_id  = EXCLUDED.linked_matter_id,
          linked_matter_ref = EXCLUDED.linked_matter_ref,
          updated_at        = NOW()
      `;

      res.json({ success: true });
    } catch (err) {
      console.error('PATCH /bench/judge/sessions/:id/case-details:', err);
      res.status(500).json({ error: 'Failed to save case details' });
    }
  });

  // ── GET /bookings/:ref/case-details (client read-only) ────────────
  router.get('/bookings/:ref/case-details', authenticateToken, async (req, res) => {
    try {
      const bookings = await sql`
        SELECT booking_id FROM bench_bookings
        WHERE booking_ref = ${req.params.ref} AND user_id = ${req.user.user_id}
      `;
      if (!bookings.length) return res.status(404).json({ error: 'Booking not found or unauthorized' });

      const rows = await sql`
        SELECT cd.*, m.matter_number, m.title AS matter_title, m.status AS matter_status
        FROM bench_case_details cd
        LEFT JOIN cases m ON cd.linked_matter_id = m.matter_id
        WHERE cd.booking_id = ${bookings[0].booking_id}
      `;
      res.json(rows[0] || {});
    } catch (err) {
      console.error('GET /bench/bookings/:ref/case-details:', err);
      res.status(500).json({ error: 'Failed to fetch case details' });
    }
  });

  // ── PATCH /bookings/:id/client-notes (requires auth, client only) ──
  router.patch('/bookings/:id/client-notes', authenticateToken, async (req, res) => {
    const { client_notes } = req.body;
    try {
      // Verify user is the booking owner
      const bookings = await sql`
        SELECT * FROM bench_bookings WHERE booking_id = ${req.params.id} AND user_id = ${req.user.user_id}
      `;
      if (!bookings.length) {
        return res.status(404).json({ error: 'Booking not found or unauthorized' });
      }

      await sql`
        UPDATE bench_bookings SET
          client_notes = ${client_notes || null},
          updated_at = NOW()
        WHERE booking_id = ${req.params.id}
      `;

      res.json({ success: true });
    } catch (err) {
      console.error('PATCH /bench/bookings/:id/client-notes:', err);
      res.status(500).json({ error: 'Failed to update notes' });
    }
  });

  // ── PATCH /bookings/:id/cancel — client cancels their own pending booking ──
  router.patch('/bookings/:id/cancel', authenticateToken, async (req, res) => {
    try {
      const bookings = await sql`
        SELECT * FROM bench_bookings WHERE booking_id = ${req.params.id} AND user_id = ${req.user.user_id}
      `;
      if (!bookings.length) {
        return res.status(404).json({ error: 'Booking not found or unauthorized' });
      }
      const booking = bookings[0];
      if (!['pending', 'intake_scheduled'].includes(booking.status)) {
        return res.status(400).json({ error: 'This session can no longer be cancelled' });
      }

      await sql`UPDATE bench_bookings SET status = 'cancelled', updated_at = NOW() WHERE booking_id = ${req.params.id}`;

      const monthYear = currentMonthYear();
      await sql`
        UPDATE bench_judge_slots SET slots_booked = GREATEST(slots_booked - 1, 0)
        WHERE judge_id = ${booking.judge_id} AND month_year = ${monthYear}
      `;

      res.json({ success: true });
    } catch (err) {
      console.error('PATCH /bench/bookings/:id/cancel:', err);
      res.status(500).json({ error: 'Failed to cancel booking' });
    }
  });

  return router;
};
