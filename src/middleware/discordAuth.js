const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  let token = req.cookies.discord_token;
  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token) return res.status(401).json({ error: 'Vui lòng đăng nhập bằng Discord' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'discord') return res.status(401).json({ error: 'Invalid token type' });
    req.discordUser = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
  }
};
