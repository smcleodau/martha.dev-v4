import Redis from 'ioredis';

import { appConfig } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const redisLogger = createLogger({ module: 'redis' });

/**
 * Redis client configuration
 * Using ioredis for Redis operations with automatic reconnection
 */
const redisConfig = {
  // Parse Redis URL
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    redisLogger.warn(`Redis connection lost, retrying in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

/**
 * Main Redis client for general operations
 */
export const redis = new Redis(appConfig.redisUrl, {
  ...redisConfig,
  keyPrefix: appConfig.redisKeyPrefix,
});

/**
 * Separate Redis client for pub/sub (cannot be used for other commands)
 */
export const redisPubSub = new Redis(appConfig.redisUrl, redisConfig);

/**
 * Redis connection event handlers
 */
redis.on('connect', () => {
  redisLogger.info('Redis client connected');
});

redis.on('ready', () => {
  redisLogger.info('Redis client ready');
});

redis.on('error', (error) => {
  redisLogger.error('Redis client error', {
    error: error.message,
    stack: error.stack,
  });
});

redis.on('close', () => {
  redisLogger.warn('Redis client connection closed');
});

redis.on('reconnecting', () => {
  redisLogger.info('Redis client reconnecting');
});

/**
 * Pub/Sub client event handlers
 */
redisPubSub.on('connect', () => {
  redisLogger.info('Redis pub/sub client connected');
});

redisPubSub.on('error', (error) => {
  redisLogger.error('Redis pub/sub client error', {
    error: error.message,
    stack: error.stack,
  });
});

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    redisLogger.debug('Redis health check successful', { result });
    return result === 'PONG';
  } catch (error) {
    redisLogger.error('Redis health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Gracefully close Redis connections
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
  await redisPubSub.quit();
  redisLogger.info('Redis connections closed');
}

/**
 * Helper: Publish event to Redis
 */
export async function publishEvent(channel: string, data: Record<string, unknown>): Promise<number> {
  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  });

  const subscribers = await redis.publish(channel, message);
  redisLogger.debug('Event published', { channel, subscribers });
  return subscribers;
}

/**
 * Helper: Subscribe to Redis channel with handler
 */
export async function subscribeToChannel(
  channel: string,
  handler: (message: Record<string, unknown>) => void
): Promise<void> {
  await redisPubSub.subscribe(channel);

  redisPubSub.on('message', (receivedChannel, message) => {
    if (receivedChannel === channel) {
      try {
        const data = JSON.parse(message) as Record<string, unknown>;
        handler(data);
      } catch (error) {
        redisLogger.error('Failed to parse message', {
          channel: receivedChannel,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });

  redisLogger.info('Subscribed to channel', { channel });
}

/**
 * Helper: Store event in Redis list (FIFO with max length)
 */
export async function storeEvent(
  key: string,
  event: Record<string, unknown>,
  maxLength: number = 1000
): Promise<void> {
  const eventData = JSON.stringify({
    ...event,
    timestamp: new Date().toISOString(),
  });

  // Add to list and trim to max length
  await redis
    .multi()
    .lpush(key, eventData)
    .ltrim(key, 0, maxLength - 1)
    .exec();
}

/**
 * Helper: Retrieve recent events from Redis list
 */
export async function getRecentEvents(
  key: string,
  limit: number = 100
): Promise<Array<Record<string, unknown>>> {
  const events = await redis.lrange(key, 0, limit - 1);
  return events
    .map((event) => {
      try {
        return JSON.parse(event) as Record<string, unknown>;
      } catch (error) {
        redisLogger.error('Failed to parse event', {
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null;
      }
    })
    .filter((e): e is Record<string, unknown> => e !== null);
}

/**
 * Export clients for direct access if needed
 */
export default redis;
