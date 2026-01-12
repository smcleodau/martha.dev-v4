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
  }): Promise<Worktree> {
    try {
      const result = await pool.query(
        `INSERT INTO ts_martha.worktrees (
          name, epic_id, path, branch_name, index, ports, status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *`,
        [
          data.name,
          data.epicId || null,
          data.path,
          data.branchName,
          data.index,
          JSON.stringify(data.ports),
          data.status || 'provisioning',
        ]
      );

      logger.info('Worktree created', {
        worktree_id: result.rows[0].id,
        name: data.name,
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
