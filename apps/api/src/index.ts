import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import http from 'http';

import { env, isProd } from './config/env';
import { pool } from './config/database';
import { connectRedis, redis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { setupSocket, cleanupSocket } from './socket';
import { setupDigestScheduler, shutdownDigestScheduler } from './jobs/digestScheduler';
import { MatchingService } from './services/matchingService';

// Routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import jobRoutes from './routes/jobs';
import aiRoutes from './routes/ai';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

const app = express();
const httpServer = http.createServer(app);

let io: ReturnType<typeof setupSocket> | null = null;

// ──────────────────────────────────────────
// Process-level error handlers (must be first)
// ──────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

// ──────────────────────────────────────────
// Global Middleware
// ──────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: isProd ? undefined : false,
}));
app.use(compression());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (env.NODE_ENV !== 'test') {
  app.use(morgan(isProd ? 'combined' : 'short'));
}

// ──────────────────────────────────────────
// Rate Limiting
// ──────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Daily limit reached (10 analyses/day)' },
  standardHeaders: true,
  legacyHeaders: false,
});

const jobActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many actions, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────
// Routes
// ──────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/me/profile', profileRoutes);
app.use('/api/jobs', jobActionLimiter, jobRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ──────────────────────────────────────────
// Error Handling
// ──────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ──────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  httpServer.close();
  if (io) cleanupSocket(io);
  await shutdownDigestScheduler();
  await pool.end().catch(() => {});
  if (redis.status === 'ready') await redis.quit().catch(() => {});
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function start() {
  try {
    await pool.connect();
    console.log('[DB] Connected');

    await connectRedis();
    console.log('[Redis] Connected');

    // Seed skill embeddings on startup (skills without embeddings)
    try {
      const matchingService = new MatchingService();
      const seeded = await matchingService.seedSkillEmbeddings();
      if (seeded > 0) console.log(`[Embeddings] Seeded ${seeded} skills`);
    } catch (err) {
      console.error('[Embeddings] Seed failed (non-fatal):', err);
    }

    io = setupSocket(httpServer);

    await setupDigestScheduler();

    httpServer.listen(env.PORT, () => {
      console.log(`\n  🚀  TalentCircuit API — ${env.NODE_ENV}`);
      console.log(`  Port: ${env.PORT}  CORS: ${env.CORS_ORIGIN}\n`);
    });
  } catch (err) {
    console.error('[FATAL] Startup failed:', err);
    process.exit(1);
  }
}

start();
