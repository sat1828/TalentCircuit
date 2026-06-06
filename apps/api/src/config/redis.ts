import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// Cache helpers
export const CACHE_TTL = {
  PROFILE_VECTOR: 3600,        // 1 hour
  MATCH_SCORES: 1800,          // 30 min
  CAREER_PATH: 3600,           // 1 hour
  GAP_ANALYSIS: 604800,        // 7 days (matches DB cache)
  METRICS: 900,                // 15 min
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  return val ? JSON.parse(val) : null;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheDel(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
