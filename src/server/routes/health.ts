import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import { appConfig } from '../../config/index.js';
import { checkDatabaseHealth } from '../../database/client.js';
import { checkRedisHealth } from '../../redis/client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'health' });

/**
 * Health check routes
 */
export async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'healthy',
      service: 'martha-typescript',
      version: '3.0.0',
      worktree: appConfig.worktreeName,
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed health check with dependencies
  fastify.get('/health/detailed', async (_request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();

    // Check all dependencies
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const duration = Date.now() - startTime;
    const allHealthy = dbHealthy && redisHealthy;

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      service: 'martha-typescript',
      version: '3.0.0',
      worktree: appConfig.worktreeName,
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealthy ? 'healthy' : 'unhealthy',
          schema: appConfig.databaseSchema,
        },
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          keyPrefix: appConfig.redisKeyPrefix,
        },
      },
      duration_ms: duration,
    };

    logger.debug('Health check completed', response);

    return reply
      .code(allHealthy ? 200 : 503)
      .send(response);
  });

  // Readiness check (for k8s/orchestration)
  fastify.get('/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const ready = dbHealthy && redisHealthy;

    return reply
      .code(ready ? 200 : 503)
      .send({
        ready,
        timestamp: new Date().toISOString(),
      });
  });

  // Liveness check (for k8s/orchestration)
  fastify.get('/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });
}
