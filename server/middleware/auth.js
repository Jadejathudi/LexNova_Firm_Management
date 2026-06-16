const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and not set. Refusing to start.');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';

// Injected by index.js after the DB is ready
let _sql = null;
function setDb(sql) { _sql = sql; }

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (_sql) {
      const rows = await _sql`SELECT user_id FROM users WHERE user_id = ${decoded.user_id} AND is_active = 1`;
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
}

function generateToken(user) {
  return jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

module.exports = { authenticateToken, generateToken, JWT_SECRET, setDb };
