const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/dashboard — Managing Partner and advocate command centre stats
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor', 'senior_advocate', 'junior_advocate'), (req, res) => {
    const activeMatters = db.prepare("SELECT COUNT(*) as c FROM matters WHERE status != 'closed'").get().c;

    const hearingsThisWeek = db.prepare(`
      SELECT COUNT(*) as c FROM hearings
      WHERE hearing_date BETWEEN date('now') AND date('now', '+7 days')
    `).get().c;

    const overdueInvoices = db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'overdue'").get().c;

    const revenueThisMonth = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices
      WHERE status = 'paid' AND paid_at >= date('now', 'start of month')
    `).get().total;

    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid'").get().total;

    // Advocate workloads
    const advocates = db.prepare(`
      SELECT u.user_id, u.full_name, u.role,
        (SELECT COUNT(*) FROM matter_assignments ma
         JOIN matters m ON ma.matter_id = m.matter_id
         WHERE ma.advocate_id = u.user_id AND ma.is_active = 1 AND m.status != 'closed') as active_cases
      FROM users u
      WHERE u.role IN ('senior_advocate', 'junior_advocate') AND u.is_active = 1
      ORDER BY active_cases DESC
    `).all();

    // Recent activity (audit logs)
    const recentActivity = db.prepare(`
      SELECT al.action, al.resource_type, al.timestamp, u.full_name as actor_name
      FROM audit_logs al JOIN users u ON al.actor_id = u.user_id
      ORDER BY al.timestamp DESC LIMIT 10
    `).all();

    // Matters needing attention (no update in 48 hours) - simulated
    const staleMatters = db.prepare(`
      SELECT matter_id, matter_number, title, status, created_at
      FROM matters WHERE status NOT IN ('closed', 'judgment')
      ORDER BY created_at ASC LIMIT 5
    `).all();

    // Client stats
    const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
    const totalConsultations = db.prepare('SELECT COUNT(*) as c FROM consultations').get().c;

    res.json({
      stats: {
        active_matters: activeMatters,
        hearings_this_week: hearingsThisWeek,
        overdue_invoices: overdueInvoices,
        revenue_this_month: revenueThisMonth,
        total_revenue: totalRevenue,
        total_clients: totalClients,
        total_consultations: totalConsultations,
      },
      advocate_workloads: advocates,
      recent_activity: recentActivity,
      stale_matters: staleMatters,
    });
  });

  // GET /api/dashboard/client — Client dashboard stats
  router.get('/client', authenticateToken, (req, res) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE user_id = ?').get(req.user.user_id);
      if (!client) {
        return res.json({ 
          client: null,
          matters: [], 
          upcoming_hearings: [], 
          consultation_requests: [], 
          consultation_sessions: [],
          unread_messages: 0,
          pending_invoices: []
        });
      }

      const matters = db.prepare(`
        SELECT m.*, 
          (SELECT u.full_name FROM matter_assignments ma JOIN users u ON ma.advocate_id = u.user_id 
           WHERE ma.matter_id = m.matter_id AND ma.role_on_matter = 'lead_senior' AND ma.is_active = 1 LIMIT 1) as lead_advocate
        FROM matters m WHERE m.client_id = ?
        ORDER BY m.urgency DESC, m.created_at DESC
      `).all(client.client_id);

      // Add next hearing to each matter
      const mattersWithHearings = matters.map(m => {
        const nextHearing = db.prepare(`
          SELECT hearing_date, hearing_time, court_name FROM hearings
          WHERE matter_id = ? AND hearing_date >= date('now')
          ORDER BY hearing_date ASC LIMIT 1
        `).get(m.matter_id);
        return { ...m, next_hearing: nextHearing };
      });

      const upcomingHearings = db.prepare(`
        SELECT h.*, m.matter_number, m.title FROM hearings h
        JOIN matters m ON h.matter_id = m.matter_id
        WHERE m.client_id = ? AND h.hearing_date >= date('now')
        ORDER BY h.hearing_date ASC LIMIT 5
      `).all(client.client_id);

      // Get consultation requests for this user
      const consultationRequests = db.prepare(`
        SELECT cr.*, 
          (SELECT u.full_name FROM advocates adv JOIN users u ON adv.user_id = u.user_id WHERE adv.advocate_id = cr.advocate_id) as advocate_name,
          (SELECT COALESCE(a.city, '') || ', ' || COALESCE(a.state, '') FROM advocates a WHERE a.advocate_id = cr.advocate_id) as advocate_location
        FROM consultation_requests cr
        WHERE cr.user_id = ?
        ORDER BY cr.submitted_at DESC
      `).all(req.user.user_id);

      // Get consultation sessions for this user via their consultation requests (includes advocate contact)
      const consultationSessions = db.prepare(`
        SELECT cs.*,
          cr.matter_type, cr.brief,
          u.full_name as advocate_name,
          u.email as advocate_email,
          u.phone as advocate_phone,
          a.city as advocate_city,
          a.bar_number as advocate_bar_number
        FROM consultation_sessions cs
        JOIN consultation_requests cr ON cs.request_id = cr.request_id
        JOIN advocates a ON cs.advocate_id = a.advocate_id
        JOIN users u ON a.user_id = u.user_id
        WHERE cr.user_id = ?
        ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
      `).all(req.user.user_id);

      const unreadMessages = db.prepare(`
        SELECT COUNT(*) as c FROM messages msg
        JOIN matters m ON msg.matter_id = m.matter_id
        WHERE m.client_id = ? AND msg.sender_id != ? AND msg.is_read = 0
      `).get(client.client_id, req.user.user_id);

      const pendingInvoices = db.prepare(`
        SELECT * FROM invoices WHERE client_id = ? AND status IN ('sent', 'overdue')
        ORDER BY due_date ASC
      `).all(client.client_id);

      res.json({
        client,
        matters: mattersWithHearings,
        upcoming_hearings: upcomingHearings,
        consultation_requests: consultationRequests,
        consultation_sessions: consultationSessions,
        unread_messages: unreadMessages.c,
        pending_invoices: pendingInvoices,
      });
    } catch (error) {
      console.error('Error fetching client dashboard:', error);
      res.status(500).json({ error: 'Failed to load dashboard: ' + error.message });
    }
  });

  // GET /api/dashboard/consultations — List guest bookings (reception/partner)
  router.get('/consultations', authenticateToken, requireRole('managing_partner', 'reception', 'advisor'), (req, res) => {
    const consultations = db.prepare('SELECT * FROM consultations ORDER BY created_at DESC').all();
    res.json(consultations);
  });

  // GET /api/dashboard/advocate — Individual advocate dashboard
  router.get('/advocate', authenticateToken, requireRole('senior_advocate', 'junior_advocate'), (req, res) => {
    // Get advocate info
    const advocate = db.prepare(`
      SELECT a.*, u.full_name, u.email
      FROM advocates a
      JOIN users u ON a.user_id = u.user_id
      WHERE a.user_id = ?
    `).get(req.user.user_id);

    if (!advocate) return res.status(404).json({ error: 'Advocate not found' });

    // Active matters for this advocate
    const activeMatters = db.prepare(`
      SELECT m.*, ma.role_on_matter,
        (SELECT COUNT(*) FROM hearings h WHERE h.matter_id = m.matter_id AND h.hearing_date >= date('now')) as upcoming_hearings
      FROM matters m
      JOIN matter_assignments ma ON m.matter_id = ma.matter_id
      WHERE ma.advocate_id = ? AND ma.is_active = 1 AND m.status != 'closed'
      ORDER BY m.urgency DESC, m.created_at DESC
    `).all(req.user.user_id);

    // Consultation requests for this advocate (stored client fields take precedence over user fields)
    const consultationRequests = db.prepare(`
      SELECT cr.request_id, cr.user_id, cr.advocate_id, cr.matter_type, cr.brief,
        cr.urgency, cr.preferred_mode, cr.preferred_date, cr.preferred_time,
        cr.status, cr.submitted_at, cr.responded_at, cr.updated_at,
        COALESCE(cr.client_name, u.full_name) as client_name,
        COALESCE(cr.client_phone, u.phone) as client_phone,
        COALESCE(cr.client_email, u.email) as client_email
      FROM consultation_requests cr
      LEFT JOIN users u ON cr.user_id = u.user_id
      WHERE cr.advocate_id = ?
      ORDER BY cr.submitted_at DESC
    `).all(advocate.advocate_id);

    // Scheduled consultation sessions
    const consultationSessions = db.prepare(`
      SELECT cs.*, cr.client_name, cr.client_phone, cr.client_email, cr.matter_type, cr.brief
      FROM consultation_sessions cs
      JOIN consultation_requests cr ON cs.request_id = cr.request_id
      WHERE cs.advocate_id = ? AND cs.status IN ('scheduled', 'active')
      ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
    `).all(advocate.advocate_id);

    // Upcoming hearings for this advocate's matters
    const upcomingHearings = db.prepare(`
      SELECT h.*, m.matter_number, m.title, ma.role_on_matter
      FROM hearings h
      JOIN matters m ON h.matter_id = m.matter_id
      JOIN matter_assignments ma ON m.matter_id = ma.matter_id
      WHERE ma.advocate_id = ? AND ma.is_active = 1 AND h.hearing_date >= date('now')
      ORDER BY h.hearing_date ASC, h.hearing_time ASC
    `).all(req.user.user_id);

    // Earnings summary
    const earningsThisMonth = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM advocate_earnings
      WHERE advocate_id = ? AND payout_date >= date('now', 'start of month')
    `).get(advocate.advocate_id).total;

    const pendingEarnings = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM advocate_earnings
      WHERE advocate_id = ? AND status = 'pending'
    `).get(advocate.advocate_id).total;

    // Retainer clients
    const retainerClients = db.prepare(`
      SELECT rc.*, u.full_name as client_name, u.phone as client_phone, u.email as client_email
      FROM retainer_clients rc
      LEFT JOIN users u ON rc.client_name = u.full_name
      WHERE rc.advocate_id = ?
      ORDER BY rc.since_date DESC
    `).all(advocate.advocate_id);

    res.json({
      advocate,
      stats: {
        active_matters: activeMatters.length,
        consultation_requests: consultationRequests.length,
        scheduled_sessions: consultationSessions.length,
        upcoming_hearings: upcomingHearings.length,
        retainer_clients: retainerClients.length,
        earnings_this_month: earningsThisMonth,
        pending_earnings: pendingEarnings,
      },
      active_matters: activeMatters,
      consultation_requests: consultationRequests,
      consultation_sessions: consultationSessions,
      upcoming_hearings: upcomingHearings,
      retainer_clients: retainerClients,
    });
  });

  return router;
};
