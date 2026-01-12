import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import { getSwarmRepository, SwarmRepository } from '../database/repositories/swarm-repository.js';
import type { Swarm, SwarmConfig, SwarmState, ResourceUsage } from '../database/models/swarm.js';

const logger = createLogger({ module: 'swarm-orchestrator' });

export interface SwarmSpawnOptions {
  epicNumber?: number;
  worktreeId?: number;
  worktreePath: string;
  epicContext?: any;
  config?: Partial<SwarmConfig>;
}

/**
 * Swarm Orchestrator
 *
 * Manages claude-flow swarm lifecycle:
 * - Spawning swarms
 * - Health monitoring
 * - Resource tracking
 * - Hook handling
 * - Termination
 */
export class SwarmOrchestrator {
  private swarmRepository: SwarmRepository;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeSwarms: Map<string, ChildProcess> = new Map();

  constructor(swarmRepository?: SwarmRepository) {
    this.swarmRepository = swarmRepository || getSwarmRepository();

    logger.info('Swarm orchestrator initialized');

    // Start cleanup job for stale swarms
    this.startCleanupJob();
  }

  /**
   * Spawn a new swarm
   */
  async spawn(options: SwarmSpawnOptions): Promise<Swarm> {
    try {
      logger.info('Spawning swarm', {
        epic_number: options.epicNumber,
        worktree_path: options.worktreePath
      });

      // 1. Create .claude-flow directory structure
      const claudeFlowDir = path.join(options.worktreePath, '.claude-flow');
      await fs.mkdir(claudeFlowDir, { recursive: true });
      await fs.mkdir(path.join(claudeFlowDir, 'tasks'), { recursive: true });

      // 2. Generate swarm configuration
      const config: SwarmConfig = {
        project: options.epicNumber ? `epic-${options.epicNumber}` : 'development',
        topology: 'hive-mind',
        epic_context: options.epicContext,
        reasoning: {
          enable: true,
          database: '.swarm/memory.db'
        },
        telemetry: {
          braintrust: {
            enabled: !!process.env.BRAINTRUST_API_KEY,
            project: 'martha-dev',
            experiment: options.epicNumber ? `epic-${options.epicNumber}` : 'development',
            tags: options.epicNumber ? [`epic:${options.epicNumber}`] : ['development']
          }
        },
        ...options.config
      };

      const configPath = path.join(claudeFlowDir, 'config.json');
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // 3. Setup hooks
      await this.setupHooks(options.worktreePath);

      // 4. Spawn swarm process
      logger.info('Starting claude-flow process', { worktree: options.worktreePath });

      const process = spawn('npx', [
        'claude-flow@alpha',
        'hive-mind',
        'spawn',
        '--config', '.claude-flow/config.json'
      ], {
        cwd: options.worktreePath,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      process.unref();

      if (!process.pid) {
        throw new Error('Failed to spawn swarm - no PID');
      }

      // 5. Setup logging
      this.setupLogging(process, options.epicNumber);

      // 6. Store in database
      const swarm = await this.swarmRepository.create({
        epicNumber: options.epicNumber,
        worktreeId: options.worktreeId,
        worktreePath: options.worktreePath,
        pid: process.pid,
        config
      });

      // 7. Track active swarm
      this.activeSwarms.set(swarm.id, process);

      // 8. Start health monitoring
      this.startHealthMonitoring(swarm.id);

      logger.info('Swarm spawned successfully', {
        swarm_id: swarm.id,
        pid: process.pid,
        worktree: options.worktreePath
      });

      // 9. Wait a moment for process to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 10. Update status to running
      await this.swarmRepository.update(swarm.id, {
        status: 'running',
        lastHeartbeat: new Date()
      });

      return swarm;
    } catch (error) {
      logger.error('Failed to spawn swarm', {
        worktree_path: options.worktreePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Setup hooks for swarm callbacks
   */
  private async setupHooks(worktreePath: string): Promise<void> {
    try {
      const claudeDir = path.join(worktreePath, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });

      const serviceUrl = process.env.SERVICE_URL || 'http://localhost:21000';

      const hooksConfig = {
        hooks: {
          'post-task': {
            command: 'curl',
            args: [
              '-X', 'POST',
              `${serviceUrl}/api/v1/hooks/task-complete`,
              '-H', 'Content-Type: application/json',
              '-d', '@-'
            ]
          },
          'session-end': {
            command: 'curl',
            args: [
              '-X', 'POST',
              `${serviceUrl}/api/v1/hooks/session-end`,
              '-H', 'Content-Type: application/json',
              '-d', '@-'
            ]
          },
          'agent-complete': {
            command: 'curl',
            args: [
              '-X', 'POST',
              `${serviceUrl}/api/v1/hooks/agent-complete`,
              '-H', 'Content-Type: application/json',
              '-d', '@-'
            ]
          }
        }
      };

      const settingsPath = path.join(claudeDir, 'settings.json');
      await fs.writeFile(settingsPath, JSON.stringify(hooksConfig, null, 2), 'utf-8');

      logger.debug('Hooks configured', { worktree: worktreePath });
    } catch (error) {
      logger.error('Failed to setup hooks', {
        worktree_path: worktreePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Setup logging for swarm process
   */
  private setupLogging(process: ChildProcess, epicNumber?: number): void {
    const prefix = epicNumber ? `[Swarm Epic-${epicNumber}]` : '[Swarm]';

    process.stdout?.on('data', (data) => {
      logger.info(`${prefix} ${data.toString().trim()}`);
    });

    process.stderr?.on('data', (data) => {
      logger.error(`${prefix} ${data.toString().trim()}`);
    });

    process.on('exit', (code, signal) => {
      logger.info(`${prefix} Process exited`, { code, signal });
    });
  }

  /**
   * Start health monitoring for swarm
   */
  private startHealthMonitoring(swarmId: string): void {
    const interval = setInterval(async () => {
      try {
        const swarm = await this.swarmRepository.findById(swarmId);

        if (!swarm) {
          clearInterval(interval);
          this.monitoringIntervals.delete(swarmId);
          return;
        }

        // Check if process is still running
        const isRunning = await this.isProcessRunning(swarm.pid);

        if (!isRunning) {
          logger.warn('Swarm process not running', {
            swarm_id: swarmId,
            pid: swarm.pid
          });

          await this.swarmRepository.update(swarmId, {
            status: 'crashed'
          });

          clearInterval(interval);
          this.monitoringIntervals.delete(swarmId);
          this.activeSwarms.delete(swarmId);
          return;
        }

        // Read state file
        const stateFile = path.join(swarm.worktree_path, '.swarm', 'state.json');
        try {
          const stateData = await fs.readFile(stateFile, 'utf-8');
          const state: SwarmState = JSON.parse(stateData);

          // Update database
          await this.swarmRepository.update(swarmId, {
            status: state.status,
            agentCount: state.agents?.length || 0,
            taskCount: state.tasks?.length || 0,
            lastHeartbeat: new Date()
          });

          // Check for crashed status
          if (state.status === 'crashed') {
            logger.error('Swarm crashed according to state file', { swarm_id: swarmId });
            await this.attemptRecovery(swarm);
          }
        } catch (stateError) {
          // State file might not exist yet
          logger.debug('State file not readable', {
            swarm_id: swarmId,
            error: stateError instanceof Error ? stateError.message : 'Unknown'
          });
        }

        // Get resource usage
        try {
          const resourceUsage = await this.getResourceUsage(swarm.pid);
          await this.swarmRepository.update(swarmId, {
            resourceUsage
          });

          // Check resource limits
          await this.enforceResourceLimits(swarm, resourceUsage);
        } catch (resourceError) {
          logger.debug('Failed to get resource usage', {
            swarm_id: swarmId,
            error: resourceError instanceof Error ? resourceError.message : 'Unknown'
          });
        }
      } catch (error) {
        logger.error('Health monitoring error', {
          swarm_id: swarmId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 30000); // Every 30 seconds

    this.monitoringIntervals.set(swarmId, interval);
  }

  /**
   * Check if process is running
   */
  private async isProcessRunning(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get resource usage for process
   */
  private async getResourceUsage(pid: number): Promise<ResourceUsage> {
    try {
      // Use pidusage if available, otherwise return zeros
      try {
        const pidusage = await import('pidusage');
        const stats = await pidusage.default(pid);
        return {
          cpu: stats.cpu,
          memory: stats.memory,
          elapsed: stats.elapsed
        };
      } catch (importError) {
        // pidusage not installed, return basic info
        logger.debug('pidusage not available, using basic stats');
        return {
          cpu: 0,
          memory: 0,
          elapsed: Date.now()
        };
      }
    } catch (error) {
      logger.warn('Failed to get resource usage', {
        pid,
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return {
        cpu: 0,
        memory: 0,
        elapsed: Date.now()
      };
    }
  }

  /**
   * Enforce resource limits
   */
  private async enforceResourceLimits(swarm: Swarm, usage: ResourceUsage): Promise<void> {
    const limits = {
      maxCpu: 400, // 4 CPUs = 400%
      maxMemory: 4 * 1024 * 1024 * 1024 // 4GB
    };

    if (usage.cpu > limits.maxCpu || usage.memory > limits.maxMemory) {
      logger.warn('Swarm exceeding resource limits', {
        swarm_id: swarm.id,
        cpu: usage.cpu,
        memory: usage.memory,
        limits
      });

      // Pause swarm (SIGSTOP)
      try {
        process.kill(swarm.pid, 'SIGSTOP');
        await this.swarmRepository.update(swarm.id, {
          status: 'paused'
        });
        logger.info('Swarm paused due to resource limits', { swarm_id: swarm.id });
      } catch (error) {
        logger.error('Failed to pause swarm', {
          swarm_id: swarm.id,
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }
  }

  /**
   * Attempt recovery for crashed swarm
   */
  private async attemptRecovery(swarm: Swarm): Promise<void> {
    logger.info('Attempting swarm recovery', { swarm_id: swarm.id });

    // For now, just mark as crashed and notify
    // Future: Implement automatic restart logic

    await this.swarmRepository.update(swarm.id, {
      status: 'crashed'
    });

    // Stop monitoring
    const interval = this.monitoringIntervals.get(swarm.id);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(swarm.id);
    }

    this.activeSwarms.delete(swarm.id);
  }

  /**
   * Get swarm status
   */
  async getStatus(swarmId: string): Promise<{
    swarm: Swarm;
    state: SwarmState | null;
    is_running: boolean;
  }> {
    try {
      const swarm = await this.swarmRepository.findById(swarmId);

      if (!swarm) {
        throw new Error('Swarm not found');
      }

      const isRunning = await this.isProcessRunning(swarm.pid);

      let state: SwarmState | null = null;
      if (isRunning) {
        try {
          const stateFile = path.join(swarm.worktree_path, '.swarm', 'state.json');
          const stateData = await fs.readFile(stateFile, 'utf-8');
          state = JSON.parse(stateData);
        } catch (error) {
          logger.debug('Could not read state file', {
            swarm_id: swarmId,
            error: error instanceof Error ? error.message : 'Unknown'
          });
        }
      }

      return {
        swarm,
        state,
        is_running: isRunning
      };
    } catch (error) {
      logger.error('Failed to get swarm status', {
        swarm_id: swarmId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Terminate swarm
   */
  async terminate(swarmId: string, reason?: string): Promise<void> {
    try {
      logger.info('Terminating swarm', { swarm_id: swarmId, reason });

      const swarm = await this.swarmRepository.findById(swarmId);

      if (!swarm) {
        throw new Error('Swarm not found');
      }

      // Stop monitoring
      const interval = this.monitoringIntervals.get(swarmId);
      if (interval) {
        clearInterval(interval);
        this.monitoringIntervals.delete(swarmId);
      }

      // Kill process
      if (await this.isProcessRunning(swarm.pid)) {
        try {
          // Graceful shutdown
          process.kill(swarm.pid, 'SIGTERM');

          // Wait for process to exit
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Force kill if still running
          if (await this.isProcessRunning(swarm.pid)) {
            logger.warn('Swarm not responding to SIGTERM, forcing', {
              swarm_id: swarmId,
              pid: swarm.pid
            });
            process.kill(swarm.pid, 'SIGKILL');
          }
        } catch (error) {
          logger.debug('Process already stopped', { pid: swarm.pid });
        }
      }

      // Update database
      await this.swarmRepository.update(swarmId, {
        status: 'terminated'
      });

      // Remove from active swarms
      this.activeSwarms.delete(swarmId);

      logger.info('Swarm terminated', { swarm_id: swarmId });
    } catch (error) {
      logger.error('Failed to terminate swarm', {
        swarm_id: swarmId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List active swarms
   */
  async listActive(): Promise<Swarm[]> {
    return await this.swarmRepository.findActive();
  }

  /**
   * Handle hook callback
   */
  async handleHook(hookType: string, payload: any): Promise<void> {
    logger.info('Handling hook', { type: hookType, payload });

    // Find swarm by worktree path or other identifier in payload
    // Update status, log event, etc.

    // This is a placeholder - implement based on actual hook payload format
  }

  /**
   * Cleanup job for stale swarms
   */
  private startCleanupJob(): void {
    setInterval(async () => {
      try {
        const staleSwarms = await this.swarmRepository.findStaleSwarms();

        for (const swarm of staleSwarms) {
          logger.warn('Found stale swarm', {
            swarm_id: swarm.id,
            last_heartbeat: swarm.last_heartbeat
          });

          const isRunning = await this.isProcessRunning(swarm.pid);

          if (!isRunning) {
            await this.swarmRepository.update(swarm.id, {
              status: 'crashed'
            });
          }
        }
      } catch (error) {
        logger.error('Cleanup job error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Shutdown all swarms (for graceful service shutdown)
   */
  async shutdownAll(): Promise<void> {
    logger.info('Shutting down all swarms');

    const activeSwarms = await this.listActive();

    for (const swarm of activeSwarms) {
      try {
        await this.terminate(swarm.id, 'Service shutdown');
      } catch (error) {
        logger.error('Failed to terminate swarm during shutdown', {
          swarm_id: swarm.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}

// Singleton instance
let swarmOrchestrator: SwarmOrchestrator | null = null;

export function getSwarmOrchestrator(): SwarmOrchestrator {
  if (!swarmOrchestrator) {
    swarmOrchestrator = new SwarmOrchestrator();
  }
  return swarmOrchestrator;
}
