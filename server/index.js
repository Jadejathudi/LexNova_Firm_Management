require('dotenv').config();
const express = require('express');
const { sql } = require('./db/client');

const app = express();
const PORT = process.env.PORT || 5001;

// Give auth middleware access to sql so it can validate tokens against live users
require('./middleware/auth').setDb(sql);

// CORS — must be the very first middleware, before everything else
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const allowed =
    !origin ||
    origin.includes('localhost') ||
    origin.endsWith('.vercel.app') ||
    origin === process.env.CLIENT_URL;

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Respond immediately to preflight
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth',          require('./routes/auth')(sql));
app.use('/api/matters',       require('./routes/matters')(sql));
app.use('/api/documents',     require('./routes/documents')(sql));
app.use('/api/messages',      require('./routes/messages')(sql));
app.use('/api/hearings',      require('./routes/hearings')(sql));
app.use('/api/invoices',      require('./routes/invoices')(sql));
app.use('/api/clients',       require('./routes/clients')(sql));
app.use('/api/users',         require('./routes/users')(sql));
app.use('/api/dashboard',     require('./routes/dashboard')(sql));
app.use('/api/ai-guide',      require('./routes/aiGuide')(sql));
app.use('/api/consultations', require('./routes/consultations')(sql));
app.use('/api/advocates',     require('./routes/advocates')(sql));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', db: 'neon', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Clear Case API server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
