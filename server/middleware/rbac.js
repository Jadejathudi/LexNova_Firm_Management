const ROLE_HIERARCHY = {
  managing_partner: 100,
  advisor: 90,
  senior_advocate: 70,
  junior_advocate: 50,
  billing: 30,
  reception: 20,
  judge: 15,
  client: 10,
};

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
    next();
  };
}

function requireMinRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if ((ROLE_HIERARCHY[req.user.role] || 0) < (ROLE_HIERARCHY[minRole] || 0)) {
      return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
    }
    next();
  };
}

async function isAssignedToMatter(sql, userId, matterId) {
  const rows = await sql`
    SELECT assignment_id FROM matter_assignments
    WHERE advocate_id = ${userId} AND matter_id = ${matterId} AND is_active = 1
  `;
  return rows.length > 0;
}

async function isClientOfMatter(sql, userId, matterId) {
  const rows = await sql`
    SELECT m.matter_id FROM cases m
    JOIN clients c ON m.client_id = c.client_id
    WHERE m.matter_id = ${matterId} AND c.user_id = ${userId}
  `;
  return rows.length > 0;
}

async function canAccessMatter(sql, user, matterId) {
  const { role, user_id } = user;
  if (role === 'managing_partner' || role === 'advisor') return true;
  if (role === 'senior_advocate' || role === 'junior_advocate') return isAssignedToMatter(sql, user_id, matterId);
  if (role === 'client') return isClientOfMatter(sql, user_id, matterId);
  if (role === 'billing' || role === 'reception') return true;
  return false;
}

async function canAccessLightMatter(sql, user, matterId) {
  const { role, user_id } = user;
  if (role === 'managing_partner' || role === 'advisor') return true;
  if (role === 'senior_advocate' || role === 'junior_advocate' || role === 'judge') {
    const rows = await sql`SELECT id FROM matter_advocates WHERE matter_id = ${matterId} AND advocate_id = ${user_id}`;
    return rows.length > 0;
  }
  if (role === 'client') {
    const rows = await sql`SELECT matter_id FROM matters WHERE matter_id = ${matterId} AND user_id = ${user_id}`;
    return rows.length > 0;
  }
  return false;
}

module.exports = { requireRole, requireMinRole, isAssignedToMatter, isClientOfMatter, canAccessMatter, canAccessLightMatter, ROLE_HIERARCHY };
