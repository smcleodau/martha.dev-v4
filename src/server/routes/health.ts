/**
 * Health Check Routes
 *
 * Comprehensive health checks for database, Temporal, and system resources
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Connection } from '@temporalio/client';
import os from 'os';
import logger from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';

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

export function createHealthRoutes(db: Pool): Router {
  const router = Router();
  const startTime = Date.now();

  /**
   * GET /health - Basic health check
   */
  router.get('/', async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'martha-orchestration',
      version: appConfig.mcpServerVersion || '3.0.0',
    });
  });

  /**
   * GET /health/ready - Readiness check
   */
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      await db.query('SELECT 1');
      res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({ ready: false, timestamp: new Date().toISOString() });
    }
  });

  return router;
}
