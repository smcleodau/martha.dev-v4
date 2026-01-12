import { pool } from '../client.js';
import { createLogger } from '../../utils/logger.js';
import type {
  TestExecution,
  CreateTestExecutionDTO,
  UpdateTestExecutionDTO,
  TestExecutionStatus,
} from '../models/test-execution.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({ module: 'test-repository' });

/**
 * Test Execution Repository
 *
 * Database operations for test execution tracking
 */
export class TestRepository {
  /**
   * Create a new test execution
   */
  async create(data: CreateTestExecutionDTO): Promise<TestExecution> {
    try {
      const id = uuidv4();

      const result = await pool.query(
        `INSERT INTO ts_martha.test_executions (
          id, worktree_id, issue_number, suites, status, started_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *`,
        [id, data.worktreeId, data.issueNumber || null, data.suites, 'running']
      );

      logger.info('Test execution created', {
        test_execution_id: id,
        worktree_id: data.worktreeId,
        suites: data.suites,
      });

      return this.mapRow(result.rows[0], data.worktreeName);
    } catch (error) {
      logger.error('Failed to create test execution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find test execution by ID
   */
  async findById(id: string): Promise<TestExecution | null> {
    try {
      const result = await pool.query(
        `SELECT te.*, w.name as worktree_name
         FROM ts_martha.test_executions te
         LEFT JOIN ts_martha.worktrees w ON te.worktree_id = w.id
         WHERE te.id = $1`,
        [id]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find test execution', {
        test_execution_id: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find test executions by worktree ID
   */
  async findByWorktreeId(worktreeId: number, limit: number = 50): Promise<TestExecution[]> {
    try {
      const result = await pool.query(
        `SELECT te.*, w.name as worktree_name
         FROM ts_martha.test_executions te
         LEFT JOIN ts_martha.worktrees w ON te.worktree_id = w.id
         WHERE te.worktree_id = $1
         ORDER BY te.started_at DESC
         LIMIT $2`,
        [worktreeId, limit]
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find test executions by worktree', {
        worktree_id: worktreeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find test executions by issue number
   */
  async findByIssueNumber(issueNumber: number, limit: number = 50): Promise<TestExecution[]> {
    try {
      const result = await pool.query(
        `SELECT te.*, w.name as worktree_name
         FROM ts_martha.test_executions te
         LEFT JOIN ts_martha.worktrees w ON te.worktree_id = w.id
         WHERE te.issue_number = $1
         ORDER BY te.started_at DESC
         LIMIT $2`,
        [issueNumber, limit]
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find test executions by issue', {
        issue_number: issueNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find running test executions
   */
  async findRunning(): Promise<TestExecution[]> {
    try {
      const result = await pool.query(
        `SELECT te.*, w.name as worktree_name
         FROM ts_martha.test_executions te
         LEFT JOIN ts_martha.worktrees w ON te.worktree_id = w.id
         WHERE te.status = 'running'
         ORDER BY te.started_at DESC`
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find running test executions', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update test execution
   */
  async update(id: string, data: UpdateTestExecutionDTO): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      if (data.results !== undefined) {
        updates.push(`results = $${paramCount++}`);
        values.push(JSON.stringify(data.results));
      }

      if (data.coveragePercent !== undefined) {
        updates.push(`coverage_percent = $${paramCount++}`);
        values.push(data.coveragePercent);
      }

      if (data.completedAt !== undefined) {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(data.completedAt);
      }

      if (updates.length === 0) {
        return;
      }

      values.push(id);

      await pool.query(
        `UPDATE ts_martha.test_executions
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );

      logger.debug('Test execution updated', { test_execution_id: id });
    } catch (error) {
      logger.error('Failed to update test execution', {
        test_execution_id: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get test execution statistics for a worktree
   */
  async getStatistics(worktreeId: number): Promise<{
    total: number;
    passed: number;
    failed: number;
    running: number;
    avgCoverage: number;
  }> {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'passed') as passed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'running') as running,
          AVG(coverage_percent) as avg_coverage
         FROM ts_martha.test_executions
         WHERE worktree_id = $1`,
        [worktreeId]
      );

      const row = result.rows[0];
      return {
        total: parseInt(row.total, 10),
        passed: parseInt(row.passed, 10),
        failed: parseInt(row.failed, 10),
        running: parseInt(row.running, 10),
        avgCoverage: row.avg_coverage ? parseFloat(row.avg_coverage) : 0,
      };
    } catch (error) {
      logger.error('Failed to get test statistics', {
        worktree_id: worktreeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Map database row to TestExecution model
   */
  private mapRow(row: any, worktreeName?: string): TestExecution {
    return {
      id: row.id,
      worktree_id: row.worktree_id,
      worktree_name: worktreeName || row.worktree_name || undefined,
      issue_number: row.issue_number || undefined,
      suites: row.suites,
      status: row.status as TestExecutionStatus,
      results: row.results ? JSON.parse(row.results) : undefined,
      coverage_percent: row.coverage_percent || undefined,
      started_at: row.started_at,
      completed_at: row.completed_at || undefined,
    };
  }
}

// Singleton instance
let testRepository: TestRepository | null = null;

export function getTestRepository(): TestRepository {
  if (!testRepository) {
    testRepository = new TestRepository();
  }
  return testRepository;
}
