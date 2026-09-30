let io = null;

function initSocket(server, clientUrl) {
  const { Server } = require('socket.io');
  
  // Allow all origins or clientUrl in production
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: false
    }
  });

  io.on('connection', (socket) => {
    // console.log(`Socket connected: ${socket.id}`);

    // Join match-specific room for real-time scores
    socket.on('join:match', (matchId) => {
      if (matchId) {
        socket.join(`match:${matchId}`);
        // console.log(`Socket ${socket.id} joined room match:${matchId}`);
      }
    });

    socket.on('leave:match', (matchId) => {
      if (matchId) {
        socket.leave(`match:${matchId}`);
      }
    });

    socket.on('disconnect', () => {
      // console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function broadcastMatchUpdate(matchId, payload) {
  if (io) {
    io.to(`match:${matchId}`).emit('match:update', payload);
    io.emit('matches:live_refresh', { matchId });
  }
}

function broadcastDeliveryEvent(matchId, deliveryPayload) {
  if (io) {
    io.to(`match:${matchId}`).emit('delivery:new', deliveryPayload);
  }
}

module.exports = {
  initSocket,
  getIO,
  broadcastMatchUpdate,
  broadcastDeliveryEvent
};
