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
  private dockerAvailable: boolean = true;
  private dockerCheckAttempted: boolean = false;

  constructor(worktreeName: string) {
    this.worktreeName = worktreeName;
    this.docker = new Docker();
  }

  /**
   * Check if Docker is available and accessible
   */
  private async checkDockerAvailable(): Promise<boolean> {
    if (this.dockerCheckAttempted) {
      return this.dockerAvailable;
    }

    this.dockerCheckAttempted = true;

    try {
      await this.docker.ping();
      this.dockerAvailable = true;
      logger.info('Docker is available');
      return true;
    } catch (error) {
      this.dockerAvailable = false;
      logger.warn('Docker is not available or not accessible - skipping Docker monitoring', {
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Add user to docker group or ensure Docker daemon is running',
      });
      return false;
    }
  }

  /**
   * Check Docker container status and return events
   */
  async checkStatus(): Promise<AgentEvent[]> {
    const events: AgentEvent[] = [];

    // Check if Docker is available (only done once)
    if (!(await this.checkDockerAvailable())) {
      return events; // Skip Docker checks silently
    }

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
      // If Docker becomes unavailable after initial check, disable it
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('permission denied') || errorMessage.includes('EACCES') || errorMessage.includes('ENOENT')) {
        logger.warn('Docker access lost - disabling Docker monitoring', { error: errorMessage });
        this.dockerAvailable = false;
      } else {
        logger.error('Docker check failed', { error: errorMessage });
      }
    }

    return events;
  }
}
