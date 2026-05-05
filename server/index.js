require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5001;

// Database
const DB_PATH = path.join(__dirname, 'db', 'clearcase.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Give the auth middleware DB access so it can validate tokens against live users
require('./middleware/auth').setDb(db);

// ── DB migrations ─────────────────────────────────────────────────────────────
// Add working-hours columns to advocate_availability (safe on existing DBs)
try { db.prepare("ALTER TABLE advocate_availability ADD COLUMN start_time TEXT DEFAULT '09:00'").run(); } catch (_) {}
try { db.prepare("ALTER TABLE advocate_availability ADD COLUMN end_time TEXT DEFAULT '18:00'").run(); } catch (_) {}

// Seed Mon–Sat 09:00–18:00 for advocates that have zero availability records
(function seedAvailability() {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const unset = db.prepare(`
    SELECT advocate_id FROM advocates
    WHERE NOT EXISTS (
      SELECT 1 FROM advocate_availability aa WHERE aa.advocate_id = advocates.advocate_id
    )
  `).all();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO advocate_availability (availability_id, advocate_id, day_of_week, is_available, start_time, end_time)
    VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
            substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(2))) || '-' ||
            lower(hex(randomblob(6))), ?, ?, 1, '09:00', '18:00')
  `);
  const tx = db.transaction(() => unset.forEach(a => DAYS.forEach(d => ins.run(a.advocate_id, d))));
  tx();
})();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/matters', require('./routes/matters')(db));
app.use('/api/documents', require('./routes/documents')(db));
app.use('/api/messages', require('./routes/messages')(db));
app.use('/api/hearings', require('./routes/hearings')(db));
app.use('/api/invoices', require('./routes/invoices')(db));
app.use('/api/clients', require('./routes/clients')(db));
app.use('/api/users', require('./routes/users')(db));
app.use('/api/dashboard', require('./routes/dashboard')(db));
app.use('/api/ai-guide', require('./routes/aiGuide')(db));
app.use('/api/consultations', require('./routes/consultations')(db));
app.use('/api/advocates', require('./routes/advocates')(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Clear Case API server running on http://localhost:${PORT}`);
});
