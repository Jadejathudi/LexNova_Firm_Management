const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, generateToken } = require('../middleware/auth');

module.exports = function (db) {
  const router = express.Router();

  // POST /api/auth/guest-book — Book consultation without account
  router.post('/guest-book', (req, res) => {
    const { guest_name, guest_phone, matter_type, description, urgency, consultation_mode, preferred_date, preferred_time } = req.body;

    if (!guest_name || !guest_phone || !matter_type) {
      return res.status(400).json({ error: 'Name, phone, and matter type are required' });
    }
    if (!/^\d{10}$/.test(guest_phone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }

    const consultation_id = uuidv4();
    db.prepare(`
      INSERT INTO consultations (consultation_id, guest_name, guest_phone, matter_type, description, urgency, consultation_mode, preferred_date, preferred_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(consultation_id, guest_name, guest_phone, matter_type, description || null, urgency || 'standard', consultation_mode || 'video', preferred_date, preferred_time);

    res.status(201).json({
      booking_id: consultation_id,
      confirmation: `Consultation booked for ${preferred_date} at ${preferred_time}`,
      message: 'Your free 30-minute consultation is confirmed. An advocate will be assigned within 2 hours.',
    });
  });

  // POST /api/auth/register — Create client account
  router.post('/register', (req, res) => {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT user_id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    if (existing) {
      return res.status(409).json({ error: 'Email or phone already registered' });
    }

    const user_id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);

    db.prepare(`INSERT INTO users (user_id, full_name, email, phone, role, password_hash) VALUES (?, ?, ?, ?, 'client', ?)`)
      .run(user_id, full_name, email, phone, password_hash);

    // Also create a client record
    const client_id = uuidv4();
    db.prepare(`INSERT INTO clients (client_id, user_id, full_name, email, phone, client_type) VALUES (?, ?, ?, ?, ?, 'individual')`)
      .run(client_id, user_id, full_name, email, phone);

    const token = generateToken({ user_id, email, role: 'client', full_name });
    res.status(201).json({ user_id, token, role: 'client', full_name });
  });

  // POST /api/auth/login
  router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.prepare('UPDATE users SET last_login = datetime("now") WHERE user_id = ?').run(user.user_id);

    // Log audit
    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, ip_address) VALUES (?, ?, 'LOGIN', 'user', ?)`)
      .run(uuidv4(), user.user_id, req.ip);

    const token = generateToken(user);
    res.json({ token, user_id: user.user_id, role: user.role, full_name: user.full_name });
  });

  // POST /api/auth/logout
  router.post('/logout', authenticateToken, (req, res) => {
    db.prepare(`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, ip_address) VALUES (?, ?, 'LOGOUT', 'user', ?)`)
      .run(uuidv4(), req.user.user_id, req.ip);
    res.json({ message: 'Logged out successfully' });
  });

  // GET /api/auth/me — Get current user profile
  router.get('/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT user_id, full_name, email, phone, role, mfa_enabled, is_active, last_login, created_at FROM users WHERE user_id = ?').get(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  return router;
};
