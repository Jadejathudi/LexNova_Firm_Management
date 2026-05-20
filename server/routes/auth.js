const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, generateToken } = require('../middleware/auth');

module.exports = function (sql) {
  const router = express.Router();

  // POST /api/auth/guest-book
  router.post('/guest-book', async (req, res) => {
    const { guest_name, guest_phone, matter_type, description, urgency, consultation_mode, preferred_date, preferred_time } = req.body;

    if (!guest_name || !guest_phone || !matter_type) {
      return res.status(400).json({ error: 'Name, phone, and matter type are required' });
    }
    if (!/^\d{10}$/.test(guest_phone)) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }

    const consultation_id = uuidv4();
    const normalizedUrgency = urgency === 'urgent' ? 'high' : urgency === 'standard' ? 'normal' : urgency || 'normal';
    const normalizedMode = ['video', 'phone', 'office'].includes(consultation_mode) ? consultation_mode : 'video';

    try {
      await sql`
        INSERT INTO consultations (consultation_id, guest_name, guest_phone, matter_type, description, urgency, consultation_mode, preferred_date, preferred_time)
        VALUES (${consultation_id}, ${guest_name}, ${guest_phone}, ${matter_type}, ${description || null}, ${normalizedUrgency}, ${normalizedMode}, ${preferred_date}, ${preferred_time})
      `;
      res.status(201).json({
        booking_id: consultation_id,
        confirmation: `Consultation booked for ${preferred_date} at ${preferred_time}`,
        message: 'Your free 30-minute consultation is confirmed. An advocate will be assigned within 2 hours.',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
      const existing = await sql`SELECT user_id FROM users WHERE email = ${email} OR phone = ${phone}`;
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Email or phone already registered' });
      }

      const user_id = uuidv4();
      const password_hash = bcrypt.hashSync(password, 10);

      await sql`INSERT INTO users (user_id, full_name, email, phone, role, password_hash) VALUES (${user_id}, ${full_name}, ${email}, ${phone}, 'client', ${password_hash})`;

      const client_id = uuidv4();
      await sql`INSERT INTO clients (client_id, user_id, full_name, email, phone, client_type) VALUES (${client_id}, ${user_id}, ${full_name}, ${email}, ${phone}, 'individual')`;

      const token = generateToken({ user_id, email, role: 'client', full_name });
      res.status(201).json({ user_id, token, role: 'client', full_name });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const rows = await sql`SELECT * FROM users WHERE email = ${email} AND is_active = 1`;
      const user = rows[0];
      if (!user) {
        console.log('[LOGIN] User not found or inactive:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!bcrypt.compareSync(password, user.password_hash)) {
        console.log('[LOGIN] Password mismatch for user:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      await sql`UPDATE users SET last_login = NOW() WHERE user_id = ${user.user_id}`;
      await sql`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, ip_address) VALUES (${uuidv4()}, ${user.user_id}, 'LOGIN', 'user', ${req.ip})`;

      const token = generateToken(user);
      console.log('[LOGIN] Login successful for user:', email);
      res.json({ token, user_id: user.user_id, role: user.role, full_name: user.full_name });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', authenticateToken, async (req, res) => {
    try {
      await sql`INSERT INTO audit_logs (log_id, actor_id, action, resource_type, ip_address) VALUES (${uuidv4()}, ${req.user.user_id}, 'LOGOUT', 'user', ${req.ip})`;
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', authenticateToken, async (req, res) => {
    try {
      const rows = await sql`SELECT user_id, full_name, email, phone, role, mfa_enabled, is_active, last_login, created_at FROM users WHERE user_id = ${req.user.user_id}`;
      if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
