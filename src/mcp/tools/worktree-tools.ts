import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
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
    const { name, branch_name, epic_number } = args;

    if (typeof name !== 'string') {
      throw new Error('name must be a string');
    }

    if (typeof branch_name !== 'string') {
      throw new Error('branch_name must be a string');
    }

    logger.info('Creating worktree', { name, branch_name, epic_number });

    // Placeholder implementation
    // In the future, this will:
    // 1. Create git worktree
    // 2. Allocate port range
    // 3. Generate .env.local
    // 4. Initialize Docker Compose
    // 5. Provision Cloudflare tunnels
    // 6. Start monitoring agent

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message: 'Worktree creation not yet implemented',
              info: 'This will create a full development environment with:',
              features: [
                'Git worktree creation',
                'Port allocation (5 ports per worktree)',
                'Docker Compose environment',
                'Cloudflare tunnel provisioning',
                'Automatic agent startup',
              ],
              manual_steps: [
                `git worktree add /path/to/worktrees/${name} -b ${branch_name}`,
                `cd /path/to/worktrees/${name}`,
                'Setup Docker environment manually for now',
                `npm run agent ${name} . ws://localhost:${appConfig.servicePort}`,
              ],
            },
            null,
            2
          ),
        },
      ],
    };
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

    logger.info('Destroying worktree', { worktree_name });

    // Placeholder implementation
    // In the future, this will:
    // 1. Stop agent
    // 2. Stop containers
    // 3. Remove tunnels
    // 4. Remove git worktree
    // 5. Clean up database records

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message: 'Worktree destruction not yet implemented',
              worktree_name,
              manual_steps: [
                'Stop the agent process',
                'Stop Docker containers: docker compose down',
                'Remove Cloudflare tunnels manually',
                `Remove git worktree: git worktree remove ${worktree_name}`,
              ],
            },
            null,
            2
          ),
        },
      ],
    };
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
