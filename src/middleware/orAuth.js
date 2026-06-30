const jwt = require('jsonwebtoken');

/**
 * Combined auth middleware: accepts admin JWT OR Discord JWT.
 * Sets req.user (admin) or req.discordUser (Discord) accordingly.
 */
module.exports = (req, res, next) => {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  const discord = req.cookies?.discord_token;

  // Try admin token first
  try {
    if (token) {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    }
  } catch (_) {}

  // Fallback to Discord token
  try {
    if (discord) {
      const decoded = jwt.verify(discord, process.env.JWT_SECRET);
      if (decoded.type === 'discord') {
        req.discordUser = decoded;
        return next();
      }
    }
  } catch (_) {}

  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
};
