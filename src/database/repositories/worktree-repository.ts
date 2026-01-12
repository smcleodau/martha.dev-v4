import { pool } from '../client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'worktree-repository' });

/**
 * Worktree database model
 */
export interface Worktree {
  id: number;
  name: string;
  epic_id?: number;
  path: string;
  branch_name: string;
  index: number;
  ports: {
    service: number;
    redis: number;
    mcp: number;
    metrics: number;
    dashboard: number;
  };
  containers?: Record<string, any>;
  database?: Record<string, any>;
  status: 'provisioning' | 'active' | 'paused' | 'destroyed';
  base_branch?: string;
  parent_worktree_id?: number;
  created_from_commit?: string;
  is_daily_branch?: boolean;
  repository_name?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Worktree Repository
 *
 * Database operations for worktree management
 */
export class WorktreeRepository {
  /**
   * Find worktree by name
   */
  async findByName(name: string): Promise<Worktree | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE name = $1`,
        [name]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find worktree by name', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find worktree by ID
   */
  async findById(id: number): Promise<Worktree | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE id = $1`,
        [id]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find worktree by id', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * List all worktrees
   */
  async findAll(): Promise<Worktree[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees ORDER BY created_at DESC`
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to list worktrees', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find worktrees by epic ID
   */
  async findByEpicId(epicId: number): Promise<Worktree[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE epic_id = $1 ORDER BY created_at DESC`,
        [epicId]
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find worktrees by epic', {
        epic_id: epicId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find worktree by branch name
   */
  async findByBranchName(branchName: string): Promise<Worktree | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE branch_name = $1`,
        [branchName]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find worktree by branch name', {
        branch_name: branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find child worktrees that depend on a parent
   */
  async findChildrenOfWorktree(parentId: number): Promise<Worktree[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE parent_worktree_id = $1 AND status != $2`,
        [parentId, 'destroyed']
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find child worktrees', {
        parent_id: parentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find worktrees created from a specific base branch
   */
  async findByBaseBranch(baseBranch: string): Promise<Worktree[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE base_branch = $1 AND status != $2 ORDER BY created_at DESC`,
        [baseBranch, 'destroyed']
      );

      return result.rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find worktrees by base branch', {
        base_branch: baseBranch,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find the daily work branch worktree (if exists)
   */
  async findDailyBranch(): Promise<Worktree | null> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.worktrees WHERE is_daily_branch = TRUE AND status = $1 ORDER BY created_at DESC LIMIT 1`,
        ['active']
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find daily branch', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a new worktree
   */
  async create(data: {
    name: string;
    epicId?: number;
    path: string;
    branchName: string;
    index: number;
    ports: Worktree['ports'];
    status?: 'provisioning' | 'active' | 'paused' | 'destroyed';
    baseBranch?: string;
    parentWorktreeId?: number;
    createdFromCommit?: string;
    isDailyBranch?: boolean;
    repositoryName?: string;
  }): Promise<Worktree> {
    try {
      const result = await pool.query(
        `INSERT INTO ts_martha.worktrees (
          name, epic_id, path, branch_name, index, ports, status,
          base_branch, parent_worktree_id, created_from_commit, is_daily_branch, repository_name,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *`,
        [
          data.name,
          data.epicId || null,
          data.path,
          data.branchName,
          data.index,
          JSON.stringify(data.ports),
          data.status || 'provisioning',
          data.baseBranch || null,
          data.parentWorktreeId || null,
          data.createdFromCommit || null,
          data.isDailyBranch || false,
          data.repositoryName || 'martha.dev-v4',
        ]
      );

      logger.info('Worktree created', {
        worktree_id: result.rows[0].id,
        name: data.name,
        base_branch: data.baseBranch,
        is_daily_branch: data.isDailyBranch,
      });

      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create worktree', {
        name: data.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update worktree
   */
  async update(
    id: number,
    data: {
      status?: Worktree['status'];
      containers?: Record<string, any>;
      database?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      if (data.containers !== undefined) {
        updates.push(`containers = $${paramCount++}`);
        values.push(JSON.stringify(data.containers));
      }

      if (data.database !== undefined) {
        updates.push(`database = $${paramCount++}`);
        values.push(JSON.stringify(data.database));
      }

      if (updates.length === 0) {
        return;
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      await pool.query(
        `UPDATE ts_martha.worktrees
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );

      logger.debug('Worktree updated', { worktree_id: id });
    } catch (error) {
      logger.error('Failed to update worktree', {
        worktree_id: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete worktree
   */
  async delete(id: number): Promise<void> {
    try {
      await pool.query(
        `DELETE FROM ts_martha.worktrees WHERE id = $1`,
        [id]
      );

      logger.info('Worktree deleted', { worktree_id: id });
    } catch (error) {
      logger.error('Failed to delete worktree', {
        worktree_id: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Map database row to Worktree model
   */
  private mapRow(row: any): Worktree {
    return {
      id: row.id,
      name: row.name,
      epic_id: row.epic_id || undefined,
      path: row.path,
      branch_name: row.branch_name,
      index: row.index,
      ports: typeof row.ports === 'string' ? JSON.parse(row.ports) : row.ports,
      containers: row.containers
        ? typeof row.containers === 'string'
          ? JSON.parse(row.containers)
          : row.containers
        : undefined,
      database: row.database
        ? typeof row.database === 'string'
          ? JSON.parse(row.database)
          : row.database
        : undefined,
      status: row.status,
      base_branch: row.base_branch || undefined,
      parent_worktree_id: row.parent_worktree_id || undefined,
      created_from_commit: row.created_from_commit || undefined,
      is_daily_branch: row.is_daily_branch || false,
      repository_name: row.repository_name || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Singleton instance
let worktreeRepository: WorktreeRepository | null = null;

export function getWorktreeRepository(): WorktreeRepository {
  if (!worktreeRepository) {
    worktreeRepository = new WorktreeRepository();
  }
  return worktreeRepository;
}
