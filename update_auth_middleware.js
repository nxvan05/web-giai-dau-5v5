const fs = require('fs');
const path = require('path');

const authJsPath = path.join(__dirname, 'src', 'middleware', 'auth.js');
const newAuthCode = `const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Try old token first
  let token = req.cookies.token;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // If it's the old admin token (and not the "discord_admin" placeholder), try to verify it
  if (token && token !== 'discord_admin') {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Fall through to discord token if verification fails
    }
  }

  // 2. Try discord_token
  let discordToken = req.cookies.discord_token;
  // Fallback: if authorization header is Bearer <token> and it looks like a real JWT (not 'discord_admin')
  if (!discordToken && authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7) !== 'discord_admin') {
    discordToken = authHeader.slice(7);
  }

  if (discordToken) {
    try {
      const decoded = jwt.verify(discordToken, process.env.JWT_SECRET);
      if (decoded.type === 'discord') {
        const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim());
        if (adminIds.includes(decoded.discordId)) {
          // Grant admin access
          req.user = {
            id: decoded.playerId,
            username: decoded.discordUsername,
            discordId: decoded.discordId,
            isAdmin: true
          };
          return next();
        }
      }
    } catch (err) {
      // Verification failed
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Quyền truy cập bị từ chối' });
};
`;

fs.writeFileSync(authJsPath, newAuthCode, 'utf8');
console.log('Updated src/middleware/auth.js');
