import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import { worktreeManager } from '../../core/worktree-manager.js';
import { getWorktreeRepository } from '../../database/repositories/worktree-repository.js';
import { getRepositoryConfig } from '../../config/repositories.js';
import type { ToolResponse, WorktreeStatus } from '../types.js';

const logger = createLogger({ module: 'worktree-tools' });
const worktreeRepository = getWorktreeRepository();

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
      case 'martha__worktree__create_daily':
        return await this.createDailyBranch(args);
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
   * Create a daily work branch
   */
  private async createDailyBranch(args: Record<string, unknown>): Promise<ToolResponse> {
    const { repository } = args;
    const repoName = typeof repository === 'string' ? repository : 'martha';

    logger.info('Creating daily work branch via MCP tool', { repository: repoName });

    try {
      const config = getRepositoryConfig(repoName);
      const worktree = await worktreeManager.createDailyBranch(config);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                daily_branch: {
                  name: worktree.name,
                  branch: worktree.branch_name,
                  path: worktree.path,
                  repository: worktree.repository_name,
                  ports: worktree.ports,
                  base: worktree.base_branch,
                  created_from: worktree.created_from_commit,
                },
                message: `Daily work branch created: ${worktree.branch_name}`,
                usage: `Now create feature worktrees with: martha__worktree__create(epic_number=123, base_branch="${worktree.branch_name}", repository="${repoName}")`,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to create daily branch', {
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
                suggestion:
                  error instanceof Error && error.message.includes('already exists')
                    ? 'A daily branch for today already exists. Use martha__worktree__list_all to see existing worktrees.'
                    : 'Check the logs for more details.',
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
   * Create a new worktree
   */
  private async createWorktree(args: Record<string, unknown>): Promise<ToolResponse> {
    const { epic_number, branch_name, base_branch, repository } = args;

    // Validate args
    if (typeof epic_number !== 'number') {
      throw new Error('epic_number must be a number');
    }

    const branchName = typeof branch_name === 'string' ? branch_name : `epic-${epic_number}`;
    const baseBranch = typeof base_branch === 'string' ? base_branch : 'develop';
    const repoName = typeof repository === 'string' ? repository : 'martha';

    logger.info('Creating worktree via MCP tool', {
      epic_number,
      branch_name: branchName,
      base_branch: baseBranch,
      repository: repoName
    });

    const config = getRepositoryConfig(repoName);

    // If baseBranch is not 'develop', find the parent worktree
    let parentWorktreeId: number | undefined;
    if (baseBranch !== 'develop' && !baseBranch.startsWith('origin/')) {
      const parentWorktree = await worktreeRepository.findByBranchName(baseBranch);
      if (parentWorktree) {
        parentWorktreeId = parentWorktree.id;
        logger.info('Found parent worktree', {
          parent_id: parentWorktreeId,
          parent_name: parentWorktree.name
        });
      } else {
        logger.warn('Parent worktree not found for base_branch', { base_branch: baseBranch });
      }
    }

    try {
      const worktree = await worktreeManager.createWorktree({
        epicNumber: epic_number,
        branchName,
        baseBranch,
        parentWorktreeId,
        config,
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
                  repository: worktree.repository_name,
                  base_branch: worktree.base_branch,
                  parent: parentWorktreeId
                    ? `Depends on worktree #${parentWorktreeId}`
                    : 'Independent',
                  index: worktree.index,
                  ports: worktree.ports,
                  status: worktree.status,
                },
                message: `Worktree created successfully from ${baseBranch}`,
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
    const { worktree_name, force } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    const forceDelete = typeof force === 'boolean' ? force : false;

    logger.info('Destroying worktree via MCP tool', { worktree_name, force: forceDelete });

    try {
      await worktreeManager.destroyWorktree(worktree_name, forceDelete);

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

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Check if it's a dependency error
      if (errorMsg.includes('dependent worktree')) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Cannot destroy: dependent worktrees exist',
                  message: errorMsg,
                  suggestion:
                    'Destroy child worktrees first or use force=true parameter to override.',
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

      // Other errors
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMsg,
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
