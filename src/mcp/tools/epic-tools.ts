import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import type { ToolResponse, EpicContext } from '../types.js';

const logger = createLogger({ module: 'epic-tools' });

/**
 * Epic management tools
 */
export class EpicTools {
  private serviceUrl: string;

  constructor() {
    this.serviceUrl = `http://localhost:${appConfig.servicePort}`;
  }

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__epic__start':
        return await this.startEpic(args);
      case 'martha__epic__get_context':
        return await this.getContext(args);
      case 'martha__epic__get_status':
        return await this.getStatus(args);
      default:
        throw new Error(`Unknown epic tool: ${toolName}`);
    }
  }

  /**
   * Start tracking an epic and provision a worktree
   */
  private async startEpic(args: Record<string, unknown>): Promise<ToolResponse> {
    const { epic_number, branch_name } = args;

    if (typeof epic_number !== 'number') {
      throw new Error('epic_number must be a number');
    }

    const branchName =
      typeof branch_name === 'string' ? branch_name : `epic-${epic_number}`;

    logger.info('Starting epic', { epic_number, branch_name: branchName });

    try {
      // For now, return a placeholder response
      // In the future, this will:
      // 1. Fetch epic from GitHub GraphQL
      // 2. Store in PostgreSQL
      // 3. Create worktree
      // 4. Provision tunnels
      // 5. Start monitoring

      const response: EpicContext = {
        epic_number,
        title: `Epic #${epic_number}`,
        description: 'Epic tracking started',
        state: 'in_progress',
        sub_issues: [],
        worktree_name: branchName,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                epic: response,
                message: `Epic #${epic_number} tracking started. Worktree: ${branchName}`,
                next_steps: [
                  `Create worktree: martha__worktree__create name="${branchName}" branch_name="${branchName}"`,
                  'Start development in the new worktree',
                  'Monitor progress with martha__epic__get_status',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to start epic', {
        epic_number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get context for an epic
   */
  private async getContext(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    logger.info('Getting epic context', { worktree_name });

    try {
      // Query worktree status from service
      const response = await axios.get(
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
                context: {
                  agent_version: worktree.agentVersion,
                  last_seen: worktree.lastSeen,
                  ports: worktree.ports,
                  health: worktree.health,
                },
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
                  suggestion: 'Create the worktree first with martha__worktree__create',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      logger.error('Failed to get epic context', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get epic status
   */
  private async getStatus(args: Record<string, unknown>): Promise<ToolResponse> {
    const { epic_number } = args;

    if (typeof epic_number !== 'number') {
      throw new Error('epic_number must be a number');
    }

    logger.info('Getting epic status', { epic_number });

    // Placeholder response
    // In the future, this will query:
    // - Database for epic record
    // - Associated worktree status
    // - Test execution results
    // - Evidence collection status

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              epic_number,
              status: 'in_progress',
              message: 'Epic status tracking not yet implemented',
              info: 'This will show completion percentage, sub-issue status, test results, etc.',
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
