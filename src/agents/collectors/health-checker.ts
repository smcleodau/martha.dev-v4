import { execFile } from 'child_process';
import { promisify } from 'util';

import { createLogger } from '../../utils/logger.js';
import { AgentEvent } from '../types.js';

const execFileAsync = promisify(execFile);
const logger = createLogger({ module: 'health-checker' });

/**
 * Performs health checks on services
 */
export class HealthChecker {
  private ports: Record<string, number>;

  constructor(ports: Record<string, number>) {
    this.ports = ports;
  }

  /**
   * Check service health and return events
   */
  async checkHealth(): Promise<AgentEvent[]> {
    const events: AgentEvent[] = [];

    try {
      // Check API health
      if (this.ports.api) {
        try {
          await execFileAsync(
            'curl',
            ['-sf', `http://localhost:${this.ports.api}/health`],
            { timeout: 5000 }
          );

          events.push({
            type: 'health.check',
            data: {
              service: 'api',
              port: this.ports.api,
              status: 'healthy',
            },
          });
        } catch {
          events.push({
            type: 'health.check',
            data: {
              service: 'api',
              port: this.ports.api,
              status: 'unhealthy',
            },
          });
        }
      }

      // Check PostgreSQL
      if (this.ports.postgres) {
        try {
          await execFileAsync(
            'pg_isready',
            ['-h', 'localhost', '-p', String(this.ports.postgres)],
            { timeout: 5000 }
          );

          events.push({
            type: 'health.check',
            data: {
              service: 'postgres',
              port: this.ports.postgres,
              status: 'healthy',
            },
          });
        } catch {
          events.push({
            type: 'health.check',
            data: {
              service: 'postgres',
              port: this.ports.postgres,
              status: 'unhealthy',
            },
          });
        }
      }
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return events;
  }
}
