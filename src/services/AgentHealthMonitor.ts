/**
 * Agent Health Monitor Service
 *
 * Monitors spawned agent processes for crashes and failures.
 * Provides recovery mechanisms for failed agents.
 *
 * Features:
 * - Process health checks every 30 seconds
 * - Crash detection via process.kill(0)
 * - Automatic block signal on crash
 * - Process registry for tracking active agents
 * - Cleanup on service shutdown
 */

import { createLogger } from '../utils/logger.js';
import { telemetryWriter } from './TelemetryWriter.js';
import { signalWorkflow } from '../temporal/client.js';

const logger = createLogger({ module: 'agent-health-monitor' });

/**
 * Health check interval (30 seconds)
 */
const HEALTH_CHECK_INTERVAL_MS = 30000;

/**
 * Agent process info
 */
interface AgentProcessInfo {
  agentId: string;
  processId: number;
  workflowId: string;
  issueId?: string;
  startTime: number;
  lastCheckTime: number;
  consecutiveFailures: number;
}

/**
 * Agent Health Monitor
 */
export class AgentHealthMonitor {
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private agentProcesses: Map<string, AgentProcessInfo> = new Map();
  private shuttingDown = false;

  /**
   * Start monitoring an agent process
   */
  startMonitoring(
    agentId: string,
    processId: number,
    workflowId: string,
    issueId?: string
  ): void {
    logger.info('Starting agent health monitoring', {
      agentId,
      processId,
      workflowId,
      issueId,
    });

    // Store agent process info
    this.agentProcesses.set(agentId, {
      agentId,
      processId,
      workflowId,
      issueId,
      startTime: Date.now(),
      lastCheckTime: Date.now(),
      consecutiveFailures: 0,
    });

    // Create monitoring interval
    const intervalId = setInterval(async () => {
      if (this.shuttingDown) {
        return;
      }

      await this.performHealthCheck(agentId);
    }, HEALTH_CHECK_INTERVAL_MS);

    this.monitoringIntervals.set(agentId, intervalId);

    logger.info('Agent health monitoring started', {
      agentId,
      intervalMs: HEALTH_CHECK_INTERVAL_MS,
    });
  }

  /**
   * Stop monitoring an agent process
   */
  stopMonitoring(agentId: string): void {
    logger.info('Stopping agent health monitoring', { agentId });

    // Clear interval
    const intervalId = this.monitoringIntervals.get(agentId);
    if (intervalId) {
      clearInterval(intervalId);
      this.monitoringIntervals.delete(agentId);
    }

    // Remove process info
    this.agentProcesses.delete(agentId);

    logger.info('Agent health monitoring stopped', { agentId });
  }

  /**
   * Perform health check on an agent
   */
  private async performHealthCheck(agentId: string): Promise<void> {
    const processInfo = this.agentProcesses.get(agentId);

    if (!processInfo) {
      logger.warn('Agent process info not found', { agentId });
      this.stopMonitoring(agentId);
      return;
    }

    const isAlive = await this.checkAgentAlive(agentId, processInfo.processId);

    if (isAlive) {
      // Process is alive, reset failure counter
      processInfo.lastCheckTime = Date.now();
      processInfo.consecutiveFailures = 0;

      logger.debug('Agent health check passed', {
        agentId,
        processId: processInfo.processId,
        uptime: Date.now() - processInfo.startTime,
      });

      // Write telemetry for successful health check
      await telemetryWriter.writeEvent({
        workflowId: processInfo.workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'agent_health_check_passed',
        eventCategory: 'agent',
        severity: 'debug',
        issueId: processInfo.issueId,
        payload: {
          agentId,
          processId: processInfo.processId,
          uptime: Date.now() - processInfo.startTime,
        },
        source: 'health-monitor',
      });
    } else {
      // Process is not alive
      processInfo.consecutiveFailures++;

      logger.error('Agent health check failed', {
        agentId,
        processId: processInfo.processId,
        consecutiveFailures: processInfo.consecutiveFailures,
      });

      // On first failure, handle crash
      if (processInfo.consecutiveFailures === 1) {
        await this.handleAgentCrash(agentId, processInfo.workflowId);
      }

      // Stop monitoring after crash
      this.stopMonitoring(agentId);
    }
  }

  /**
   * Check if an agent process is alive
   */
  private async checkAgentAlive(agentId: string, processId: number): Promise<boolean> {
    try {
      // Use process.kill(0) to check if process exists
      // This doesn't actually kill the process, just checks if it exists
      process.kill(processId, 0);
      return true;
    } catch (error: any) {
      // ESRCH error means process doesn't exist
      if (error.code === 'ESRCH') {
        logger.warn('Agent process not found', {
          agentId,
          processId,
        });
        return false;
      }

      // EPERM error means process exists but we don't have permission
      // This is fine - process is alive
      if (error.code === 'EPERM') {
        return true;
      }

      // Other errors
      logger.error('Error checking agent process', {
        agentId,
        processId,
        error: error.message,
        code: error.code,
      });

      return false;
    }
  }

  /**
   * Handle agent crash
   */
  private async handleAgentCrash(agentId: string, workflowId: string): Promise<void> {
    const processInfo = this.agentProcesses.get(agentId);

    logger.error('Agent crashed', {
      agentId,
      workflowId,
      processId: processInfo?.processId,
      uptime: processInfo ? Date.now() - processInfo.startTime : undefined,
    });

    try {
      // Write telemetry event
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'agent_crashed',
        eventCategory: 'agent',
        severity: 'error',
        issueId: processInfo?.issueId,
        payload: {
          agentId,
          processId: processInfo?.processId,
          uptime: processInfo ? Date.now() - processInfo.startTime : undefined,
          lastCheckTime: processInfo?.lastCheckTime,
        },
        source: 'health-monitor',
      });

      // Send block signal to workflow
      await this.sendCrashBlockSignal(agentId, workflowId, processInfo);

      logger.info('Crash block signal sent to workflow', {
        agentId,
        workflowId,
      });
    } catch (error: any) {
      logger.error('Failed to handle agent crash', {
        agentId,
        workflowId,
        error: error.message,
      });
    }
  }

  /**
   * Send block signal to workflow for agent crash
   */
  private async sendCrashBlockSignal(
    agentId: string,
    workflowId: string,
    processInfo?: AgentProcessInfo
  ): Promise<void> {
    try {
      const payload = {
        agentId,
        reason: `Agent process crashed (PID: ${processInfo?.processId || 'unknown'})`,
        category: 'agent_crash',
        retryable: true,
        timestamp: new Date().toISOString(),
        context: {
          processId: processInfo?.processId,
          uptime: processInfo ? Date.now() - processInfo.startTime : undefined,
          lastCheckTime: processInfo?.lastCheckTime,
        },
      };

      await signalWorkflow(workflowId, 'setBlockSignal', [payload]);

      logger.info('Block signal sent to workflow', {
        workflowId,
        agentId,
        payload,
      });
    } catch (error: any) {
      logger.error('Failed to send block signal', {
        workflowId,
        agentId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get monitoring status for an agent
   */
  getMonitoringStatus(agentId: string): {
    isMonitored: boolean;
    processInfo?: AgentProcessInfo;
  } {
    const processInfo = this.agentProcesses.get(agentId);
    return {
      isMonitored: this.monitoringIntervals.has(agentId),
      processInfo,
    };
  }

  /**
   * Get all monitored agents
   */
  getMonitoredAgents(): AgentProcessInfo[] {
    return Array.from(this.agentProcesses.values());
  }

  /**
   * Shutdown monitor and cleanup all intervals
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down agent health monitor', {
      monitoredAgents: this.agentProcesses.size,
    });

    this.shuttingDown = true;

    // Clear all intervals
    for (const [agentId, intervalId] of this.monitoringIntervals.entries()) {
      clearInterval(intervalId);
      logger.debug('Stopped monitoring agent', { agentId });
    }

    // Clear maps
    this.monitoringIntervals.clear();
    this.agentProcesses.clear();

    logger.info('Agent health monitor shutdown complete');
  }
}

/**
 * Singleton instance
 */
export const agentHealthMonitor = new AgentHealthMonitor();

/**
 * Setup cleanup on process exit
 */
process.on('SIGTERM', async () => {
  await agentHealthMonitor.shutdown();
});

process.on('SIGINT', async () => {
  await agentHealthMonitor.shutdown();
});
