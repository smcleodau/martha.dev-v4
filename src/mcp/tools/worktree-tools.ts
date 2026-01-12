import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import { worktreeManager } from '../../core/worktree-manager.js';
import type { ToolResponse, WorktreeStatus } from '../types.js';

const logger = createLogger({ module: 'worktree-tools' });

/**
 * Worktree management tools
 */
export class WorktreeTools {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = `http://localhost:${appConfig.servicePort}`;
  }

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__worktree__create':
        return await this.createWorktree(args);
      case 'martha__worktree__get_status':
        return await this.getStatus(args);
      case 'martha__worktree__destroy':
        return await this.destroyWorktree(args);
      case 'martha__worktree__list_all':
        return await this.listAll(args);
      default:
        throw new Error(`Unknown worktree tool: ${toolName}`);
    }
  }

  /**
   * Create a new worktree
   */
  private async createWorktree(args: Record<string, unknown>): Promise<ToolResponse> {
    const { epic_number, branch_name } = args;

    // Validate args
    if (typeof epic_number !== 'number') {
      throw new Error('epic_number must be a number');
    }

    const branchName = typeof branch_name === 'string' ? branch_name : `epic-${epic_number}`;

    logger.info('Creating worktree via MCP tool', { epic_number, branch_name: branchName });

    try {
      const worktree = await worktreeManager.createWorktree({
        epicNumber: epic_number,
        branchName,
        baseBranch: 'develop',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                worktree: {
                  name: worktree.name,
                  path: worktree.path,
                  branch: worktree.branch_name,
                  index: worktree.index,
                  ports: worktree.ports,
                  status: worktree.status,
                },
                message: `Worktree created successfully at ${worktree.path}`,
                next_steps: [
                  'The worktree is now active and being monitored',
                  `Access the environment at ports ${worktree.ports.service}-${worktree.ports.dashboard}`,
                  'Check the dashboard at https://martha.arch.ie for live status',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to create worktree', {
        epic_number,
        branch_name: branchName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                epic_number,
                branch_name: branchName,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get worktree status
   */
  private async getStatus(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    logger.info('Getting worktree status', { worktree_name });

    try {
      const response = await axios.get<WorktreeStatus>(
        `${this.serviceUrl}/api/v1/worktrees/${worktree_name}`
      );

      const worktree = response.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                worktree: worktree_name,
                status: worktree.status,
                last_seen: worktree.lastSeen,
                agent_version: worktree.agentVersion,
                ports: worktree.ports,
                health: worktree.health,
                summary:
                  worktree.status === 'online'
                    ? '✅ Worktree is online and healthy'
                    : '⚠️  Worktree is offline',
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Worktree not found',
                  worktree_name,
                  suggestion:
                    'The worktree may not have an agent running. Start an agent with: npm run agent',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.error('Failed to get worktree status', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Destroy a worktree
   */
  private async destroyWorktree(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    logger.info('Destroying worktree via MCP tool', { worktree_name });

    try {
      await worktreeManager.destroyWorktree(worktree_name);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Worktree ${worktree_name} destroyed successfully`,
                cleanup_completed: [
                  'Monitoring agent stopped',
                  'Docker containers stopped and volumes removed',
                  'Git worktree removed',
                  'Database records updated',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to destroy worktree', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                worktree_name,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * List all worktrees
   */
  private async listAll(_args: Record<string, unknown>): Promise<ToolResponse> {
    logger.info('Listing all worktrees');

    try {
      const response = await axios.get<{
        worktrees: WorktreeStatus[];
        total: number;
        online: number;
        offline: number;
      }>(`${this.serviceUrl}/api/v1/worktrees`);

      const { worktrees, total, online, offline } = response.data;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                summary: {
                  total,
                  online,
                  offline,
                },
                worktrees: worktrees.map((w) => ({
                  name: w.name,
                  status: w.status,
                  agent_version: w.agentVersion,
                  last_seen: w.lastSeen,
                  ports: Object.keys(w.ports).length > 0 ? w.ports : 'No ports configured',
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to list worktrees', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
