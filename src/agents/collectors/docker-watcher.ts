import Docker from 'dockerode';

import { createLogger } from '../../utils/logger.js';
import { AgentEvent, ContainerStatus } from '../types.js';

const logger = createLogger({ module: 'docker-watcher' });

/**
 * Watches Docker containers for status changes
 */
export class DockerWatcher {
  private docker: Docker;
  private worktreeName: string;
  private lastStatus: Map<string, ContainerStatus> = new Map();

  constructor(worktreeName: string) {
    this.worktreeName = worktreeName;
    this.docker = new Docker();
  }

  /**
   * Check Docker container status and return events
   */
  async checkStatus(): Promise<AgentEvent[]> {
    const events: AgentEvent[] = [];

    try {
      // List containers matching this worktree
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: [`archie-${this.worktreeName}-`],
        },
      });

      const currentStatus = new Map<string, ContainerStatus>();

      for (const containerInfo of containers) {
        const name = containerInfo.Names[0]?.replace(/^\//, '') || '';
        const state = containerInfo.State;

        // Get detailed info for health status
        let health: string | null = null;
        if (containerInfo.Id) {
          try {
            const container = this.docker.getContainer(containerInfo.Id);
            const inspect = await container.inspect();
            if (inspect.State.Health) {
              health = inspect.State.Health.Status;
            }
          } catch (error) {
            // Container might not have health check
          }
        }

        currentStatus.set(name, { status: state, health });

        // Detect status changes
        const oldStatus = this.lastStatus.get(name);
        if (oldStatus) {
          if (oldStatus.status !== state) {
            events.push({
              type: 'container.status',
              data: {
                container: name,
                old_status: oldStatus.status,
                new_status: state,
                health,
              },
            });
          }
        } else {
          // New container detected
          events.push({
            type: 'container.detected',
            data: {
              container: name,
              status: state,
              health,
            },
          });
        }
      }

      this.lastStatus = currentStatus;
    } catch (error) {
      logger.error('Docker check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return events;
  }
}
