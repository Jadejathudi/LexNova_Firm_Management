const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

module.exports = function (db) {
  const router = express.Router();

  // GET /api/dashboard — Managing Partner command centre stats
  router.get('/', authenticateToken, requireRole('managing_partner', 'advisor'), (req, res) => {
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
    const client = db.prepare('SELECT * FROM clients WHERE user_id = ?').get(req.user.user_id);
    if (!client) return res.json({ matters: [], upcoming_hearings: [], unread_messages: 0 });

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
      unread_messages: unreadMessages.c,
      pending_invoices: pendingInvoices,
    });
  });

  // GET /api/dashboard/consultations — List guest bookings (reception/partner)
  router.get('/consultations', authenticateToken, requireRole('managing_partner', 'reception', 'advisor'), (req, res) => {
    const consultations = db.prepare('SELECT * FROM consultations ORDER BY created_at DESC').all();
    res.json(consultations);
  });

  return router;
};
