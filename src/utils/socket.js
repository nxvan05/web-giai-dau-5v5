const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
    transports: ['websocket', 'polling']
  });
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

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
      // In a real app we'd verify admin role here, but for simplicity we'll just forward
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
