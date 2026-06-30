const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (process.env.FRONTEND_URL || 'http://localhost:5000') + '/api/discord/callback';

exports.getAuthUrl = (req, res) => {
  if (!CLIENT_ID) return res.status(500).json({ error: 'Discord OAuth not configured' });
  const url = 'https://discord.com/api/oauth2/authorize' +
    '?client_id=' + CLIENT_ID +
    '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
    '&response_type=code' +
    '&scope=identify';
  res.json({ url });
};

exports.callback = async (req, res) => {
  try {
    const { code, error } = req.query;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
    if (error) return res.redirect(FRONTEND_URL + '?discord=denied');
    if (!code) return res.redirect(FRONTEND_URL + '?discord=denied');

    const tokenResp = await fetch('https://young-silence-7da5.vandzvl09.workers.dev/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
      let tokenData;
      const tokenText = await tokenResp.text();
      try {
          tokenData = JSON.parse(tokenText);
      } catch (e) {
          console.error('Discord Token Error Response:', tokenText);
          return res.redirect(FRONTEND_URL + '?discord=denied');
      }

    if (!tokenData.access_token) return res.status(400).json({ error: 'Failed to get token' });

    const userResp = await fetch('https://young-silence-7da5.vandzvl09.workers.dev/api/users/@me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    });
    
      let discordUser;
      const userText = await userResp.text();
      try {
          discordUser = JSON.parse(userText);
      } catch (e) {
          console.error('Discord User Error Response:', userText);
          return res.redirect(FRONTEND_URL + '?discord=denied');
      }

    if (!discordUser.id) return res.status(400).json({ error: 'Failed to get user' });

    const player = await prisma.player.findFirst({ where: { discordId: discordUser.id } });

    const payload = {
      type: 'discord',
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordAvatar: discordUser.avatar,
      playerId: player ? player.id : null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.cookie('discord_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(FRONTEND_URL + '?discord=loggedin');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.me = (req, res) => {
  const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim());
  const isAdmin = adminIds.includes(req.discordUser.discordId);
  res.json({ user: { ...req.discordUser, isAdmin } });
};

// Re-issue JWT to extend session (7 more days)
exports.refresh = async (req, res) => {
  try {
    const discordUser = req.discordUser;
    const player = await prisma.player.findFirst({ where: { discordId: discordUser.discordId } });
    const payload = {
      type: 'discord',
      discordId: discordUser.discordId,
      discordUsername: discordUser.discordUsername,
      discordAvatar: discordUser.discordAvatar,
      playerId: player ? player.id : null,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('discord_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user: payload });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('discord_token');
  res.json({ message: 'Logged out' });
};
