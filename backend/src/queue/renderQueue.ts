import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let redisAvailable = false;

export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 2) {
      console.warn('[redis] Redis unavailable — queue disabled. Exports will use direct processing.');
      return null;
    }
    return Math.min(times * 300, 1000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redisConnection.on('error', () => { /* suppress */ });
redisConnection.on('connect', () => { redisAvailable = true; });
redisConnection.on('end', () => { redisAvailable = false; });

// Try connecting once at startup
redisConnection.connect().catch(() => {
  console.warn('[redis] Could not connect to Redis on startup.');
});

export const renderQueue = new Queue('render-queue', { connection: redisConnection });

export function isRedisAvailable() { return redisAvailable; }
