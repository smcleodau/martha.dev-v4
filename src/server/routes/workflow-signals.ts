/**
 * Workflow Signal Routes
 *
 * HTTP endpoints for agents to signal workflows.
 * Agents use these endpoints to communicate progress and events back to workflows.
 *
 * Flow:
 * 1. Agent receives context with signal endpoint URLs
 * 2. Agent makes HTTP POST to signal endpoint
 * 3. Endpoint validates payload and writes telemetry
 * 4. Signal forwarded to Temporal workflow
 * 5. On failure, signal queued in Redis for retry
 */

import { FastifyPluginAsync } from 'fastify';
import { signalWorkflow } from '../../temporal/client.js';
import { createLogger } from '../../utils/logger.js';
import { telemetryWriter } from '../../services/TelemetryWriter.js';

const logger = createLogger({ module: 'workflow-signals' });

/**
 * Signal payload schemas
 */
interface AgentStartedPayload {
  agentId: string;
  timestamp: string;
  environment?: Record<string, string>;
}

interface CommitMadePayload {
  agentId: string;
  commitSha: string;
  commitMessage: string;
  filesChanged: number;
  timestamp: string;
}

interface AgentCompletedPayload {
  agentId: string;
  success: boolean;
  summary: string;
  timestamp: string;
  artifacts?: string[];
}

interface TestResultsPayload {
  agentId: string;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage?: number;
  timestamp: string;
  details?: any;
}

interface BlockPayload {
  agentId: string;
  reason: string;
  category: string;
  retryable: boolean;
  timestamp: string;
  context?: any;
}

/**
 * Generic signal request
 */
interface SignalRequest {
  workflowId: string;
  signalName: string;
  payload: any;
}

/**
 * Register workflow signal routes
 */
export const registerWorkflowSignalRoutes: FastifyPluginAsync = async (server) => {
  /**
   * Generic signal endpoint
   * POST /api/v1/workflows/:workflowId/signals/:signalName
   */
  server.post<{
    Params: { workflowId: string; signalName: string };
    Body: any;
  }>('/api/v1/workflows/:workflowId/signals/:signalName', async (request, reply) => {
    const { workflowId, signalName } = request.params;
    const payload = request.body;

    logger.info('Received generic signal', {
      workflowId,
      signalName,
      payload,
    });

    try {
      // Write telemetry event
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'signal_received_http',
        eventCategory: 'signal',
        severity: 'info',
        payload: {
          signalName,
          data: payload,
        },
        source: 'http',
      });

      // Forward signal to workflow
      await signalWorkflow(workflowId, signalName, [payload]);

      logger.info('Signal forwarded to workflow', {
        workflowId,
        signalName,
      });

      return {
        success: true,
        workflowId,
        signalName,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward signal', {
        workflowId,
        signalName,
        error: error.message,
      });

      // Write error telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'signal_forward_failed',
        eventCategory: 'signal',
        severity: 'error',
        errorMessage: error.message,
        errorStack: error.stack,
        payload: {
          signalName,
          data: payload,
        },
        source: 'http',
      });

      // TODO: Queue signal in Redis for retry if workflow unreachable

      reply.status(500);
      return {
        success: false,
        error: error.message,
        workflowId,
        signalName,
      };
    }
  });

  /**
   * Agent Started Signal
   * POST /api/v1/workflows/:workflowId/signals/agent-started
   */
  server.post<{
    Params: { workflowId: string };
    Body: AgentStartedPayload;
  }>('/api/v1/workflows/:workflowId/signals/agent-started', async (request, reply) => {
    const { workflowId } = request.params;
    const payload = request.body;

    logger.info('Agent started signal received', {
      workflowId,
      agentId: payload.agentId,
    });

    try {
      // Validate payload
      if (!payload.agentId || !payload.timestamp) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields: agentId, timestamp',
        };
      }

      // Write telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'agent_started_http',
        eventCategory: 'agent',
        severity: 'info',
        payload,
        source: 'http',
      });

      // Forward to workflow
      await signalWorkflow(workflowId, 'agentStarted', [payload]);

      return {
        success: true,
        workflowId,
        signalName: 'agentStarted',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward agent-started signal', {
        workflowId,
        error: error.message,
      });

      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Commit Made Signal
   * POST /api/v1/workflows/:workflowId/signals/commit-made
   */
  server.post<{
    Params: { workflowId: string };
    Body: CommitMadePayload;
  }>('/api/v1/workflows/:workflowId/signals/commit-made', async (request, reply) => {
    const { workflowId } = request.params;
    const payload = request.body;

    logger.info('Commit made signal received', {
      workflowId,
      agentId: payload.agentId,
      commitSha: payload.commitSha,
    });

    try {
      // Validate payload
      if (!payload.agentId || !payload.commitSha || !payload.commitMessage) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields: agentId, commitSha, commitMessage',
        };
      }

      // Write telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'commit_made_http',
        eventCategory: 'development',
        severity: 'info',
        payload,
        source: 'http',
      });

      // Forward to workflow
      await signalWorkflow(workflowId, 'commitMade', [payload]);

      return {
        success: true,
        workflowId,
        signalName: 'commitMade',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward commit-made signal', {
        workflowId,
        error: error.message,
      });

      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Agent Completed Signal
   * POST /api/v1/workflows/:workflowId/signals/agent-completed
   */
  server.post<{
    Params: { workflowId: string };
    Body: AgentCompletedPayload;
  }>('/api/v1/workflows/:workflowId/signals/agent-completed', async (request, reply) => {
    const { workflowId } = request.params;
    const payload = request.body;

    logger.info('Agent completed signal received', {
      workflowId,
      agentId: payload.agentId,
      success: payload.success,
    });

    try {
      // Validate payload
      if (!payload.agentId || payload.success === undefined || !payload.summary) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields: agentId, success, summary',
        };
      }

      // Write telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'agent_completed_http',
        eventCategory: 'agent',
        severity: payload.success ? 'info' : 'warning',
        payload,
        source: 'http',
      });

      // Forward to workflow
      await signalWorkflow(workflowId, 'agentCompleted', [payload]);

      return {
        success: true,
        workflowId,
        signalName: 'agentCompleted',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward agent-completed signal', {
        workflowId,
        error: error.message,
      });

      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Test Results Signal
   * POST /api/v1/workflows/:workflowId/signals/test-results
   */
  server.post<{
    Params: { workflowId: string };
    Body: TestResultsPayload;
  }>('/api/v1/workflows/:workflowId/signals/test-results', async (request, reply) => {
    const { workflowId } = request.params;
    const payload = request.body;

    logger.info('Test results signal received', {
      workflowId,
      agentId: payload.agentId,
      passed: payload.testsPassed,
      failed: payload.testsFailed,
    });

    try {
      // Validate payload
      if (
        !payload.agentId ||
        payload.testsPassed === undefined ||
        payload.testsFailed === undefined
      ) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields: agentId, testsPassed, testsFailed',
        };
      }

      // Write telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'test_results_http',
        eventCategory: 'testing',
        severity: payload.testsFailed > 0 ? 'warning' : 'info',
        payload,
        source: 'http',
      });

      // Forward to workflow
      await signalWorkflow(workflowId, 'testResults', [payload]);

      return {
        success: true,
        workflowId,
        signalName: 'testResults',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward test-results signal', {
        workflowId,
        error: error.message,
      });

      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  /**
   * Block Signal
   * POST /api/v1/workflows/:workflowId/signals/block
   */
  server.post<{
    Params: { workflowId: string };
    Body: BlockPayload;
  }>('/api/v1/workflows/:workflowId/signals/block', async (request, reply) => {
    const { workflowId } = request.params;
    const payload = request.body;

    logger.warn('Block signal received', {
      workflowId,
      agentId: payload.agentId,
      reason: payload.reason,
      category: payload.category,
    });

    try {
      // Validate payload
      if (!payload.agentId || !payload.reason || !payload.category) {
        reply.status(400);
        return {
          success: false,
          error: 'Missing required fields: agentId, reason, category',
        };
      }

      // Write telemetry
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'workflow_blocked_http',
        eventCategory: 'workflow',
        severity: 'error',
        payload,
        source: 'http',
      });

      // Forward to workflow
      await signalWorkflow(workflowId, 'setBlockSignal', [payload]);

      return {
        success: true,
        workflowId,
        signalName: 'setBlockSignal',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to forward block signal', {
        workflowId,
        error: error.message,
      });

      reply.status(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  logger.info('Workflow signal routes registered');
};
