import type { FastifyInstance } from 'fastify';
import { createLogger } from '../../utils/logger.js';
import { getTestRunner } from '../../core/test-runner.js';
import { getWorktreeRepository } from '../../database/repositories/worktree-repository.js';

const logger = createLogger({ module: 'test-routes' });

/**
 * Test execution API routes
 */
export async function testRoutes(fastify: FastifyInstance) {
  const testRunner = getTestRunner();
  const worktreeRepo = getWorktreeRepository();

  /**
   * POST /api/v1/tests/trigger
   * Trigger test execution for a worktree
   */
  fastify.post<{
    Body: {
      worktree_name: string;
      suites: string[];
      issue_number?: number;
    };
  }>('/api/v1/tests/trigger', async (request, reply) => {
    const { worktree_name, suites, issue_number } = request.body;

    // Validate input
    if (!worktree_name || !suites || !Array.isArray(suites) || suites.length === 0) {
      return reply.status(400).send({
        error: 'Invalid request',
        message: 'worktree_name and suites (array) are required',
      });
    }

    logger.info('Triggering test execution', {
      worktree_name,
      suites,
      issue_number,
    });

    try {
      // Get worktree from database
      const worktree = await worktreeRepo.findByName(worktree_name);

      if (!worktree) {
        return reply.status(404).send({
          error: 'Worktree not found',
          worktree_name,
        });
      }

      // Validate worktree is active
      if (worktree.status !== 'active') {
        return reply.status(400).send({
          error: 'Worktree is not active',
          worktree_name,
          status: worktree.status,
        });
      }

      // Trigger test execution
      const testExecutionId = await testRunner.runTests({
        worktreeId: worktree.id,
        worktreeName: worktree.name,
        worktreePath: worktree.path,
        suites,
        issueNumber: issue_number,
      });

      return reply.status(202).send({
        success: true,
        test_execution_id: testExecutionId,
        worktree_name,
        suites,
        message: 'Test execution started. Tests are running asynchronously.',
      });
    } catch (error) {
      logger.error('Failed to trigger test execution', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        error: 'Failed to trigger test execution',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/tests/:test_execution_id
   * Get test execution results by ID
   */
  fastify.get<{
    Params: {
      test_execution_id: string;
    };
  }>('/api/v1/tests/:test_execution_id', async (request, reply) => {
    const { test_execution_id } = request.params;

    logger.debug('Getting test results', { test_execution_id });

    try {
      const testExecution = await testRunner.getStatus(test_execution_id);

      if (!testExecution) {
        return reply.status(404).send({
          error: 'Test execution not found',
          test_execution_id,
        });
      }

      // Format response
      const response: any = {
        test_execution_id: testExecution.id,
        worktree_name: testExecution.worktree_name,
        issue_number: testExecution.issue_number,
        suites: testExecution.suites,
        status: testExecution.status,
        started_at: testExecution.started_at,
        completed_at: testExecution.completed_at,
      };

      if (testExecution.status === 'running') {
        response.message = 'Test execution is still running';
        response.elapsed_time_ms =
          new Date().getTime() - new Date(testExecution.started_at).getTime();
      } else {
        // Include results
        response.results = testExecution.results;
        response.coverage_percent = testExecution.coverage_percent;

        if (testExecution.results) {
          response.summary = {
            total: testExecution.results.total,
            passed: testExecution.results.passed,
            failed: testExecution.results.failed,
            skipped: testExecution.results.skipped,
            duration_ms: testExecution.results.duration_ms,
            success_rate:
              testExecution.results.total > 0
                ? ((testExecution.results.passed / testExecution.results.total) * 100).toFixed(
                    2
                  ) + '%'
                : 'N/A',
          };
        }
      }

      return reply.send(response);
    } catch (error) {
      logger.error('Failed to get test results', {
        test_execution_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        error: 'Failed to get test results',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/tests/history/worktree/:worktree_name
   * Get test execution history for a worktree
   */
  fastify.get<{
    Params: {
      worktree_name: string;
    };
    Querystring: {
      limit?: string;
    };
  }>('/api/v1/tests/history/worktree/:worktree_name', async (request, reply) => {
    const { worktree_name } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

    logger.debug('Getting test history for worktree', { worktree_name, limit });

    try {
      // Get worktree from database
      const worktree = await worktreeRepo.findByName(worktree_name);

      if (!worktree) {
        return reply.status(404).send({
          error: 'Worktree not found',
          worktree_name,
        });
      }

      const testExecutions = await testRunner.getHistory(worktree.id, limit);

      return reply.send({
        worktree_name,
        count: testExecutions.length,
        test_executions: testExecutions.map((te) => ({
          test_execution_id: te.id,
          issue_number: te.issue_number,
          suites: te.suites,
          status: te.status,
          started_at: te.started_at,
          completed_at: te.completed_at,
          summary: te.results
            ? {
                total: te.results.total,
                passed: te.results.passed,
                failed: te.results.failed,
                coverage_percent: te.coverage_percent,
              }
            : null,
        })),
      });
    } catch (error) {
      logger.error('Failed to get test history', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        error: 'Failed to get test history',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/tests/history/issue/:issue_number
   * Get test execution history for an issue
   */
  fastify.get<{
    Params: {
      issue_number: string;
    };
    Querystring: {
      limit?: string;
    };
  }>('/api/v1/tests/history/issue/:issue_number', async (request, reply) => {
    const issue_number = parseInt(request.params.issue_number, 10);
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

    if (isNaN(issue_number)) {
      return reply.status(400).send({
        error: 'Invalid issue number',
        issue_number: request.params.issue_number,
      });
    }

    logger.debug('Getting test history for issue', { issue_number, limit });

    try {
      const testExecutions = await testRunner.getHistoryByIssue(issue_number, limit);

      return reply.send({
        issue_number,
        count: testExecutions.length,
        test_executions: testExecutions.map((te) => ({
          test_execution_id: te.id,
          worktree_name: te.worktree_name,
          suites: te.suites,
          status: te.status,
          started_at: te.started_at,
          completed_at: te.completed_at,
          summary: te.results
            ? {
                total: te.results.total,
                passed: te.results.passed,
                failed: te.results.failed,
                coverage_percent: te.coverage_percent,
              }
            : null,
        })),
      });
    } catch (error) {
      logger.error('Failed to get test history for issue', {
        issue_number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return reply.status(500).send({
        error: 'Failed to get test history',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
