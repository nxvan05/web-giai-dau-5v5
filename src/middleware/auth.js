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

module.exports = (req, res, next) => {
  // 1. Try admin JWT token (password-based login)
  const bearerToken = getBearerToken(req);
  let token = req.cookies?.token;
  if (!token && bearerToken && bearerToken !== 'discord_admin') token = bearerToken;

  if (token && token !== 'discord_admin') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'discord') {
        req.user = decoded;
        return next();
      }

      if (getAdminDiscordIds().includes(decoded.discordId)) {
        setDiscordAdminUser(req, decoded);
        return next();
      }
    } catch (err) {
      // Fall through to discord token
    }
  }

  // 2. Try discord_token cookie (Discord OAuth login)
  let discordToken = req.cookies?.discord_token;
  if (!discordToken && bearerToken && bearerToken !== 'discord_admin') discordToken = bearerToken;

  if (discordToken) {
    try {
      const decoded = jwt.verify(discordToken, process.env.JWT_SECRET);
      if (decoded.type === 'discord') {
        if (getAdminDiscordIds().includes(decoded.discordId)) {
          setDiscordAdminUser(req, decoded);
          return next();
        }
      }
    } catch (err) {
      // Verification failed
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Quyền truy cập bị từ chối' });
};
