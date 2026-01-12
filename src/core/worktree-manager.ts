import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

import { getWorktreeRepository } from '../database/repositories/worktree-repository.js';
import { findNextAvailableIndex, calculatePorts } from '../utils/port-allocator.js';
import { generateEnvFile, generateWorktreeConfig } from '../utils/env-generator.js';
import { createLogger } from '../utils/logger.js';
import { DEFAULT_CONFIG, type WorktreeConfig } from '../config/repositories.js';
// import { tunnelManager } from '../integrations/cloudflare/tunnel-manager.js';

const execAsync = promisify(exec);
const logger = createLogger({ module: 'worktree-manager' });
const worktreeRepository = getWorktreeRepository();

/**
 * Options for creating a worktree
 */
export interface CreateWorktreeOptions {
  epicNumber: number;
  branchName: string;
  baseBranch?: string;
  parentWorktreeId?: number;
  isDailyBranch?: boolean;
  config?: WorktreeConfig;
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
   * Create a daily work branch worktree
   *
   * This creates a special worktree that serves as the base for the day's feature work.
   * Naming convention: work-YYYY-MM-DD
   */
  async createDailyBranch(config: WorktreeConfig = DEFAULT_CONFIG, date?: Date): Promise<Worktree> {
    const workDate = date || new Date();
    const dateStr = workDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const branchName = `work-${dateStr}`;
    const worktreeName = branchName;

    logger.info('Creating daily work branch', { branchName, repository: config.repositoryName });

    // Check if daily branch already exists for today
    const existing = await worktreeRepository.findByName(worktreeName);
    if (existing) {
      throw new Error(`Daily branch for ${dateStr} already exists: ${worktreeName}`);
    }

    // Step 1: Allocate port index
    const index = await findNextAvailableIndex();
    const ports = calculatePorts(index);

    logger.info('Allocated port index', { index, ports });

    // Step 2: Calculate worktree path
    const worktreePath = `${config.worktreesPath}/${worktreeName}`;

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

    // Step 4: Fetch latest from origin/develop
    logger.info('Fetching latest from origin/develop');
    try {
      await execAsync('git fetch origin develop', {
        cwd: config.repositoryPath,
      });
      logger.info('Fetched latest from origin/develop');
    } catch (error: any) {
      logger.error('Failed to fetch from origin/develop', {
        error: error.message,
        stderr: error.stderr,
      });
      throw new Error(`Failed to fetch from origin/develop: ${error.message}`);
    }

    // Step 5: Get commit hash of origin/develop
    let commitHash: string;
    try {
      const { stdout } = await execAsync('git rev-parse origin/develop', {
        cwd: config.repositoryPath,
      });
      commitHash = stdout.trim();
      logger.info('Got commit hash from origin/develop', { commitHash });
    } catch (error: any) {
      logger.error('Failed to get commit hash', { error: error.message });
      throw new Error(`Failed to get commit hash: ${error.message}`);
    }

    // Step 6: Create git worktree from origin/develop
    logger.info('Creating git worktree', { worktreePath, branchName });

    try {
      await execAsync(`git worktree add "${worktreePath}" -b "${branchName}" "origin/develop"`, {
        cwd: config.repositoryPath,
      });

      logger.info('Git worktree created successfully');
    } catch (error: any) {
      logger.error('Failed to create git worktree', {
        error: error.message,
        stderr: error.stderr,
      });
      throw new Error(`Failed to create git worktree: ${error.message}`);
    }

    // Step 7: Generate .env.local
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
      await this.cleanupFailedWorktree(worktreePath, config);
      throw new Error(`Failed to generate .env.local: ${error.message}`);
    }

    // Step 8: Generate .worktree-config.json
    logger.info('Generating .worktree-config.json file');

    try {
      await generateWorktreeConfig({
        worktreePath,
        worktreeName,
        index,
        ports,
      });

      logger.info('.worktree-config.json generated successfully');
    } catch (error: any) {
      logger.error('Failed to generate .worktree-config.json', { error: error.message });

      // Cleanup
      await this.cleanupFailedWorktree(worktreePath, config);
      throw new Error(`Failed to generate .worktree-config.json: ${error.message}`);
    }

    // Step 9: Save to database with special flags
    logger.info('Saving daily branch worktree to database');

    let worktree: Worktree;
    try {
      worktree = await worktreeRepository.create({
        name: worktreeName,
        path: worktreePath,
        branchName,
        index,
        ports,
        status: 'provisioning',
        baseBranch: 'origin/develop',
        createdFromCommit: commitHash,
        isDailyBranch: true,
        repositoryName: config.repositoryName,
      });

      logger.info('Daily branch worktree saved to database', { id: worktree.id });
    } catch (error: any) {
      logger.error('Failed to save worktree to database', { error: error.message });

      // Cleanup
      await this.cleanupFailedWorktree(worktreePath, config);
      throw new Error(`Failed to save worktree to database: ${error.message}`);
    }

    // Step 10: Start Docker Compose (if docker-compose.yml exists)
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

    // Step 11: Start monitoring agent
    logger.info('Starting worktree monitoring agent');

    try {
      const agentPid = await this.startAgent(worktreeName, worktreePath);
      logger.info('Monitoring agent started', { pid: agentPid });
    } catch (error: any) {
      logger.error('Failed to start monitoring agent (non-fatal)', { error: error.message });
    }

    // Mark as active
    await worktreeRepository.update(worktree.id, {
      status: 'active',
    });

    logger.info('Daily branch worktree creation complete', { worktreeName, branch: branchName });

    return worktree;
  }

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
    const { epicNumber, branchName, baseBranch = 'develop', parentWorktreeId, isDailyBranch = false, config = DEFAULT_CONFIG } = options;
    const worktreeName = `epic-${epicNumber}`;

    logger.info('Creating worktree', { worktreeName, branchName, baseBranch, parentWorktreeId, repository: config.repositoryName });

    // Step 1: Allocate port index
    const index = await findNextAvailableIndex();
    const ports = calculatePorts(index);

    logger.info('Allocated port index', { index, ports });

    // Step 2: Calculate worktree path
    const worktreePath = `${config.worktreesPath}/${worktreeName}`;

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

    // Step 4: Get commit hash of base branch
    let commitHash: string;
    try {
      const { stdout } = await execAsync(`git rev-parse ${baseBranch}`, {
        cwd: config.repositoryPath,
      });
      commitHash = stdout.trim();
      logger.info('Got commit hash from base branch', { baseBranch, commitHash });
    } catch (error: any) {
      logger.error('Failed to get commit hash', { error: error.message });
      throw new Error(`Failed to get commit hash: ${error.message}`);
    }

    // Step 5: Create git worktree
    logger.info('Creating git worktree', { worktreePath, branchName, baseBranch });

    try {
      await execAsync(`git worktree add "${worktreePath}" -b "${branchName}" "${baseBranch}"`, {
        cwd: config.repositoryPath,
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
      await this.cleanupFailedWorktree(worktreePath, config);
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
      await this.cleanupFailedWorktree(worktreePath, config);
      throw new Error(`Failed to generate .worktree-config.json: ${error.message}`);
    }

    // Step 7: Save to database
    logger.info('Saving worktree to database');

    let worktree: Worktree;
    try {
      worktree = await worktreeRepository.create({
        name: worktreeName,
        epicId: epicNumber,
        path: worktreePath,
        branchName,
        index,
        ports,
        status: 'provisioning',
        baseBranch,
        parentWorktreeId,
        createdFromCommit: commitHash,
        isDailyBranch,
        repositoryName: config.repositoryName,
      });

      logger.info('Worktree saved to database', { id: worktree.id });
    } catch (error: any) {
      logger.error('Failed to save worktree to database', { error: error.message });

      // Cleanup
      await this.cleanupFailedWorktree(worktreePath, config);
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
   * 2. Check for dependent children (unless force=true)
   * 3. Stop monitoring agent
   * 4. Stop Docker containers
   * 5. Destroy Cloudflare tunnels
   * 6. Remove git worktree
   * 7. Update database status to 'destroyed'
   */
  async destroyWorktree(worktreeName: string, force: boolean = false): Promise<void> {
    logger.info('Destroying worktree', { worktreeName, force });

    // Step 1: Get worktree from database
    const worktree = await worktreeRepository.findByName(worktreeName);
    if (!worktree) {
      throw new Error(`Worktree ${worktreeName} not found in database`);
    }

    logger.info('Worktree found in database', { id: worktree.id, path: worktree.path });

    // Step 2: Check for dependent children
    const children = await worktreeRepository.findChildrenOfWorktree(worktree.id);

    if (children.length > 0 && !force) {
      const childNames = children.map(c => c.name).join(', ');
      logger.warn('Cannot destroy worktree with dependencies', {
        worktreeName,
        dependentCount: children.length,
        dependents: childNames,
      });
      throw new Error(
        `Cannot destroy ${worktreeName}: ${children.length} dependent worktree(s) exist (${childNames}). ` +
        `Destroy children first or use force=true to override.`
      );
    }

    if (children.length > 0 && force) {
      logger.warn('Force destroying worktree despite dependencies', {
        worktreeName,
        dependentCount: children.length,
      });
    }

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

    // Determine repository path from worktree's repository_name
    const repoName = worktree.repository_name || 'martha.dev-v4';
    const config = repoName === 'archie-platform-v2'
      ? { repositoryPath: '/mnt/data/archie-platform-v2', worktreesPath: '/mnt/data/archie-platform-v2-worktrees', repositoryName: 'archie-platform-v2' }
      : DEFAULT_CONFIG;

    try {
      await execAsync(`git worktree remove "${worktree.path}" --force`, {
        cwd: config.repositoryPath,
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
  private async cleanupFailedWorktree(worktreePath: string, config: WorktreeConfig = DEFAULT_CONFIG): Promise<void> {
    logger.warn('Cleaning up failed worktree', { worktreePath });

    try {
      await execAsync(`git worktree remove "${worktreePath}" --force`, {
        cwd: config.repositoryPath,
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
