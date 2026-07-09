const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

function getAdminDiscordIds() {
  return (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim()).filter(Boolean);
}

function parseJwtFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  const discordCookie = cookies.find(c => c.startsWith('discord_token='));
  const raw = discordCookie ? discordCookie.slice('discord_token='.length) : tokenCookie?.slice('token='.length);
  if (!raw) return null;
  try { return jwt.verify(raw, process.env.JWT_SECRET); } catch (_) { return null; }
}

function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    const decoded = parseJwtFromCookie(socket.handshake.headers.cookie);
    const isAdmin = decoded && (
      (decoded.discordId && getAdminDiscordIds().includes(decoded.discordId)) ||
      (!decoded.type && decoded.username)
    );
    socket.data.isAdmin = !!isAdmin;

    console.log('Socket connected:', socket.id, 'isAdmin:', !!isAdmin);

    socket.on('stream:join', (streamId) => {
      socket.join('stream-' + streamId);
    });

    socket.on('stream:leave', (streamId) => {
      socket.leave('stream-' + streamId);
    });

    socket.on('stream:update-score', (data) => {
      io.to('stream-' + data.streamId).emit('stream:score', data);
    });

    // Admin Broadcast System
    socket.on('broadcast', (data) => {
      if (!socket.data.isAdmin) return;
      io.emit('broadcast:receive', data);
    });

    // VETO rooms
    socket.on('veto:join', (matchId) => {
      socket.join('veto-' + matchId);
    });

    socket.on('veto:leave', (matchId) => {
      socket.leave('veto-' + matchId);
    });

    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
