/**
 * Health Check Routes
 *
 * Comprehensive health checks for database, Temporal, and system resources
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';

const logger = createLogger({ module: 'health' });

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Health routes for Fastify
 */
export async function healthRoutes(fastify: FastifyInstance) {
  /**
   * GET /health - Basic health check
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'martha-orchestration',
      version: appConfig.mcpServerVersion || '3.0.0',
    });
  });

  /**
   * GET /health/ready - Readiness check
   */
  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    // For now, just return ready
    // TODO: Add database and Temporal checks when needed
    return reply.status(200).send({
      ready: true,
      timestamp: new Date().toISOString()
    });
  });
}
