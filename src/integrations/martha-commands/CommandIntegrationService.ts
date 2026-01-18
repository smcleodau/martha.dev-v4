/**
 * Martha Command Integration Service
 *
 * Provides integration points for Martha commands (/martha:2x2, /martha:spawn, etc.)
 * These services are called by the Martha commands in the workflow repo
 */

import { Client, Connection } from '@temporalio/client';
import { Pool } from 'pg';
import logger from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';

export interface BatchStartRequest {
  batchId: string;
  epicIds: string[];
  worktree: string;
  branch: string;
}

export interface BatchStartResponse {
  success: boolean;
  workflowIds: string[];
  batchId: string;
  message: string;
}

export interface AgentSpawnRequest {
  issueId: string;
  epicId: string;
  batchId: string;
  agentType?: string; // If not provided, ML selector chooses
}

export interface AgentSpawnResponse {
  success: boolean;
  workflowId: string;
  agentId: string;
  agentType: string;
}

export interface GateCheckRequest {
  batchId: string;
  phase: 'setup' | 'pre_review' | 'pre_merge';
}

export interface GateCheckResponse {
  passed: boolean;
  phase: string;
  checks: GateCheck[];
  blockers: string[];
}

export interface GateCheck {
  name: string;
  passed: boolean;
  message: string;
}

export class CommandIntegrationService {
  private temporalClient: Client | null = null;

  constructor(private db: Pool) {}

  /**
   * Initialize Temporal client connection
   */
  async initialize(): Promise<void> {
    const connection = await Connection.connect({
      address: appConfig.temporal?.address || 'localhost:7233',
    });

    this.temporalClient = new Client({
      connection,
      namespace: appConfig.temporal?.namespace || 'default',
    });

    logger.info('Command integration service initialized');
  }

  /**
   * /martha:2x2 - Start the 2x2 march (BatchCoordinatorWorkflow)
   *
   * Called when user runs /martha:2x2 command
   * Starts BatchCoordinatorWorkflow for all epics in batch
   */
  async start2x2March(request: BatchStartRequest): Promise<BatchStartResponse> {
    logger.info('Starting 2x2 march', { batchId: request.batchId, epicCount: request.epicIds.length });

    try {
      if (!this.temporalClient) {
        throw new Error('Temporal client not initialized');
      }

      // Start BatchCoordinatorWorkflow
      const workflowId = `batch-coordinator-${request.batchId}`;

      const handle = await this.temporalClient.workflow.start('BatchCoordinatorWorkflow', {
        workflowId,
        taskQueue: appConfig.temporal?.taskQueue || 'martha-tasks',
        args: [
          {
            batchId: request.batchId,
            epicIds: request.epicIds,
            worktree: request.worktree,
            branch: request.branch,
          },
        ],
      });

      logger.info('BatchCoordinatorWorkflow started', { workflowId, batchId: request.batchId });

      return {
        success: true,
        workflowIds: [workflowId],
        batchId: request.batchId,
        message: `Batch coordinator started for ${request.epicIds.length} epics`,
      };
    } catch (error) {
      logger.error('Failed to start 2x2 march', { error, batchId: request.batchId });

      return {
        success: false,
        workflowIds: [],
        batchId: request.batchId,
        message: `Failed to start batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * /martha:spawn - Spawn agent for an issue
   *
   * Uses ML agent selector if agentType not specified
   */
  async spawnAgent(request: AgentSpawnRequest): Promise<AgentSpawnResponse> {
    logger.info('Spawning agent for issue', { issueId: request.issueId, agentType: request.agentType });

    try {
      if (!this.temporalClient) {
        throw new Error('Temporal client not initialized');
      }

      // Select agent type using ML if not provided
      let agentType = request.agentType;
      if (!agentType) {
        agentType = await this.selectAgent(request.issueId);
      }

      // Start IssueLifecycleWorkflow
      const workflowId = `issue-${request.issueId}-${Date.now()}`;

      const handle = await this.temporalClient.workflow.start('IssueLifecycleWorkflow', {
        workflowId,
        taskQueue: appConfig.temporal?.taskQueue || 'martha-tasks',
        args: [
          {
            issueId: request.issueId,
            epicId: request.epicId,
            batchId: request.batchId,
            agentId: agentType,
            agentType,
          },
        ],
      });

      logger.info('IssueLifecycleWorkflow started', { workflowId, issueId: request.issueId, agentType });

      return {
        success: true,
        workflowId,
        agentId: agentType,
        agentType,
      };
    } catch (error) {
      logger.error('Failed to spawn agent', { error, issueId: request.issueId });

      return {
        success: false,
        workflowId: '',
        agentId: '',
        agentType: request.agentType || 'unknown',
      };
    }
  }

  /**
   * /martha:gate - Check gate criteria
   *
   * Queries all workflows in batch and validates gate criteria
   */
  async checkGate(request: GateCheckRequest): Promise<GateCheckResponse> {
    logger.info('Checking gate criteria', { batchId: request.batchId, phase: request.phase });

    try {
      const checks: GateCheck[] = [];
      const blockers: string[] = [];

      // Get all issues in batch
      const issues = await this.getBatchIssues(request.batchId);

      // Check 1: All issues must be in appropriate status
      const statusCheck = await this.validateIssueStatuses(request.batchId, request.phase);
      checks.push(statusCheck);
      if (!statusCheck.passed) {
        blockers.push(statusCheck.message);
      }

      // Check 2: No open exceptions
      const exceptionsCheck = await this.validateNoExceptions(request.batchId);
      checks.push(exceptionsCheck);
      if (!exceptionsCheck.passed) {
        blockers.push(exceptionsCheck.message);
      }

      // Check 3: Tests passing (for pre_merge phase)
      if (request.phase === 'pre_merge') {
        const testsCheck = await this.validateTestsPassing(request.batchId);
        checks.push(testsCheck);
        if (!testsCheck.passed) {
          blockers.push(testsCheck.message);
        }
      }

      // Check 4: Code review approved (for pre_merge phase)
      if (request.phase === 'pre_merge') {
        const reviewCheck = await this.validateReviewApproved(request.batchId);
        checks.push(reviewCheck);
        if (!reviewCheck.passed) {
          blockers.push(reviewCheck.message);
        }
      }

      const passed = blockers.length === 0;

      logger.info('Gate check complete', {
        batchId: request.batchId,
        phase: request.phase,
        passed,
        blockers: blockers.length,
      });

      return {
        passed,
        phase: request.phase,
        checks,
        blockers,
      };
    } catch (error) {
      logger.error('Gate check failed', { error, batchId: request.batchId });

      return {
        passed: false,
        phase: request.phase,
        checks: [],
        blockers: [`Gate check error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Select agent type using ML model
   */
  private async selectAgent(issueId: string): Promise<string> {
    // Query the active model
    const result = await this.db.query(`
      SELECT * FROM ts_martha.get_active_model()
    `);

    if (result.rows.length === 0) {
      // Default to general-purpose agent if no model
      logger.warn('No active ML model, using default agent', { issueId });
      return 'general-purpose';
    }

    // Get issue complexity and type from tracker
    // This would integrate with the tracker API
    const issueComplexity = 3; // Placeholder
    const issueType = 'feature'; // Placeholder

    // Use model to predict best agent
    // For now, simple heuristic:
    if (issueComplexity > 7) {
      return 'Plan'; // High complexity needs planning
    } else if (issueType === 'bug') {
      return 'general-purpose'; // Bugs need flexibility
    } else {
      return 'general-purpose'; // Default
    }
  }

  /**
   * Get all issues in a batch
   */
  private async getBatchIssues(batchId: string): Promise<string[]> {
    // This would query the tracker .batch-tracker.json file
    // For now, placeholder
    return [];
  }

  /**
   * Validate issue statuses for gate
   */
  private async validateIssueStatuses(batchId: string, phase: string): Promise<GateCheck> {
    const result = await this.db.query(
      `
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE success = true) AS completed
      FROM ts_martha.agent_performance
      WHERE batch_id = $1
    `,
      [batchId]
    );

    const { total, completed } = result.rows[0];

    if (phase === 'setup') {
      return {
        name: 'Issues in Setup',
        passed: total > 0,
        message: total > 0 ? `${total} issues ready` : 'No issues in batch',
      };
    }

    const allComplete = parseInt(total) > 0 && parseInt(completed) === parseInt(total);

    return {
      name: 'All Issues Complete',
      passed: allComplete,
      message: `${completed}/${total} issues completed`,
    };
  }

  /**
   * Validate no open exceptions
   */
  private async validateNoExceptions(batchId: string): Promise<GateCheck> {
    const result = await this.db.query(`
      SELECT * FROM ts_martha.get_open_exceptions()
      WHERE batch_id = $1
    `, [batchId]);

    const openExceptions = result.rows.length;

    return {
      name: 'No Open Exceptions',
      passed: openExceptions === 0,
      message: openExceptions === 0 ? 'No exceptions' : `${openExceptions} open exceptions`,
    };
  }

  /**
   * Validate tests passing
   */
  private async validateTestsPassing(batchId: string): Promise<GateCheck> {
    const result = await this.db.query(
      `
      SELECT AVG(test_pass_rate) AS avg_pass_rate
      FROM ts_martha.agent_performance
      WHERE batch_id = $1 AND test_pass_rate IS NOT NULL
    `,
      [batchId]
    );

    const avgPassRate = parseFloat(result.rows[0]?.avg_pass_rate || '0');
    const passed = avgPassRate >= 95;

    return {
      name: 'Tests Passing',
      passed,
      message: `Average pass rate: ${avgPassRate.toFixed(1)}%`,
    };
  }

  /**
   * Validate code review approved
   */
  private async validateReviewApproved(batchId: string): Promise<GateCheck> {
    // This would check GitHub PR approval status
    // Placeholder for now
    return {
      name: 'Code Review Approved',
      passed: true,
      message: 'Review status not yet integrated',
    };
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    if (this.temporalClient) {
      this.temporalClient.connection.close();
      this.temporalClient = null;
    }
  }
}
