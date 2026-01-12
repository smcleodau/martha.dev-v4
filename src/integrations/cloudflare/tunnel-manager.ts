import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../../utils/logger.js';
import { getCloudflareAPIClient, CloudflareAPIClient } from './api-client.js';
import * as crypto from 'crypto';

const logger = createLogger({ module: 'tunnel-manager' });

export interface TunnelCredentials {
  AccountTag: string;
  TunnelSecret: string;
  TunnelID: string;
}

export interface TunnelConfig {
  tunnel_id: string;
  name: string;
  hostname: string;
  port: number;
  status: 'created' | 'running' | 'stopped' | 'error';
  daemon_pid?: number;
  created_at: string;
  updated_at: string;
}

export interface TunnelInfo {
  id: string;
  name: string;
  config: TunnelConfig;
  credentials_file: string;
  config_file: string;
  pid_file: string;
  is_running: boolean;
}

/**
 * Tunnel Manager
 *
 * Manages Cloudflare tunnel lifecycle:
 * - Creates tunnels with credentials
 * - Generates cloudflared config files
 * - Manages tunnel daemon processes
 * - Tracks PIDs for process management
 */
export class TunnelManager {
  private apiClient: CloudflareAPIClient;
  private tunnelDir: string;
  private configDir: string;
  private pidDir: string;
  private activeTunnels: Map<string, ChildProcess> = new Map();

  constructor(apiClient?: CloudflareAPIClient) {
    this.apiClient = apiClient || getCloudflareAPIClient();

    // Directory structure
    const homeDir = process.env.HOME || '/home/archiedev';
    this.tunnelDir = path.join(homeDir, '.martha', 'tunnels');
    this.configDir = path.join(this.tunnelDir, 'configs');
    this.pidDir = path.join(this.tunnelDir, 'pids');

    logger.info('Tunnel manager initialized', {
      tunnel_dir: this.tunnelDir
    });
  }

  /**
   * Initialize directories
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.tunnelDir, { recursive: true });
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.mkdir(this.pidDir, { recursive: true });
  }

  /**
   * Generate random tunnel secret (base64 encoded 32 bytes)
   */
  private generateTunnelSecret(): string {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64');
  }

  /**
   * Create a new tunnel
   */
  async createTunnel(name: string): Promise<TunnelInfo> {
    try {
      await this.ensureDirectories();

      logger.info('Creating tunnel', { name });

      // Generate tunnel secret
      const tunnelSecret = this.generateTunnelSecret();

      // Create tunnel via API
      const tunnel = await this.apiClient.createTunnel({
        name,
        tunnel_secret: tunnelSecret
      });

      // Get account ID
      const accountId = await this.apiClient.getAccountId();

      // Save credentials
      const credentials: TunnelCredentials = {
        AccountTag: accountId,
        TunnelSecret: tunnelSecret,
        TunnelID: tunnel.id
      };

      const credentialsFile = path.join(this.tunnelDir, `${tunnel.id}.json`);
      await fs.writeFile(
        credentialsFile,
        JSON.stringify(credentials, null, 2),
        'utf-8'
      );

      logger.info('Tunnel created successfully', {
        tunnel_id: tunnel.id,
        name: tunnel.name,
        credentials_file: credentialsFile
      });

      return {
        id: tunnel.id,
        name: tunnel.name,
        config: {
          tunnel_id: tunnel.id,
          name: tunnel.name,
          hostname: '', // Set when provisioning
          port: 0, // Set when provisioning
          status: 'created',
          created_at: tunnel.created_at,
          updated_at: tunnel.created_at
        },
        credentials_file: credentialsFile,
        config_file: path.join(this.configDir, `${tunnel.id}.yml`),
        pid_file: path.join(this.pidDir, `${tunnel.id}.pid`),
        is_running: false
      };
    } catch (error) {
      logger.error('Failed to create tunnel', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate cloudflared config file
   */
  private async generateConfigFile(
    tunnelId: string,
    hostname: string,
    port: number
  ): Promise<string> {
    const configFile = path.join(this.configDir, `${tunnelId}.yml`);
    const credentialsFile = path.join(this.tunnelDir, `${tunnelId}.json`);

    const config = `
tunnel: ${tunnelId}
credentials-file: ${credentialsFile}

ingress:
  - hostname: ${hostname}
    service: http://localhost:${port}
  - service: http_status:404
`.trim();

    await fs.writeFile(configFile, config, 'utf-8');

    logger.debug('Generated tunnel config', {
      tunnel_id: tunnelId,
      config_file: configFile,
      hostname,
      port
    });

    return configFile;
  }

  /**
   * Start tunnel daemon
   */
  async startTunnelDaemon(
    tunnelId: string,
    hostname: string,
    port: number
  ): Promise<number> {
    try {
      await this.ensureDirectories();

      // Check if already running
      if (await this.isTunnelRunning(tunnelId)) {
        logger.warn('Tunnel daemon already running', { tunnel_id: tunnelId });
        const pid = await this.getTunnelPID(tunnelId);
        if (pid) return pid;
      }

      // Generate config file
      const configFile = await this.generateConfigFile(tunnelId, hostname, port);

      logger.info('Starting tunnel daemon', {
        tunnel_id: tunnelId,
        hostname,
        port
      });

      // Start cloudflared daemon
      const daemon = spawn('cloudflared', [
        'tunnel',
        '--config', configFile,
        'run',
        tunnelId
      ], {
        detached: true,
        stdio: 'ignore'
      });

      daemon.unref();

      // Wait a moment for process to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (!daemon.pid) {
        throw new Error('Failed to start tunnel daemon - no PID');
      }

      // Save PID
      const pidFile = path.join(this.pidDir, `${tunnelId}.pid`);
      await fs.writeFile(pidFile, daemon.pid.toString(), 'utf-8');

      // Track active tunnel
      this.activeTunnels.set(tunnelId, daemon);

      logger.info('Tunnel daemon started', {
        tunnel_id: tunnelId,
        pid: daemon.pid,
        config_file: configFile
      });

      return daemon.pid;
    } catch (error) {
      logger.error('Failed to start tunnel daemon', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Stop tunnel daemon
   */
  async stopTunnelDaemon(tunnelId: string): Promise<void> {
    try {
      logger.info('Stopping tunnel daemon', { tunnel_id: tunnelId });

      const pid = await this.getTunnelPID(tunnelId);

      if (!pid) {
        logger.warn('No PID found for tunnel', { tunnel_id: tunnelId });
        return;
      }

      try {
        // Try graceful shutdown first
        process.kill(pid, 'SIGTERM');

        // Wait for process to exit
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if still running
        try {
          process.kill(pid, 0); // Check if process exists
          // Still running, force kill
          logger.warn('Tunnel daemon not responding to SIGTERM, forcing', { pid });
          process.kill(pid, 'SIGKILL');
        } catch (error) {
          // Process already exited, good
        }
      } catch (error) {
        // Process doesn't exist
        logger.debug('Process already stopped', { pid });
      }

      // Remove PID file
      const pidFile = path.join(this.pidDir, `${tunnelId}.pid`);
      await fs.unlink(pidFile).catch(() => {});

      // Remove from active tunnels
      this.activeTunnels.delete(tunnelId);

      logger.info('Tunnel daemon stopped', { tunnel_id: tunnelId, pid });
    } catch (error) {
      logger.error('Failed to stop tunnel daemon', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get tunnel PID from file
   */
  private async getTunnelPID(tunnelId: string): Promise<number | null> {
    try {
      const pidFile = path.join(this.pidDir, `${tunnelId}.pid`);
      const pidStr = await fs.readFile(pidFile, 'utf-8');
      return parseInt(pidStr.trim(), 10);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if tunnel daemon is running
   */
  async isTunnelRunning(tunnelId: string): Promise<boolean> {
    const pid = await this.getTunnelPID(tunnelId);

    if (!pid) {
      return false;
    }

    try {
      // Check if process exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // Process doesn't exist
      return false;
    }
  }

  /**
   * Get tunnel status
   */
  async getTunnelStatus(tunnelId: string): Promise<{
    tunnel_id: string;
    is_running: boolean;
    pid: number | null;
    connections: any[];
  }> {
    const isRunning = await this.isTunnelRunning(tunnelId);
    const pid = await this.getTunnelPID(tunnelId);

    let connections: any[] = [];
    if (isRunning) {
      try {
        connections = await this.apiClient.getTunnelConnections(tunnelId);
      } catch (error) {
        logger.warn('Failed to get tunnel connections', {
          tunnel_id: tunnelId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      tunnel_id: tunnelId,
      is_running: isRunning,
      pid,
      connections
    };
  }

  /**
   * Delete tunnel and cleanup
   */
  async deleteTunnel(tunnelId: string): Promise<void> {
    try {
      logger.info('Deleting tunnel', { tunnel_id: tunnelId });

      // Stop daemon if running
      if (await this.isTunnelRunning(tunnelId)) {
        await this.stopTunnelDaemon(tunnelId);
      }

      // Delete tunnel via API
      await this.apiClient.deleteTunnel(tunnelId);

      // Remove credentials file
      const credentialsFile = path.join(this.tunnelDir, `${tunnelId}.json`);
      await fs.unlink(credentialsFile).catch(() => {});

      // Remove config file
      const configFile = path.join(this.configDir, `${tunnelId}.yml`);
      await fs.unlink(configFile).catch(() => {});

      // Remove PID file
      const pidFile = path.join(this.pidDir, `${tunnelId}.pid`);
      await fs.unlink(pidFile).catch(() => {});

      logger.info('Tunnel deleted successfully', { tunnel_id: tunnelId });
    } catch (error) {
      logger.error('Failed to delete tunnel', {
        tunnel_id: tunnelId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * List all tunnels
   */
  async listTunnels(): Promise<TunnelInfo[]> {
    try {
      const tunnels = await this.apiClient.listTunnels();

      const tunnelInfos: TunnelInfo[] = [];

      for (const tunnel of tunnels) {
        const isRunning = await this.isTunnelRunning(tunnel.id);

        tunnelInfos.push({
          id: tunnel.id,
          name: tunnel.name,
          config: {
            tunnel_id: tunnel.id,
            name: tunnel.name,
            hostname: '',
            port: 0,
            status: isRunning ? 'running' : 'stopped',
            created_at: tunnel.created_at,
            updated_at: tunnel.created_at
          },
          credentials_file: path.join(this.tunnelDir, `${tunnel.id}.json`),
          config_file: path.join(this.configDir, `${tunnel.id}.yml`),
          pid_file: path.join(this.pidDir, `${tunnel.id}.pid`),
          is_running: isRunning
        });
      }

      return tunnelInfos;
    } catch (error) {
      logger.error('Failed to list tunnels', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Singleton instance
let tunnelManager: TunnelManager | null = null;

export function getTunnelManager(): TunnelManager {
  if (!tunnelManager) {
    tunnelManager = new TunnelManager();
  }
  return tunnelManager;
}
