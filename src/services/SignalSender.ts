/**
 * Signal Sender Service
 *
 * Sends workflow signals to the API server.
 * Used by agent spawner to notify workflows of agent progress.
 */

import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'signal-sender' });

export interface SignalPayload {
  agentId: string;
  [key: string]: any;
}

export class SignalSender {
  constructor(private apiUrl: string) {}

  /**
   * Send agent-started signal
   */
  async sendAgentStarted(
    workflowId: string,
    payload: {
      agentId: string;
      timestamp: string;
      environment?: Record<string, string>;
    }
  ): Promise<void> {
    await this.sendSignal(workflowId, 'agent-started', payload);
  }

  /**
   * Send agent-completed signal
   */
  async sendAgentCompleted(
    workflowId: string,
    payload: {
      agentId: string;
      success: boolean;
      summary: string;
      timestamp: string;
      artifacts?: string[];
    }
  ): Promise<void> {
    await this.sendSignal(workflowId, 'agent-completed', payload);
  }

  /**
   * Send commit-made signal
   */
  async sendCommitMade(
    workflowId: string,
    payload: {
      agentId: string;
      commitSha: string;
      commitMessage: string;
      filesChanged: number;
      timestamp: string;
    }
  ): Promise<void> {
    await this.sendSignal(workflowId, 'commit-made', payload);
  }

  /**
   * Send test-results signal
   */
  async sendTestResults(
    workflowId: string,
    payload: {
      agentId: string;
      testsPassed: number;
      testsFailed: number;
      testsSkipped: number;
      coverage?: number;
      timestamp: string;
      details?: any;
    }
  ): Promise<void> {
    await this.sendSignal(workflowId, 'test-results', payload);
  }

  /**
   * Send block signal
   */
  async sendBlock(
    workflowId: string,
    payload: {
      agentId: string;
      reason: string;
      category: string;
      retryable: boolean;
      timestamp: string;
      context?: any;
    }
  ): Promise<void> {
    await this.sendSignal(workflowId, 'block', payload);
  }

  /**
   * Generic signal sender
   */
  private async sendSignal(
    workflowId: string,
    signalName: string,
    payload: SignalPayload
  ): Promise<void> {
    const url = `${this.apiUrl}/api/v1/workflows/${workflowId}/signals/${signalName}`;

    try {
      logger.info('Sending signal', {
        workflowId,
        signalName,
        agentId: payload.agentId,
      });

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.success) {
        logger.info('Signal sent successfully', {
          workflowId,
          signalName,
          agentId: payload.agentId,
        });
      } else {
        logger.error('Signal rejected by server', {
          workflowId,
          signalName,
          error: response.data.error,
        });
      }
    } catch (error: any) {
      logger.error('Failed to send signal', {
        workflowId,
        signalName,
        error: error.message,
        code: error.code,
        url,
      });
      // Don't throw - we don't want to crash the spawner if signal fails
    }
  }
}
