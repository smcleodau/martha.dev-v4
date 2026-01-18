/**
 * Error Monitoring and Alerting
 * TASK-7.4.1: Comprehensive error monitoring
 */

import { pool } from '../database/client.js';
import { createLogger } from '../utils/logger.js';
import EventEmitter from 'events';

const monitorLogger = createLogger({ module: 'error-monitor' });

export interface ErrorMetrics {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
  recentErrors: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
  }>;
}

export interface AlertThresholds {
  criticalErrorsPerMinute: number;
  highErrorsPerMinute: number;
  errorRatePercentage: number;
  consecutiveFailures: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  criticalErrorsPerMinute: 5,
  highErrorsPerMinute: 10,
  errorRatePercentage: 10, // 10% error rate
  consecutiveFailures: 3,
};

/**
 * Error monitor with real-time alerting
 */
export class ErrorMonitor extends EventEmitter {
  private thresholds: AlertThresholds;
  private checkInterval: NodeJS.Timeout | null = null;
  private consecutiveFailureCount: number = 0;
  private lastCheckTime: Date = new Date();

  constructor(thresholds: Partial<AlertThresholds> = {}) {
    super();
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start monitoring errors
   */
  start(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      monitorLogger.warn('Error monitor already running');
      return;
    }

    monitorLogger.info('Starting error monitor', {
      interval: intervalMs,
      thresholds: this.thresholds,
    });

    this.checkInterval = setInterval(async () => {
      await this.checkErrors();
    }, intervalMs);

    // Run initial check
    void this.checkErrors();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      monitorLogger.info('Error monitor stopped');
    }
  }

  /**
   * Check for errors and trigger alerts
   */
  private async checkErrors(): Promise<void> {
    try {
      const metrics = await this.getErrorMetrics();
      const alerts = this.evaluateThresholds(metrics);

      if (alerts.length > 0) {
        for (const alert of alerts) {
          this.emit('alert', alert);
          monitorLogger.warn('Error alert triggered', alert);
        }
      }

      // Track consecutive failures
      if (metrics.critical > 0 || metrics.high > 0) {
        this.consecutiveFailureCount++;
      } else {
        this.consecutiveFailureCount = 0;
      }

      this.lastCheckTime = new Date();
    } catch (error) {
      monitorLogger.error('Error monitor check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get current error metrics
   */
  async getErrorMetrics(): Promise<ErrorMetrics> {
    try {
      // Get error counts by severity (last 5 minutes)
      const severityResult = await pool.query<{
        severity: string;
        count: string;
      }>(
        `
        SELECT severity, COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '5 minutes'
          AND resolved = FALSE
        GROUP BY severity
        `
      );

      // Get error counts by type (last 5 minutes)
      const typeResult = await pool.query<{
        exception_type: string;
        count: string;
      }>(
        `
        SELECT exception_type, COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '5 minutes'
          AND resolved = FALSE
        GROUP BY exception_type
        `
      );

      // Get recent errors
      const recentResult = await pool.query<{
        id: number;
        exception_type: string;
        severity: string;
        title: string;
        detected_at: Date;
      }>(
        `
        SELECT id, exception_type, severity, title, detected_at
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '5 minutes'
          AND resolved = FALSE
        ORDER BY detected_at DESC
        LIMIT 10
        `
      );

      // Parse results
      const severityCounts: Record<string, number> = {};
      for (const row of severityResult.rows) {
        severityCounts[row.severity] = parseInt(row.count);
      }

      const typeCounts: Record<string, number> = {};
      for (const row of typeResult.rows) {
        typeCounts[row.exception_type] = parseInt(row.count);
      }

      const total = Object.values(severityCounts).reduce((sum, count) => sum + count, 0);

      return {
        total,
        critical: severityCounts.critical || 0,
        high: severityCounts.high || 0,
        medium: severityCounts.medium || 0,
        low: severityCounts.low || 0,
        byType: typeCounts,
        recentErrors: recentResult.rows.map((row) => ({
          id: row.id,
          type: row.exception_type,
          severity: row.severity,
          message: row.title,
          timestamp: row.detected_at,
        })),
      };
    } catch (error) {
      monitorLogger.error('Failed to get error metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byType: {},
        recentErrors: [],
      };
    }
  }

  /**
   * Evaluate thresholds and generate alerts
   */
  private evaluateThresholds(metrics: ErrorMetrics): Array<{
    level: 'critical' | 'warning';
    type: string;
    message: string;
    metrics: any;
  }> {
    const alerts: Array<{
      level: 'critical' | 'warning';
      type: string;
      message: string;
      metrics: any;
    }> = [];

    // Check critical error rate
    if (metrics.critical >= this.thresholds.criticalErrorsPerMinute) {
      alerts.push({
        level: 'critical',
        type: 'HIGH_CRITICAL_ERROR_RATE',
        message: `Critical error rate exceeded: ${metrics.critical} errors in last 5 minutes (threshold: ${this.thresholds.criticalErrorsPerMinute}/min)`,
        metrics: {
          count: metrics.critical,
          threshold: this.thresholds.criticalErrorsPerMinute,
          recentErrors: metrics.recentErrors.filter((e) => e.severity === 'critical'),
        },
      });
    }

    // Check high error rate
    if (metrics.high >= this.thresholds.highErrorsPerMinute) {
      alerts.push({
        level: 'warning',
        type: 'HIGH_ERROR_RATE',
        message: `High error rate exceeded: ${metrics.high} errors in last 5 minutes (threshold: ${this.thresholds.highErrorsPerMinute}/min)`,
        metrics: {
          count: metrics.high,
          threshold: this.thresholds.highErrorsPerMinute,
          recentErrors: metrics.recentErrors.filter((e) => e.severity === 'high'),
        },
      });
    }

    // Check consecutive failures
    if (this.consecutiveFailureCount >= this.thresholds.consecutiveFailures) {
      alerts.push({
        level: 'critical',
        type: 'CONSECUTIVE_FAILURES',
        message: `System has ${this.consecutiveFailureCount} consecutive failure checks (threshold: ${this.thresholds.consecutiveFailures})`,
        metrics: {
          consecutiveCount: this.consecutiveFailureCount,
          threshold: this.thresholds.consecutiveFailures,
        },
      });
    }

    // Check for specific error type spikes
    for (const [type, count] of Object.entries(metrics.byType)) {
      if (count >= 5) {
        // More than 5 of the same error type
        alerts.push({
          level: 'warning',
          type: 'ERROR_TYPE_SPIKE',
          message: `Spike in ${type} errors: ${count} occurrences in last 5 minutes`,
          metrics: {
            errorType: type,
            count,
          },
        });
      }
    }

    return alerts;
  }

  /**
   * Get error statistics for dashboard
   */
  async getErrorStatistics(hours: number = 24): Promise<{
    totalErrors: number;
    resolvedErrors: number;
    openErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorTrend: Array<{ hour: string; count: number }>;
  }> {
    try {
      // Total counts
      const countsResult = await pool.query<{
        resolved: boolean;
        count: string;
      }>(
        `
        SELECT resolved, COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '${hours} hours'
        GROUP BY resolved
        `
      );

      // By type
      const typeResult = await pool.query<{
        exception_type: string;
        count: string;
      }>(
        `
        SELECT exception_type, COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '${hours} hours'
        GROUP BY exception_type
        ORDER BY count DESC
        `
      );

      // By severity
      const severityResult = await pool.query<{
        severity: string;
        count: string;
      }>(
        `
        SELECT severity, COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '${hours} hours'
        GROUP BY severity
        `
      );

      // Hourly trend
      const trendResult = await pool.query<{
        hour: string;
        count: string;
      }>(
        `
        SELECT
          DATE_TRUNC('hour', detected_at) as hour,
          COUNT(*) as count
        FROM ts_martha.exceptions
        WHERE detected_at > NOW() - INTERVAL '${hours} hours'
        GROUP BY DATE_TRUNC('hour', detected_at)
        ORDER BY hour
        `
      );

      const totalErrors = countsResult.rows.reduce(
        (sum, row) => sum + parseInt(row.count),
        0
      );
      const resolvedErrors = parseInt(
        countsResult.rows.find((r) => r.resolved)?.count || '0'
      );
      const openErrors = parseInt(
        countsResult.rows.find((r) => !r.resolved)?.count || '0'
      );

      const errorsByType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        errorsByType[row.exception_type] = parseInt(row.count);
      }

      const errorsBySeverity: Record<string, number> = {};
      for (const row of severityResult.rows) {
        errorsBySeverity[row.severity] = parseInt(row.count);
      }

      const errorTrend = trendResult.rows.map((row) => ({
        hour: row.hour,
        count: parseInt(row.count),
      }));

      return {
        totalErrors,
        resolvedErrors,
        openErrors,
        errorsByType,
        errorsBySeverity,
        errorTrend,
      };
    } catch (error) {
      monitorLogger.error('Failed to get error statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

// Global instance
export const errorMonitor = new ErrorMonitor();
