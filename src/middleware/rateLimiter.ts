/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse with sliding window rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import logger from '../utils/logger.js';
import { RateLimitError } from './errorHandler.js';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
  handler?: (req: Request, res: Response) => void; // Custom handler when limit exceeded
}

export interface RateLimitStore {
  increment(key: string): Promise<{ count: number; resetTime: Date }>;
  reset(key: string): Promise<void>;
}

/**
 * In-memory rate limit store (for development)
 */
export class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: Date }> = new Map();

  async increment(key: string): Promise<{ count: number; resetTime: Date }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime.getTime() < now) {
      // Create new window
      const resetTime = new Date(now + 60000); // 1 minute window
      this.store.set(key, { count: 1, resetTime });
      return { count: 1, resetTime };
    }

    // Increment existing window
    entry.count++;
    return { count: entry.count, resetTime: entry.resetTime };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup old entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime.getTime() < now) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * PostgreSQL rate limit store (for production)
 */
export class PostgresStore implements RateLimitStore {
  constructor(private db: Pool) {}

  async initialize(): Promise<void> {
    // Create rate_limits table if not exists
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ts_martha.rate_limits (
        key VARCHAR(255) PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_time TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create index on reset_time for cleanup
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_reset
      ON ts_martha.rate_limits(reset_time)
    `);
  }

  async increment(key: string): Promise<{ count: number; resetTime: Date }> {
    const windowMs = 60000; // 1 minute
    const resetTime = new Date(Date.now() + windowMs);

    const result = await this.db.query(
      `
      INSERT INTO ts_martha.rate_limits (key, count, reset_time)
      VALUES ($1, 1, $2)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_time < NOW() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_time = CASE
          WHEN rate_limits.reset_time < NOW() THEN $2
          ELSE rate_limits.reset_time
        END
      RETURNING count, reset_time
    `,
      [key, resetTime]
    );

    return {
      count: result.rows[0].count,
      resetTime: result.rows[0].reset_time,
    };
  }

  async reset(key: string): Promise<void> {
    await this.db.query('DELETE FROM ts_martha.rate_limits WHERE key = $1', [key]);
  }

  async cleanup(): Promise<void> {
    await this.db.query('DELETE FROM ts_martha.rate_limits WHERE reset_time < NOW()');
  }
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(
  config: RateLimitConfig,
  store: RateLimitStore = new MemoryStore()
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skip,
    handler,
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip if configured
      if (skip && skip(req)) {
        return next();
      }

      // Generate key
      const key = keyGenerator(req);

      // Increment counter
      const { count, resetTime } = await store.increment(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      // Check if limit exceeded
      if (count > maxRequests) {
        const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        logger.warn('Rate limit exceeded', {
          key,
          count,
          maxRequests,
          path: req.path,
        });

        if (handler) {
          handler(req, res);
        } else {
          next(new RateLimitError(retryAfter));
        }
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', { error });
      // Don't block request on rate limiter errors
      next();
    }
  };
}

/**
 * Predefined rate limiters
 */

// Strict rate limiter for sensitive endpoints
export function strictRateLimiter(store?: RateLimitStore) {
  return createRateLimiter(
    {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    },
    store
  );
}

// Standard rate limiter for API endpoints
export function standardRateLimiter(store?: RateLimitStore) {
  return createRateLimiter(
    {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
    store
  );
}

// Lenient rate limiter for public endpoints
export function lenientRateLimiter(store?: RateLimitStore) {
  return createRateLimiter(
    {
      windowMs: 60000, // 1 minute
      maxRequests: 1000,
    },
    store
  );
}

// By-user rate limiter (requires authentication)
export function userRateLimiter(store?: RateLimitStore) {
  return createRateLimiter(
    {
      windowMs: 60000, // 1 minute
      maxRequests: 50,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id;
        return userId ? `user:${userId}` : req.ip || 'unknown';
      },
    },
    store
  );
}

/**
 * Start periodic cleanup for in-memory store
 */
export function startRateLimitCleanup(
  store: MemoryStore | PostgresStore,
  intervalMs: number = 300000 // 5 minutes
): NodeJS.Timeout {
  return setInterval(() => {
    store.cleanup().catch(error => logger.error('Rate limit cleanup failed', { error }));
  }, intervalMs);
}
