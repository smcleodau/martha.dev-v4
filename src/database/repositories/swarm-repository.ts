import { pool } from '../client.js';
import { createLogger } from '../../utils/logger.js';
import type {
  Swarm,
  CreateSwarmDTO,
  UpdateSwarmDTO,
  SwarmStatus
} from '../models/swarm.js';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger({ module: 'swarm-repository' });

/**
 * Swarm Repository
 *
 * Database operations for swarm management
 */
export class SwarmRepository {
  /**
   * Create a new swarm
   */
  async create(data: CreateSwarmDTO): Promise<Swarm> {
    try {
      const id = uuidv4();

      const result = await pool.query(
        `INSERT INTO ts_martha.swarms (
          id, epic_id, worktree_id, worktree_path, pid, status, config,
          resource_usage, agent_count, task_count, last_heartbeat,
          created_at, updated_at
        )
        SELECT
          $1,
          (SELECT id FROM ts_martha.epics WHERE epic_number = $2),
          (SELECT id FROM ts_martha.worktrees WHERE id = $3),
          $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW()
        RETURNING *`,
        [
          id,
          data.epicNumber || null,
          data.worktreeId || null,
          data.worktreePath,
          data.pid,
          'spawning',
          JSON.stringify(data.config),
          JSON.stringify({ cpu: 0, memory: 0, elapsed: 0 }),
          0,
          0
        ]
      );

      logger.info('Swarm created', {
        swarm_id: id,
        epic_number: data.epicNumber,
        worktree_path: data.worktreePath,
        pid: data.pid
      });

      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create swarm', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find swarm by ID
   */
  async findById(id: string): Promise<Swarm | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM ts_martha.swarms WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find swarm by ID', {
        swarm_id: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find swarm by PID
   */
  async findByPID(pid: number): Promise<Swarm | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM ts_martha.swarms WHERE pid = $1',
        [pid]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Failed to find swarm by PID', {
        pid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find swarms by epic number
   */
  async findByEpicNumber(epicNumber: number): Promise<Swarm[]> {
    try {
      const result = await pool.query(
        `SELECT s.* FROM ts_martha.swarms s
         JOIN ts_martha.epics e ON s.epic_id = e.id
         WHERE e.epic_number = $1
         ORDER BY s.created_at DESC`,
        [epicNumber]
      );

      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find swarms by epic number', {
        epic_number: epicNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find active swarms
   */
  async findActive(): Promise<Swarm[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.swarms
         WHERE status IN ('running', 'spawning', 'paused')
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find active swarms', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Find all swarms
   */
  async findAll(limit: number = 100): Promise<Swarm[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM ts_martha.swarms ORDER BY created_at DESC LIMIT $1',
        [limit]
      );

      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find all swarms', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update swarm
   */
  async update(id: string, data: UpdateSwarmDTO): Promise<void> {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      if (data.resourceUsage !== undefined) {
        updates.push(`resource_usage = $${paramCount++}`);
        values.push(JSON.stringify(data.resourceUsage));
      }

      if (data.agentCount !== undefined) {
        updates.push(`agent_count = $${paramCount++}`);
        values.push(data.agentCount);
      }

      if (data.taskCount !== undefined) {
        updates.push(`task_count = $${paramCount++}`);
        values.push(data.taskCount);
      }

      if (data.lastHeartbeat !== undefined) {
        updates.push(`last_heartbeat = $${paramCount++}`);
        values.push(data.lastHeartbeat);
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await pool.query(
        `UPDATE ts_martha.swarms
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}`,
        values
      );

      logger.debug('Swarm updated', { swarm_id: id });
    } catch (error) {
      logger.error('Failed to update swarm', {
        swarm_id: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Delete swarm
   */
  async delete(id: string): Promise<void> {
    try {
      await pool.query('DELETE FROM ts_martha.swarms WHERE id = $1', [id]);

      logger.info('Swarm deleted', { swarm_id: id });
    } catch (error) {
      logger.error('Failed to delete swarm', {
        swarm_id: id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if swarm is stale (no heartbeat in 5 minutes)
   */
  async findStaleSwarms(): Promise<Swarm[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM ts_martha.swarms
         WHERE status IN ('running', 'spawning')
         AND last_heartbeat < NOW() - INTERVAL '5 minutes'
         ORDER BY last_heartbeat ASC`
      );

      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to find stale swarms', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Map database row to Swarm model
   */
  private mapRow(row: any): Swarm {
    return {
      id: row.id,
      epic_number: row.epic_number || null,
      worktree_id: row.worktree_id || null,
      worktree_path: row.worktree_path,
      pid: row.pid,
      status: row.status,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      resource_usage: typeof row.resource_usage === 'string'
        ? JSON.parse(row.resource_usage)
        : row.resource_usage,
      agent_count: row.agent_count || 0,
      task_count: row.task_count || 0,
      last_heartbeat: row.last_heartbeat,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

// Singleton instance
let swarmRepository: SwarmRepository | null = null;

export function getSwarmRepository(): SwarmRepository {
  if (!swarmRepository) {
    swarmRepository = new SwarmRepository();
  }
  return swarmRepository;
}
