const jwt = require('jsonwebtoken');

function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function getAdminDiscordIds() {
  return (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
}

function setDiscordAdminUser(req, decoded) {
  req.user = {
    id: decoded.playerId,
    username: decoded.discordUsername,
    discordId: decoded.discordId,
    isAdmin: true
  };
}

/**
 * Combined auth middleware: accepts admin JWT OR Discord JWT.
 * Sets req.user (admin) or req.discordUser (Discord) accordingly.
 */
module.exports = (req, res, next) => {
  const bearerToken = getBearerToken(req);
  const wantsDiscordAdmin = bearerToken === 'discord_admin';
  const token = req.cookies?.token || (!wantsDiscordAdmin ? bearerToken : null);
  const discord = req.cookies?.discord_token || (!wantsDiscordAdmin ? bearerToken : null);

  // Try admin token first
  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type === 'discord' || decoded.discordId) {
        req.discordUser = decoded;
      } else {
        req.user = decoded;
      }
    }
  } catch (_) {}

  // Fallback to Discord token
  try {
    if (discord) {
      const decoded = jwt.verify(discord, process.env.JWT_SECRET);
      if (decoded.type === 'discord' || decoded.discordId) {
        if (wantsDiscordAdmin && getAdminDiscordIds().includes(decoded.discordId)) {
          setDiscordAdminUser(req, decoded);
        } else {
          req.discordUser = decoded;
        }
      }
    }
  } catch (_) {}

  if (req.user || req.discordUser) {
    return next();
  }

  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
};
