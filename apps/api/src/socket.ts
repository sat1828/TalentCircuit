import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from './config/env';
import { redis } from './config/redis';
import { setSocketServer } from './services/notificationService';

export function setupSocket(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setSocketServer(io);

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token as string, env.JWT_SECRET) as any;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user.id} (${user.fullName})`);

    // Join personal room for private notifications
    socket.join(`room:${user.id}`);

    // Join company room for org-wide announcements
    socket.join(`company:${user.companyId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${user.id}`);
    });

    // Handle typing indicators or other real-time events
    socket.on('typing', (data) => {
      socket.broadcast.to(`room:${data.targetUserId}`).emit('typing', {
        userId: user.id,
        fullName: user.fullName,
      });
    });

    // Mark notifications as read via socket
    socket.on('mark-read', async (data) => {
      // Delegate to HTTP handler logic via Redis
      await redis.publish(
        'notifications:read',
        JSON.stringify({ userId: user.id, ids: data?.ids })
      );
    });
  });

  // Subscribe to Redis notifications channel for cross-process broadcasting
  const subscriber = redis.duplicate();

  subscriber.subscribe('notifications', (err) => {
    if (err) console.error('[Socket] Redis subscribe error:', err);
  });

  subscriber.on('message', (channel, message) => {
    if (channel === 'notifications') {
      try {
        const { userId, notification } = JSON.parse(message);
        io.to(`room:${userId}`).emit('notification', notification);
      } catch {
        // Ignore parse errors
      }
    }
  });

  // Store subscriber reference for cleanup
  (io as any).__subscriber = subscriber;

  console.log('[Socket] Socket.io server initialized');
  return io;
}

export function cleanupSocket(io: SocketServer) {
  const subscriber = (io as any).__subscriber;
  if (subscriber) {
    subscriber.unsubscribe();
    subscriber.quit();
  }
}
