import { appConfig } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

import { redis } from './client.js';

const logger = createLogger({ module: 'event-store' });

const EVENT_RETENTION_DAYS = 7;
const MAX_EVENTS_PER_WORKTREE = 1000;

/**
 * Event interface
 */
export interface Event {
  type: string;
  worktree: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Store event in Redis with TTL
 */
export async function storeEvent(event: Event): Promise<void> {
  try {
    const key = `events:${event.worktree}`;
    const value = JSON.stringify(event);

    // Add to list
    await redis.lpush(key, value);

    // Trim to last N events
    await redis.ltrim(key, 0, MAX_EVENTS_PER_WORKTREE - 1);

    // Set expiry (7 days)
    await redis.expire(key, EVENT_RETENTION_DAYS * 86400);

    logger.debug('Event stored', {
      worktree: event.worktree,
      type: event.type,
    });
  } catch (error) {
    logger.error('Failed to store event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      worktree: event.worktree,
      type: event.type,
    });
    throw error;
  }
}

/**
 * Retrieve event history from Redis
 */
export async function getEventHistory(
  worktree: string,
  limit: number = 100,
  offset: number = 0
): Promise<Event[]> {
  try {
    const key = `events:${worktree}`;

    // Get events from list
    const eventsJson = await redis.lrange(key, offset, offset + limit - 1);

    // Parse JSON
    const events = eventsJson.map((e) => JSON.parse(e) as Event);

    logger.debug('Retrieved event history', {
      worktree,
      count: events.length,
      limit,
      offset,
    });

    return events;
  } catch (error) {
    logger.error('Failed to retrieve event history', {
      error: error instanceof Error ? error.message : 'Unknown error',
      worktree,
    });
    throw error;
  }
}

/**
 * Get recent events across all worktrees
 */
export async function getAllRecentEvents(limit: number = 100): Promise<Event[]> {
  try {
    // Get all event keys
    const keys = await redis.keys(`${appConfig.redisKeyPrefix}events:*`);

    const allEvents: Event[] = [];

    // Get events from each key
    for (const key of keys) {
      const eventsJson = await redis.lrange(key, 0, limit - 1);
      const events = eventsJson.map((e) => JSON.parse(e) as Event);
      allEvents.push(...events);
    }

    // Sort by timestamp (most recent first)
    allEvents.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Return limited results
    return allEvents.slice(0, limit);
  } catch (error) {
    logger.error('Failed to retrieve all events', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Clear events for a worktree
 */
export async function clearWorktreeEvents(worktree: string): Promise<void> {
  try {
    const key = `events:${worktree}`;
    await redis.del(key);

    logger.info('Cleared events for worktree', { worktree });
  } catch (error) {
    logger.error('Failed to clear events', {
      error: error instanceof Error ? error.message : 'Unknown error',
      worktree,
    });
    throw error;
  }
}

/**
 * Get event count for a worktree
 */
export async function getEventCount(worktree: string): Promise<number> {
  try {
    const key = `events:${worktree}`;
    const count = await redis.llen(key);
    return count;
  } catch (error) {
    logger.error('Failed to get event count', {
      error: error instanceof Error ? error.message : 'Unknown error',
      worktree,
    });
    return 0;
  }
}
