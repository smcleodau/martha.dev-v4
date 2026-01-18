/**
 * Martha Command Integration API Routes
 *
 * These endpoints are called by Martha commands in the workflow repo
 * to trigger orchestration workflows
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { CommandIntegrationService } from '../../integrations/martha-commands/CommandIntegrationService.js';
import logger from '../../utils/logger.js';

export function createCommandRoutes(db: Pool): Router {
  const router = Router();
  const commandService = new CommandIntegrationService(db);

  // Initialize service on first use
  let initialized = false;
  const ensureInitialized = async () => {
    if (!initialized) {
      await commandService.initialize();
      initialized = true;
    }
  };

  /**
   * POST /api/commands/2x2
   * Start the 2x2 march (BatchCoordinatorWorkflow)
   *
   * Called by /martha:2x2 command
   */
  router.post('/2x2', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { batchId, epicIds, worktree, branch } = req.body;

      if (!batchId || !Array.isArray(epicIds) || epicIds.length === 0) {
        return res.status(400).json({
          error: 'Missing required fields: batchId, epicIds (non-empty array)',
        });
      }

      const result = await commandService.start2x2March({
        batchId,
        epicIds,
        worktree: worktree || 'unknown',
        branch: branch || 'main',
      });

      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      logger.error('2x2 command failed', { error });
      res.status(500).json({ error: 'Command failed' });
    }
  });

  /**
   * POST /api/commands/spawn
   * Spawn agent for an issue (IssueLifecycleWorkflow)
   *
   * Called by /martha:spawn command
   */
  router.post('/spawn', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { issueId, epicId, batchId, agentType } = req.body;

      if (!issueId || !epicId || !batchId) {
        return res.status(400).json({
          error: 'Missing required fields: issueId, epicId, batchId',
        });
      }

      const result = await commandService.spawnAgent({
        issueId,
        epicId,
        batchId,
        agentType,
      });

      res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
      logger.error('Spawn command failed', { error });
      res.status(500).json({ error: 'Command failed' });
    }
  });

  /**
   * POST /api/commands/gate
   * Check gate criteria for batch progression
   *
   * Called by /martha:gate command
   */
  router.post('/gate', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { batchId, phase } = req.body;

      if (!batchId || !phase) {
        return res.status(400).json({
          error: 'Missing required fields: batchId, phase',
        });
      }

      if (!['setup', 'pre_review', 'pre_merge'].includes(phase)) {
        return res.status(400).json({
          error: 'Invalid phase. Must be: setup, pre_review, or pre_merge',
        });
      }

      const result = await commandService.checkGate({
        batchId,
        phase,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error('Gate check failed', { error });
      res.status(500).json({ error: 'Gate check failed' });
    }
  });

  /**
   * GET /api/commands/batch/:batchId
   * Get batch status
   *
   * Returns current state of all workflows in batch
   */
  router.get('/batch/:batchId', async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;

      // Query telemetry for batch status
      const result = await db.query(
        `
        SELECT
          workflow_id,
          issue_id,
          event_type,
          MAX(timestamp) AS last_event,
          COUNT(*) AS event_count
        FROM ts_martha.telemetry_events
        WHERE batch_id = $1
        GROUP BY workflow_id, issue_id, event_type
        ORDER BY workflow_id, last_event DESC
      `,
        [batchId]
      );

      const workflows: Record<string, any> = {};

      for (const row of result.rows) {
        if (!workflows[row.workflow_id]) {
          workflows[row.workflow_id] = {
            workflow_id: row.workflow_id,
            issue_id: row.issue_id,
            events: [],
            last_event: row.last_event,
          };
        }

        workflows[row.workflow_id].events.push({
          type: row.event_type,
          count: parseInt(row.event_count),
          last_seen: row.last_event,
        });
      }

      res.json({
        batch_id: batchId,
        workflows: Object.values(workflows),
        total_workflows: Object.keys(workflows).length,
      });
    } catch (error) {
      logger.error('Failed to get batch status', { error, batchId: req.params.batchId });
      res.status(500).json({ error: 'Failed to get batch status' });
    }
  });

  /**
   * GET /api/commands/workflow/:workflowId
   * Get workflow status
   *
   * Query workflow progress and current stage
   */
  router.get('/workflow/:workflowId', async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;

      // Get workflow telemetry
      const telemetryResult = await db.query(
        `
        SELECT * FROM ts_martha.get_workflow_telemetry_summary($1)
      `,
        [workflowId]
      );

      if (telemetryResult.rows.length === 0) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const summary = telemetryResult.rows[0];

      // Get exceptions for this workflow
      const exceptionsResult = await db.query(
        `SELECT * FROM ts_martha.get_workflow_exceptions($1)`,
        [workflowId]
      );

      res.json({
        workflow_id: workflowId,
        summary,
        exceptions: exceptionsResult.rows,
      });
    } catch (error) {
      logger.error('Failed to get workflow status', {
        error,
        workflowId: req.params.workflowId,
      });
      res.status(500).json({ error: 'Failed to get workflow status' });
    }
  });

  /**
   * POST /api/commands/workflow/:workflowId/signal
   * Send signal to workflow
   *
   * Allows commands to send signals to running workflows
   */
  router.post('/workflow/:workflowId/signal', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { workflowId } = req.params;
      const { signalName, args } = req.body;

      if (!signalName) {
        return res.status(400).json({ error: 'Missing required field: signalName' });
      }

      // This would use Temporal client to send signal
      // Placeholder for now
      logger.info('Sending signal to workflow', { workflowId, signalName });

      res.json({
        success: true,
        workflow_id: workflowId,
        signal_name: signalName,
        message: 'Signal sent (not yet implemented)',
      });
    } catch (error) {
      logger.error('Failed to send signal', { error, workflowId: req.params.workflowId });
      res.status(500).json({ error: 'Failed to send signal' });
    }
  });

  /**
   * GET /api/commands/health
   * Health check for command integration service
   */
  router.get('/health', async (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      initialized,
      service: 'command-integration',
    });
  });

  return router;
}
