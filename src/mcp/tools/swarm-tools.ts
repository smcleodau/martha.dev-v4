import { createLogger } from '../../utils/logger.js';
import { getSwarmOrchestrator } from '../../core/swarm-orchestrator.js';
import { getSwarmRepository } from '../../database/repositories/swarm-repository.js';
import { getIssueTracker } from '../../integrations/github/issue-tracker.js';
import type { ToolResponse } from '../types.js';

const logger = createLogger({ module: 'swarm-tools' });

/**
 * Swarm management MCP tools
 */
export class SwarmTools {
  private swarmOrchestrator = getSwarmOrchestrator();
  private swarmRepository = getSwarmRepository();

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__swarm__spawn':
        return await this.spawnSwarm(args);
      case 'martha__swarm__status':
        return await this.getStatus(args);
      case 'martha__swarm__terminate':
        return await this.terminate(args);
      case 'martha__swarm__list_active':
        return await this.listActive(args);
      default:
        throw new Error(`Unknown swarm tool: ${toolName}`);
    }
  }

  /**
   * Spawn a new swarm
   */
  private async spawnSwarm(args: Record<string, unknown>): Promise<ToolResponse> {
    const { epic_number, worktree_path } = args;

    if (typeof worktree_path !== 'string') {
      throw new Error('worktree_path must be a string');
    }

    const epicNumber = typeof epic_number === 'number' ? epic_number : undefined;

    logger.info('Spawning swarm', { epic_number: epicNumber, worktree_path });

    try {
      // Get epic context if epic number provided
      let epicContext;
      if (epicNumber && process.env.GITHUB_TOKEN) {
        try {
          const issueTracker = getIssueTracker();
          const epic = await issueTracker.getEpic(epicNumber);

          if (epic) {
            epicContext = {
              epic_number: epic.epic_number,
              title: epic.title,
              description: epic.description,
              sub_issues: epic.sub_issues,
              completion_percentage: epic.completion_percentage
            };
          }
        } catch (epicError) {
          logger.warn('Failed to fetch epic context', {
            epic_number: epicNumber,
            error: epicError instanceof Error ? epicError.message : 'Unknown error'
          });
        }
      }

      // Spawn swarm
      const swarm = await this.swarmOrchestrator.spawn({
        epicNumber,
        worktreePath: worktree_path,
        epicContext
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                swarm: {
                  swarm_id: swarm.id,
                  epic_number: epicNumber,
                  worktree_path,
                  pid: swarm.pid,
                  status: swarm.status,
                  config: swarm.config
                },
                message: `Swarm spawned successfully`,
                next_steps: [
                  'Swarm is initializing and will start working automatically',
                  `Monitor progress: martha__swarm__status swarm_id="${swarm.id}"`,
                  `Check worktree events: martha__events__get_recent worktree_name="${worktree_path.split('/').pop()}"`,
                  'Hooks will fire callbacks to Martha service as work progresses'
                ],
                monitoring: {
                  state_file: `${worktree_path}/.swarm/state.json`,
                  logs: `${worktree_path}/.swarm/logs/`,
                  health_check_interval: '30 seconds'
                }
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to spawn swarm', {
        worktree_path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to spawn swarm',
                worktree_path,
                message: error instanceof Error ? error.message : 'Unknown error',
                suggestion: 'Check that worktree path exists and claude-flow is installed'
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Get swarm status
   */
  private async getStatus(args: Record<string, unknown>): Promise<ToolResponse> {
    const { swarm_id } = args;

    if (typeof swarm_id !== 'string') {
      throw new Error('swarm_id must be a string');
    }

    logger.info('Getting swarm status', { swarm_id });

    try {
      const status = await this.swarmOrchestrator.getStatus(swarm_id);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                swarm_id,
                status: {
                  swarm: {
                    id: status.swarm.id,
                    epic_number: status.swarm.epic_number,
                    worktree_path: status.swarm.worktree_path,
                    pid: status.swarm.pid,
                    status: status.swarm.status,
                    agent_count: status.swarm.agent_count,
                    task_count: status.swarm.task_count,
                    resource_usage: {
                      cpu: `${status.swarm.resource_usage.cpu.toFixed(1)}%`,
                      memory: `${(status.swarm.resource_usage.memory / (1024 * 1024)).toFixed(0)}MB`,
                      uptime_ms: status.swarm.resource_usage.elapsed
                    },
                    created_at: status.swarm.created_at,
                    last_heartbeat: status.swarm.last_heartbeat
                  },
                  process: {
                    is_running: status.is_running,
                    pid: status.swarm.pid
                  },
                  state: status.state ? {
                    agents: status.state.agents?.length || 0,
                    tasks: status.state.tasks?.length || 0,
                    phases: status.state.phases || {}
                  } : null
                },
                health: status.is_running ? 'healthy' : 'stopped',
                uptime_ms: Date.now() - status.swarm.created_at.getTime()
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get swarm status', {
        swarm_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error && error.message === 'Swarm not found') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Swarm not found',
                  swarm_id,
                  suggestion: 'Check swarm ID or use martha__swarm__list_active to see active swarms'
                },
                null,
                2
              )
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to get swarm status',
                swarm_id,
                message: error instanceof Error ? error.message : 'Unknown error'
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Terminate swarm
   */
  private async terminate(args: Record<string, unknown>): Promise<ToolResponse> {
    const { swarm_id, reason } = args;

    if (typeof swarm_id !== 'string') {
      throw new Error('swarm_id must be a string');
    }

    const terminationReason = typeof reason === 'string' ? reason : 'Manual termination';

    logger.info('Terminating swarm', { swarm_id, reason: terminationReason });

    try {
      await this.swarmOrchestrator.terminate(swarm_id, terminationReason);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                swarm_id,
                message: 'Swarm terminated successfully',
                reason: terminationReason,
                terminated_at: new Date().toISOString()
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to terminate swarm', {
        swarm_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error && error.message === 'Swarm not found') {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Swarm not found',
                  swarm_id,
                  suggestion: 'Swarm may have already been terminated'
                },
                null,
                2
              )
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to terminate swarm',
                swarm_id,
                message: error instanceof Error ? error.message : 'Unknown error'
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }

  /**
   * List active swarms
   */
  private async listActive(_args: Record<string, unknown>): Promise<ToolResponse> {
    logger.info('Listing active swarms');

    try {
      const swarms = await this.swarmOrchestrator.listActive();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                total: swarms.length,
                swarms: swarms.map(s => ({
                  swarm_id: s.id,
                  epic_number: s.epic_number,
                  worktree_path: s.worktree_path,
                  status: s.status,
                  agent_count: s.agent_count,
                  task_count: s.task_count,
                  resource_usage: {
                    cpu: `${s.resource_usage.cpu.toFixed(1)}%`,
                    memory: `${(s.resource_usage.memory / (1024 * 1024)).toFixed(0)}MB`
                  },
                  uptime_ms: Date.now() - s.created_at.getTime(),
                  last_heartbeat: s.last_heartbeat
                }))
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to list active swarms', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to list active swarms',
                message: error instanceof Error ? error.message : 'Unknown error'
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }
}
