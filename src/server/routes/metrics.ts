/**
 * Prometheus Metrics Routes
 * TASK-7.4.3: Expose metrics for Prometheus scraping
 */

import { FastifyPluginAsync } from 'fastify';
import { getMetrics, getMetricsJSON } from '../../monitoring/prometheus-metrics.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'metrics-routes' });

export const metricsRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /metrics - Prometheus metrics endpoint
   * Returns metrics in Prometheus text format
   */
  server.get('/metrics', async (request, reply) => {
    try {
      const metrics = await getMetrics();
      reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return metrics;
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      reply.status(500);
      return { error: 'Failed to get metrics' };
    }
  });

  /**
   * GET /metrics/json - Metrics in JSON format (for debugging)
   */
  server.get('/metrics/json', async (request, reply) => {
    try {
      const metrics = await getMetricsJSON();
      return { metrics };
    } catch (error) {
      logger.error('Failed to get metrics JSON', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      reply.status(500);
      return { error: 'Failed to get metrics' };
    }
  });

  logger.info('Metrics routes registered');
};
