const prisma = require('../utils/prisma');

const ROLES = {
  super_admin: ['*'],
  admin: ['match:write', 'team:write', 'player:write', 'settings:write', 'bracket:write', 'penalty:write', 'dispute:write', 'audit:read'],
  moderator: ['match:write', 'team:write', 'player:write', 'checkin:write']
};

function hasPermission(userRole, permission) {
  const allowed = ROLES[userRole] || [];
  return allowed.includes('*') || allowed.includes(permission);
}

async function requireRole(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
      const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
      if (!admin) return res.status(401).json({ error: 'Unauthorized' });
      if (hasPermission(admin.role, requiredPermission)) {
        req.user.role = admin.role;
        return next();
      }
      res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    } catch (e) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

module.exports = { requireRole, ROLES };
