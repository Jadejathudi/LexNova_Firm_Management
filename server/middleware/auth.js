const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clearcase-dev-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

// Injected by index.js after the DB is ready; lets the middleware verify users still exist.
let _db = null;
function setDb(db) { _db = db; }

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // If the DB is available, confirm the user still exists (catches stale tokens after a reseed).
    if (_db) {
      const user = _db.prepare('SELECT user_id FROM users WHERE user_id = ? AND is_active = 1').get(decoded.user_id);
      if (!user) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
  }
}

function generateToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

module.exports = { authenticateToken, generateToken, JWT_SECRET, setDb };
