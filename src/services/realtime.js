const { Server } = require('socket.io');
const JWTService = require('./jwtService');

let ioInstance = null;

function initRealtime(server, corsOrigin) {
  if (ioInstance) return ioInstance;
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Auth token required'));
      const decoded = JWTService.verifyAccessToken(token);
      socket.user = { id: decoded.userId, type: decoded.userType };
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, type } = socket.user || {};
    if (id) {
      socket.join(`user:${id}`);
    }
    if (type) {
      socket.join(`role:${type}`);
    }

    socket.on('disconnect', () => {
      // no-op
    });
  });

  ioInstance = io;
  return ioInstance;
}

function getIO() {
  if (!ioInstance) throw new Error('Realtime not initialized');
  return ioInstance;
}

function notifyUser(userId, payload) {
  try {
    getIO().to(`user:${userId}`).emit('notification', payload);
  } catch {}
}

function notifyRole(role, payload) {
  try {
    getIO().to(`role:${role}`).emit('notification', payload);
  } catch {}
}

module.exports = { initRealtime, getIO, notifyUser, notifyRole };


