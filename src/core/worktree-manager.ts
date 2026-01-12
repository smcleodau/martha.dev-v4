import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

import { worktreeRepository } from '../database/repositories/worktree-repository.js';
import { findNextAvailableIndex, calculatePorts } from '../utils/port-allocator.js';
import { generateEnvFile, generateWorktreeConfig } from '../utils/env-generator.js';
import { createLogger } from '../utils/logger.js';
// import { tunnelManager } from '../integrations/cloudflare/tunnel-manager.js';

const execAsync = promisify(exec);
const logger = createLogger({ module: 'worktree-manager' });

/**
 * Options for creating a worktree
 */
export interface CreateWorktreeOptions {
  epicNumber: number;
  branchName: string;
  baseBranch?: string;
}

/**
 * Worktree result type
 */
export interface Worktree {
  id: number;
  name: string;
  path: string;
  branch_name: string;
  index: number;
  ports: any;
  status: string;
  epic_id?: number;
}

/**
 * WorktreeManager class
 *
 * Orchestrates the full lifecycle of git worktrees:
 * - Creation (git worktree, ports, env files, docker, agents, tunnels)
 * - Destruction (cleanup, stop services, remove files)
 */
export class WorktreeManager {
  /**
   * Create a new git worktree with full provisioning
   *
   * Steps:
   * 1. Allocate port index
   * 2. Create git worktree
   * 3. Generate .env.local
   * 4. Generate .worktree-config.json
   * 5. Save to database
   * 6. Start Docker Compose (if exists)
   * 7. Start monitoring agent
   * 8. Provision Cloudflare tunnel (optional)
   */
  async createWorktree(options: CreateWorktreeOptions): Promise<Worktree> {
    const { epicNumber, branchName, baseBranch = 'develop' } = options;
    const worktreeName = `epic-${epicNumber}`;

    logger.info('Creating worktree', { worktreeName, branchName, baseBranch });

    // Step 1: Allocate port index
    const index = await findNextAvailableIndex();
    const ports = calculatePorts(index);

    logger.info('Allocated port index', { index, ports });

    // Step 2: Calculate worktree path
    const worktreePath = `/mnt/data/martha.dev-v4-worktrees/${worktreeName}`;

    // Step 3: Check if worktree path already exists
    try {
      await fs.access(worktreePath);
      throw new Error(`Worktree path already exists: ${worktreePath}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Path doesn't exist, which is what we want
    }

    // Step 4: Create git worktree
    logger.info('Creating git worktree', { worktreePath, branchName, baseBranch });

    try {
      await execAsync(`git worktree add "${worktreePath}" -b "${branchName}" "${baseBranch}"`, {
        cwd: '/mnt/data/martha.dev-v4',
      });

      logger.info('Git worktree created successfully');
    } catch (error: any) {
      logger.error('Failed to create git worktree', {
        error: error.message,
        stderr: error.stderr,
      });
      throw new Error(`Failed to create git worktree: ${error.message}`);
    }

    // Step 5: Generate .env.local
    logger.info('Generating .env.local file');

    try {
      await generateEnvFile({
        worktreePath,
        worktreeName,
        index,
        ports,
      });

      logger.info('.env.local generated successfully');
    } catch (error: any) {
      logger.error('Failed to generate .env.local', { error: error.message });

      // Cleanup: Remove git worktree on failure
      await this.cleanupFailedWorktree(worktreePath);
      throw new Error(`Failed to generate .env.local: ${error.message}`);
    }

    // Step 6: Generate .worktree-config.json
    logger.info('Generating .worktree-config.json file');

    try {
      await generateWorktreeConfig({
        worktreePath,
        worktreeName,
        index,
        ports,
        epicNumber,
      });

      logger.info('.worktree-config.json generated successfully');
    } catch (error: any) {
      logger.error('Failed to generate .worktree-config.json', { error: error.message });

      // Cleanup
      await this.cleanupFailedWorktree(worktreePath);
      throw new Error(`Failed to generate .worktree-config.json: ${error.message}`);
    }

    // Step 7: Save to database
    logger.info('Saving worktree to database');

    let worktree: Worktree;
    try {
      worktree = await worktreeRepository.create({
        name: worktreeName,
        epic_id: epicNumber,
        path: worktreePath,
        branch_name: branchName,
        index,
        ports,
        status: 'provisioning',
      });

      logger.info('Worktree saved to database', { id: worktree.id });
    } catch (error: any) {
      logger.error('Failed to save worktree to database', { error: error.message });

      // Cleanup
      await this.cleanupFailedWorktree(worktreePath);
      throw new Error(`Failed to save worktree to database: ${error.message}`);
    }

    // Step 8: Start Docker Compose (if docker-compose.yml exists)
    logger.info('Checking for docker-compose.yml');

    try {
      await fs.access(path.join(worktreePath, 'docker-compose.yml'));

      logger.info('docker-compose.yml found, starting services');

      try {
        await execAsync('docker compose up -d', { cwd: worktreePath });
        logger.info('Docker Compose services started');
      } catch (error: any) {
        logger.warn('Docker Compose failed to start (non-fatal)', {
          error: error.message,
          stderr: error.stderr,
        });
      }
    } catch (error: any) {
      logger.info('No docker-compose.yml found, skipping Docker Compose startup');
    }

    // Step 9: Start monitoring agent
    logger.info('Starting worktree monitoring agent');

    try {
      const agentPid = await this.startAgent(worktreeName, worktreePath);
      logger.info('Monitoring agent started', { pid: agentPid });
    } catch (error: any) {
      logger.error('Failed to start monitoring agent (non-fatal)', { error: error.message });
    }

    // Step 10: Provision Cloudflare tunnel (optional, non-blocking)
    // Note: Cloudflare tunnel provisioning is disabled for now
    // Uncomment when tunnel manager is ready
    /*
    logger.info('Provisioning Cloudflare tunnel');

    try {
      const tunnel = await tunnelManager.createTunnel({
        worktreeName,
        hostname: `${worktreeName}.arch.ie`,
        service: `http://localhost:${ports.mcp}`,
      });

      await worktreeRepository.update(worktree.id, {
        status: 'active',
        tunnels: [tunnel],
      });

      logger.info('Cloudflare tunnel provisioned', { tunnelId: tunnel.id });
    } catch (error: any) {
      logger.warn('Tunnel provisioning failed (non-fatal)', { error: error.message });
    }
    */

    // Mark as active
    await worktreeRepository.update(worktree.id, {
      status: 'active',
    });

    logger.info('Worktree creation complete', { worktreeName, id: worktree.id });

    return worktree;
  }

  /**
   * Destroy a worktree and clean up all resources
   *
   * Steps:
   * 1. Get worktree from database
   * 2. Stop monitoring agent
   * 3. Stop Docker containers
   * 4. Destroy Cloudflare tunnels
   * 5. Remove git worktree
   * 6. Update database status to 'destroyed'
   */
  async destroyWorktree(worktreeName: string): Promise<void> {
    logger.info('Destroying worktree', { worktreeName });

    // Step 1: Get worktree from database
    const worktree = await worktreeRepository.findByName(worktreeName);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeName} not found in database`);
    }

    logger.info('Worktree found in database', { id: worktree.id, path: worktree.path });

    // Step 2: Stop monitoring agent
    logger.info('Stopping monitoring agent');

    try {
      await execAsync(`pkill -f "tsx.*agents/index.ts ${worktreeName}"`);
      logger.info('Monitoring agent stopped');
    } catch (error: any) {
      logger.warn('Agent process not found or already stopped');
    }

    // Also try to kill by PID file
    try {
      const pidFile = `/tmp/agent-${worktreeName}.pid`;
      const pid = await fs.readFile(pidFile, 'utf-8');
      await execAsync(`kill ${pid.trim()}`);
      await fs.unlink(pidFile);
      logger.info('Monitoring agent killed by PID');
    } catch (error: any) {
      // PID file may not exist
    }

    // Step 3: Stop Docker containers
    logger.info('Stopping Docker containers');

    try {
      await execAsync('docker compose down -v', { cwd: worktree.path });
      logger.info('Docker containers stopped and volumes removed');
    } catch (error: any) {
      logger.warn('Docker Compose cleanup failed (non-fatal)', {
        error: error.message,
        stderr: error.stderr,
      });
    }

    // Step 4: Destroy Cloudflare tunnels (if implemented)
    // Uncomment when tunnel manager is ready
    /*
    if (worktree.tunnels && Array.isArray(worktree.tunnels)) {
      logger.info('Destroying Cloudflare tunnels', { count: worktree.tunnels.length });

      for (const tunnel of worktree.tunnels) {
        try {
          await tunnelManager.destroyTunnel(tunnel.id);
          logger.info('Tunnel destroyed', { tunnelId: tunnel.id });
        } catch (error: any) {
          logger.warn('Tunnel destruction failed (non-fatal)', {
            tunnelId: tunnel.id,
            error: error.message,
          });
        }
      }
    }
    */

    // Step 5: Remove git worktree
    logger.info('Removing git worktree', { path: worktree.path });

    try {
      await execAsync(`git worktree remove "${worktree.path}" --force`, {
        cwd: '/mnt/data/martha.dev-v4',
      });

      logger.info('Git worktree removed');
    } catch (error: any) {
      logger.error('Git worktree removal failed', {
        error: error.message,
        stderr: error.stderr,
      });
      throw new Error(`Failed to remove git worktree: ${error.message}`);
    }

    // Step 6: Update database status
    logger.info('Updating database status to destroyed');

    await worktreeRepository.update(worktree.id, {
      status: 'destroyed',
    });

    logger.info('Worktree destruction complete', { worktreeName });
  }

  /**
   * Start monitoring agent for a worktree
   *
   * Spawns a detached process that runs the worktree agent and connects
   * to the monitoring service via WebSocket.
   */
  private async startAgent(worktreeName: string, worktreePath: string): Promise<number> {
    const agent = spawn(
      'npx',
      ['tsx', 'src/agents/index.ts', worktreeName, worktreePath, 'ws://localhost:20000'],
      {
        cwd: '/mnt/data/martha.dev-v4',
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Save PID
    const pidFile = `/tmp/agent-${worktreeName}.pid`;
    await fs.writeFile(pidFile, agent.pid!.toString());

    // Setup logging
    const logFile = `/tmp/agent-${worktreeName}.log`;
    const logStream = await fs.open(logFile, 'a');
    const logWriteStream = logStream.createWriteStream();

    agent.stdout?.pipe(logWriteStream);
    agent.stderr?.pipe(logWriteStream);

    // Detach so parent can exit
    agent.unref();

    return agent.pid!;
  }

  /**
   * Clean up a failed worktree creation
   *
   * Attempts to remove the git worktree if creation failed partway through.
   */
  private async cleanupFailedWorktree(worktreePath: string): Promise<void> {
    logger.warn('Cleaning up failed worktree', { worktreePath });

    try {
      await execAsync(`git worktree remove "${worktreePath}" --force`, {
        cwd: '/mnt/data/martha.dev-v4',
      });

      logger.info('Failed worktree cleaned up');
    } catch (error: any) {
      logger.error('Failed to clean up worktree', {
        error: error.message,
        stderr: error.stderr,
      });
    }
  }
}

// Export singleton instance
export const worktreeManager = new WorktreeManager();
