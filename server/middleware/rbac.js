// Role-Based Access Control middleware
// Enforces the RBAC matrix from the FRD

const ROLE_HIERARCHY = {
  managing_partner: 100,
  advisor: 90,
  senior_advocate: 70,
  junior_advocate: 50,
  billing: 30,
  reception: 20,
  client: 10,
};

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
    }
    next();
  };
}

function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < requiredLevel) {
      return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
    }
    next();
  };
}

// Check if the advocate is assigned to a specific matter
function isAssignedToMatter(db, userId, matterId) {
  const assignment = db.prepare(
    'SELECT assignment_id FROM matter_assignments WHERE advocate_id = ? AND matter_id = ? AND is_active = 1'
  ).get(userId, matterId);
  return !!assignment;
}

// Check if the client owns a specific matter
function isClientOfMatter(db, userId, matterId) {
  const matter = db.prepare(`
    SELECT m.matter_id FROM matters m
    JOIN clients c ON m.client_id = c.client_id
    WHERE m.matter_id = ? AND c.user_id = ?
  `).get(matterId, userId);
  return !!matter;
}

// Enforce matter-level access based on role
function canAccessMatter(db, user, matterId) {
  const role = user.role;
  if (role === 'managing_partner' || role === 'advisor') return true;
  if (role === 'senior_advocate' || role === 'junior_advocate') {
    return isAssignedToMatter(db, user.user_id, matterId);
  }
  if (role === 'client') {
    return isClientOfMatter(db, user.user_id, matterId);
  }
  if (role === 'billing') {
    // Billing can see matter ID for invoicing but not description
    return true;
  }
  if (role === 'reception') {
    // Reception can see hearing dates only
    return true;
  }
  return false;
}

module.exports = {
  requireRole,
  requireMinRole,
  isAssignedToMatter,
  isClientOfMatter,
  canAccessMatter,
  ROLE_HIERARCHY,
};
