import axios from 'axios';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';
import { getIssueTracker } from '../../integrations/github/issue-tracker.js';
import { getProjectBoard } from '../../integrations/github/project-board.js';
import type { ToolResponse } from '../types.js';

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
      // Check if GitHub token is configured
      if (!process.env.GITHUB_TOKEN) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'GitHub token not configured',
                  message: 'Set GITHUB_TOKEN environment variable to use GitHub integration',
                  fallback_mode: true,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Fetch epic from GitHub and store in database
      const tracker = getIssueTracker();
      const board = getProjectBoard();

      const epic = await tracker.trackEpic(epic_number, branchName);

      // Mark epic as in progress
      await board.markIssueAsInProgress(epic_number);

      // Comment on epic that work has started
      await board.commentWorkStarted(epic_number, branchName);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                epic: {
                  epic_number: epic.epic_number,
                  title: epic.title,
                  description: epic.description,
                  state: epic.state,
                  sub_issues: epic.sub_issues,
                  completion_percentage: epic.completion_percentage,
                  worktree_name: branchName,
                },
                message: `Epic #${epic_number} tracking started. Worktree: ${branchName}`,
                next_steps: [
                  `Create worktree: martha__worktree__create name="${branchName}" branch_name="${branchName}"`,
                  'Start development in the new worktree',
                  'Monitor progress with martha__epic__get_status',
                ],
                github_integration: {
                  status_label_added: 'status:in-progress',
                  comment_posted: true,
                  sub_issues_tracked: epic.sub_issues.length,
                },
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

    try {
      const tracker = getIssueTracker();
      const epic = await tracker.getEpic(epic_number);

      if (!epic) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Epic not found',
                  epic_number,
                  suggestion: 'Start tracking the epic first with martha__epic__start',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Get worktree status if associated
      let worktreeStatus = null;
      if (epic.worktree_name) {
        try {
          const response = await axios.get(
            `${this.serviceUrl}/api/v1/worktrees/${epic.worktree_name}`
          );
          worktreeStatus = response.data;
        } catch {
          // Worktree not found or offline
          worktreeStatus = { status: 'offline' };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                epic_number,
                title: epic.title,
                state: epic.state,
                completion_percentage: epic.completion_percentage,
                sub_issues: {
                  total: epic.sub_issues.length,
                  closed: epic.sub_issues.filter((s) => s.state === 'closed').length,
                  open: epic.sub_issues.filter((s) => s.state === 'open').length,
                  list: epic.sub_issues.map((s) => ({
                    number: s.number,
                    title: s.title,
                    state: s.state,
                  })),
                },
                worktree: epic.worktree_name
                  ? {
                      name: epic.worktree_name,
                      status: worktreeStatus?.status || 'unknown',
                      agent_version: worktreeStatus?.agentVersion,
                    }
                  : null,
                updated_at: epic.updated_at,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to get epic status', {
        epic_number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
