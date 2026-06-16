const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (sql) {
  const router = express.Router();

  // GET /api/dashboard
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'), async (req, res) => {
    try {
      const [amRows, hwRows, oiRows, rmRows, trRows, tcRows, tconRows] = await Promise.all([
        sql`SELECT COUNT(*) as c FROM cases WHERE status != 'closed'`,
        sql`SELECT COUNT(*) as c FROM hearings WHERE hearing_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
        sql`SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'`,
        sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', NOW())`,
        sql`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid'`,
        sql`SELECT COUNT(*) as c FROM clients`,
        sql`SELECT COUNT(*) as c FROM consultations`,
      ]);

      const advocates = await sql`
        SELECT u.user_id, u.full_name, u.role,
          (SELECT COUNT(*) FROM matter_assignments ma
           JOIN cases m ON ma.matter_id = m.matter_id
           WHERE ma.advocate_id = u.user_id AND ma.is_active = 1 AND m.status != 'closed') as active_cases
        FROM users u
        WHERE u.role IN ('senior_advocate', 'junior_advocate') AND u.is_active = 1
        ORDER BY active_cases DESC
      `;

      const recentActivity = await sql`
        SELECT al.action, al.resource_type, al.timestamp, u.full_name as actor_name
        FROM audit_logs al JOIN users u ON al.actor_id = u.user_id
        ORDER BY al.timestamp DESC LIMIT 10
      `;

      const staleMatters = await sql`
        SELECT matter_id, matter_number, title, status, created_at
        FROM cases WHERE status NOT IN ('closed', 'judgment')
        ORDER BY created_at ASC LIMIT 5
      `;

      res.json({
        stats: {
          active_matters:       Number(amRows[0].c),
          hearings_this_week:   Number(hwRows[0].c),
          overdue_invoices:     Number(oiRows[0].c),
          revenue_this_month:   parseFloat(rmRows[0].total) || 0,
          total_revenue:        parseFloat(trRows[0].total) || 0,
          total_clients:        Number(tcRows[0].c),
          total_consultations:  Number(tconRows[0].c),
        },
        advocate_workloads: advocates.map(a => ({ ...a, active_cases: Number(a.active_cases) })),
        recent_activity: recentActivity,
        stale_matters: staleMatters,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/dashboard/client
  router.get('/client', authenticateToken, async (req, res) => {
    try {
      const clientRows = await sql`SELECT * FROM clients WHERE user_id = ${req.user.user_id}`;
      const client = clientRows[0];
      if (!client) {
        return res.json({ client: null, matters: [], upcoming_hearings: [], consultation_requests: [], consultation_sessions: [], unread_messages: 0, pending_invoices: [] });
      }

      const mattersRaw = await sql`
        SELECT m.*,
          (SELECT u.full_name FROM matter_assignments ma JOIN users u ON ma.advocate_id = u.user_id
           WHERE ma.matter_id = m.matter_id AND ma.role_on_matter = 'lead_senior' AND ma.is_active = 1 LIMIT 1) as lead_advocate
        FROM cases m WHERE m.client_id = ${client.client_id}
        ORDER BY m.urgency DESC, m.created_at DESC
      `;

      const matters = await Promise.all(mattersRaw.map(async m => {
        const nh = await sql`
          SELECT hearing_date, hearing_time, court_name FROM hearings
          WHERE matter_id = ${m.matter_id} AND hearing_date >= CURRENT_DATE
          ORDER BY hearing_date ASC LIMIT 1
        `;
        return { ...m, next_hearing: nh[0] || null };
      }));

      const [upcomingHearings, consultationRequests, consultationSessions, unreadRows, pendingInvoices, lightMatters] = await Promise.all([
        sql`
          SELECT h.*, m.matter_number, m.title FROM hearings h
          JOIN cases m ON h.matter_id = m.matter_id
          WHERE m.client_id = ${client.client_id} AND h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC LIMIT 5
        `,
        sql`
          SELECT cr.*,
            (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name,
            (SELECT COALESCE(a.city, '') || ', ' || COALESCE(a.state, '') FROM advocates a WHERE a.advocate_id = cr.advocate_id) as advocate_location
          FROM consultation_requests cr
          WHERE cr.user_id = ${req.user.user_id}
          ORDER BY cr.submitted_at DESC
        `,
        sql`
          SELECT cs.*,
            cr.matter_type, cr.brief,
            u.full_name as advocate_name, u.email as advocate_email, u.phone as advocate_phone,
            a.city as advocate_city, a.bar_number as advocate_bar_number
          FROM consultation_sessions cs
          JOIN consultation_requests cr ON cs.request_id = cr.request_id
          JOIN advocates a ON cs.advocate_id = a.advocate_id
          JOIN users u ON a.user_id = u.user_id
          WHERE cr.user_id = ${req.user.user_id}
          ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
        `,
        sql`
          SELECT COUNT(*) as c FROM messages msg
          JOIN cases m ON msg.matter_id = m.matter_id
          WHERE m.client_id = ${client.client_id} AND msg.sender_id != ${req.user.user_id} AND msg.is_read = 0
        `,
        sql`SELECT * FROM invoices WHERE client_id = ${client.client_id} AND status IN ('sent', 'overdue') ORDER BY due_date ASC`,
        sql`
          SELECT m.matter_id, m.matter_ref, m.matter_type, m.title, m.status, m.created_at,
                 u.full_name as advocate_name
          FROM matters m
          LEFT JOIN matter_advocates ma ON m.matter_id = ma.matter_id
          LEFT JOIN users u ON ma.advocate_id = u.user_id
          WHERE m.user_id = ${req.user.user_id} AND m.status NOT IN ('closed')
          ORDER BY m.created_at DESC LIMIT 5
        `,
      ]);

      res.json({
        client,
        matters,
        upcoming_hearings: upcomingHearings,
        consultation_requests: consultationRequests,
        consultation_sessions: consultationSessions,
        unread_messages: Number(unreadRows[0].c),
        pending_invoices: pendingInvoices,
        light_matters: lightMatters,
      });
    } catch (err) {
      console.error('Error fetching client dashboard:', err);
      res.status(500).json({ error: 'Failed to load dashboard: ' + err.message });
    }
  });

  // GET /api/dashboard/consultations
  router.get('/consultations', authenticateToken, requireRole('managing_partner', 'reception', 'advisor'), async (req, res) => {
    try {
      const consultations = await sql`SELECT * FROM consultations ORDER BY created_at DESC`;
      res.json(consultations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/dashboard/advocate
  router.get('/advocate', authenticateToken, requireRole('senior_advocate', 'junior_advocate'), async (req, res) => {
    try {
      const advRows = await sql`
        SELECT a.*, u.full_name, u.email
        FROM advocates a JOIN users u ON a.user_id = u.user_id
        WHERE a.user_id = ${req.user.user_id}
      `;
      const advocate = advRows[0];
      if (!advocate) return res.status(404).json({ error: 'Advocate not found' });

      const [activeMatters, consultationRequests, consultationSessions, upcomingHearings, emRows, peRows, retainerClients] = await Promise.all([
        sql`
          SELECT m.*, ma.role_on_matter,
            (SELECT COUNT(*) FROM hearings h WHERE h.matter_id = m.matter_id AND h.hearing_date >= CURRENT_DATE) as upcoming_hearings
          FROM cases m
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${req.user.user_id} AND ma.is_active = 1 AND m.status != 'closed'
          ORDER BY m.urgency DESC, m.created_at DESC
        `,
        sql`
          SELECT cr.request_id, cr.user_id, cr.advocate_id, cr.matter_type, cr.brief,
            cr.urgency, cr.preferred_mode, cr.preferred_date, cr.preferred_time,
            cr.status, cr.submitted_at, cr.responded_at, cr.updated_at,
            COALESCE(cr.client_name, u.full_name) as client_name,
            COALESCE(cr.client_phone, u.phone) as client_phone,
            COALESCE(cr.client_email, u.email) as client_email
          FROM consultation_requests cr
          LEFT JOIN users u ON cr.user_id = u.user_id
          WHERE cr.advocate_id = ${advocate.advocate_id}
          ORDER BY cr.submitted_at DESC
        `,
        sql`
          SELECT cs.*, cr.client_name, cr.client_phone, cr.client_email, cr.matter_type, cr.brief
          FROM consultation_sessions cs
          JOIN consultation_requests cr ON cs.request_id = cr.request_id
          WHERE cs.advocate_id = ${advocate.advocate_id} AND cs.status IN ('scheduled', 'active')
          ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
        `,
        sql`
          SELECT h.*, m.matter_number, m.title, ma.role_on_matter
          FROM hearings h
          JOIN cases m ON h.matter_id = m.matter_id
          JOIN matter_assignments ma ON m.matter_id = ma.matter_id
          WHERE ma.advocate_id = ${req.user.user_id} AND ma.is_active = 1 AND h.hearing_date >= CURRENT_DATE
          ORDER BY h.hearing_date ASC, h.hearing_time ASC
        `,
        sql`SELECT COALESCE(SUM(amount), 0) as total FROM advocate_earnings WHERE advocate_id = ${advocate.advocate_id} AND payout_date >= DATE_TRUNC('month', CURRENT_DATE)`,
        sql`SELECT COALESCE(SUM(amount), 0) as total FROM advocate_earnings WHERE advocate_id = ${advocate.advocate_id} AND status = 'pending'`,
        sql`
          SELECT rc.*, u.full_name as client_name, u.phone as client_phone, u.email as client_email
          FROM retainer_clients rc
          LEFT JOIN users u ON rc.client_name = u.full_name
          WHERE rc.advocate_id = ${advocate.advocate_id}
          ORDER BY rc.since_date DESC
        `,
      ]);

      res.json({
        advocate,
        stats: {
          active_matters:        activeMatters.length,
          consultation_requests: consultationRequests.length,
          scheduled_sessions:    consultationSessions.length,
          upcoming_hearings:     upcomingHearings.length,
          retainer_clients:      retainerClients.length,
          earnings_this_month:   parseFloat(emRows[0].total) || 0,
          pending_earnings:      parseFloat(peRows[0].total) || 0,
        },
        active_matters:        activeMatters,
        consultation_requests: consultationRequests,
        consultation_sessions: consultationSessions,
        upcoming_hearings:     upcomingHearings,
        retainer_clients:      retainerClients,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
