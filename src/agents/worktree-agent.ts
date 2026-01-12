import fs from 'fs/promises';
import path from 'path';
import WebSocket from 'ws';
import { execFile } from 'child_process';
import { promisify } from 'util';

import { createLogger } from '../utils/logger.js';
import { GitWatcher } from './collectors/git-watcher.js';
import { DockerWatcher } from './collectors/docker-watcher.js';
import { HealthChecker } from './collectors/health-checker.js';
import { AgentEvent, WorktreeConfig, Command } from './types.js';

const execFileAsync = promisify(execFile);
const logger = createLogger({ module: 'worktree-agent' });

const AGENT_VERSION = '3.0.0';

/**
 * Main agent that connects to service and streams events
 */
export class WorktreeAgent {
  private worktreeName: string;
  private worktreePath: string;
  private serviceUrl: string;
  private ports: Record<string, number> = {};

  private gitWatcher: GitWatcher;
  private dockerWatcher: DockerWatcher;
  private healthChecker: HealthChecker;

  private websocket: WebSocket | null = null;
  private running = false;

  constructor(worktreeName: string, worktreePath: string, serviceUrl: string) {
    this.worktreeName = worktreeName;
    this.worktreePath = worktreePath;
    this.serviceUrl = `${serviceUrl}/ws/agent/${worktreeName}`;

    // Initialize collectors
    this.gitWatcher = new GitWatcher(worktreePath);
    this.dockerWatcher = new DockerWatcher(worktreeName);
    this.healthChecker = new HealthChecker(this.ports);
  }

  /**
   * Load worktree configuration
   */
  async loadConfig(): Promise<void> {
    const configPath = path.join(this.worktreePath, '.worktree-config.json');

    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData) as WorktreeConfig;
      this.ports = config.ports || {};
      this.healthChecker = new HealthChecker(this.ports);
      logger.info('Loaded worktree config', { ports: this.ports });
    } catch (error) {
      logger.warn('No worktree config found, using defaults');
    }
  }

  /**
   * Connect to monitoring service
   */
  async connect(): Promise<boolean> {
    logger.info(`🔌 Connecting to service: ${this.serviceUrl}`);

    let retryCount = 0;
    const maxRetries = 10;

    while (retryCount < maxRetries && !this.websocket) {
      try {
        this.websocket = new WebSocket(this.serviceUrl);

        await new Promise<void>((resolve, reject) => {
          if (!this.websocket) {
            reject(new Error('WebSocket is null'));
            return;
          }

          this.websocket.on('open', () => resolve());
          this.websocket.on('error', (error) => reject(error));
        });

        logger.info('✅ Connected to monitoring service');

        // Send initial heartbeat
        await this.sendEvent({
          type: 'agent.startup',
          data: {
            agent_version: AGENT_VERSION,
            worktree: this.worktreeName,
            path: this.worktreePath,
            ports: this.ports,
          },
        });

        return true;
      } catch (error) {
        retryCount++;
        const waitTime = Math.min(2 ** retryCount, 30); // Exponential backoff
        logger.warn(`Connection failed (attempt ${retryCount}/${maxRetries})`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        logger.info(`Retrying in ${waitTime}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      }
    }

    logger.error('Failed to connect to monitoring service');
    return false;
  }

  /**
   * Send event to service
   */
  async sendEvent(event: AgentEvent): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      event.worktree = this.worktreeName;
      event.timestamp = new Date().toISOString();

      this.websocket.send(JSON.stringify(event));
      logger.debug(`📤 Sent event: ${event.type}`);
    } catch (error) {
      logger.error('Failed to send event', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle commands from service
   */
  private setupCommandHandler(): void {
    if (!this.websocket) return;

    this.websocket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as Command;
        const command = message.command;

        logger.info(`📥 Received command: ${command}`);

        if (command === 'restart_container') {
          await this.restartContainer(message.container || '');
        } else if (command === 'git_pull') {
          await this.gitPull();
        } else if (command === 'health_check') {
          await this.runHealthCheck();
        }
      } catch (error) {
        logger.error('Error handling command', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.websocket.on('close', () => {
      logger.warn('Connection to service closed');
      this.websocket = null;
    });

    this.websocket.on('error', (error) => {
      logger.error('WebSocket error', { error: error.message });
    });
  }

  /**
   * Restart a Docker container
   */
  async restartContainer(containerName: string): Promise<void> {
    try {
      logger.info(`🔄 Restarting container: ${containerName}`);

      await execFileAsync('docker', ['compose', 'restart', containerName], {
        cwd: this.worktreePath,
        timeout: 60000,
      });

      await this.sendEvent({
        type: 'container.restarted',
        data: {
          container: containerName,
          success: true,
        },
      });
    } catch (error) {
      logger.error('Failed to restart container', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendEvent({
        type: 'container.restart_failed',
        data: {
          container: containerName,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Pull latest changes from Git
   */
  async gitPull(): Promise<void> {
    try {
      logger.info('📥 Pulling from Git');

      const result = await execFileAsync('git', ['pull'], {
        cwd: this.worktreePath,
        timeout: 30000,
      });

      await this.sendEvent({
        type: 'git.pulled',
        data: {
          success: true,
          output: result.stdout,
        },
      });
    } catch (error) {
      logger.error('Git pull failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.sendEvent({
        type: 'git.pulled',
        data: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Run health checks on demand
   */
  async runHealthCheck(): Promise<void> {
    const events = await this.healthChecker.checkHealth();
    for (const event of events) {
      await this.sendEvent(event);
    }
  }

  /**
   * Main watching loop
   */
  async watchLoop(): Promise<void> {
    logger.info('👀 Starting watch loop...');

    while (this.running) {
      try {
        // Collect events from all watchers
        const [gitEvents, dockerEvents, healthEvents] = await Promise.all([
          this.gitWatcher.checkStatus(),
          this.dockerWatcher.checkStatus(),
          this.healthChecker.checkHealth(),
        ]);

        // Send all events
        for (const event of [...gitEvents, ...dockerEvents, ...healthEvents]) {
          await this.sendEvent(event);
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Check every 10 seconds
      } catch (error) {
        logger.error('Error in watch loop', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Run the agent
   */
  async run(): Promise<void> {
    this.running = true;

    // Load configuration
    await this.loadConfig();

    // Connect to service
    if (!(await this.connect())) {
      return;
    }

    // Setup command handler
    this.setupCommandHandler();

    // Start watch loop
    await this.watchLoop();
  }

  /**
   * Stop the agent
   */
  stop(): void {
    this.running = false;
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}
