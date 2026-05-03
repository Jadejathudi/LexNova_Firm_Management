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

// Middleware
app.use(cors());
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
