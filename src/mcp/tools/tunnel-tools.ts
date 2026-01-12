import { createLogger } from '../../utils/logger.js';
import { getTunnelManager } from '../../integrations/cloudflare/tunnel-manager.js';
import { getDNSManager } from '../../integrations/cloudflare/dns-manager.js';
import { pool } from '../../database/client.js';
import type { ToolResponse } from '../types.js';

const logger = createLogger({ module: 'tunnel-tools' });

/**
 * Tunnel management MCP tools
 */
export class TunnelTools {
  private tunnelManager = getTunnelManager();
  private dnsManager = getDNSManager();

  async handle(toolName: string, args: Record<string, unknown>): Promise<ToolResponse> {
    switch (toolName) {
      case 'martha__tunnel__provision':
        return await this.provisionTunnel(args);
      case 'martha__tunnel__destroy':
        return await this.destroyTunnel(args);
      default:
        throw new Error(`Unknown tunnel tool: ${toolName}`);
    }
  }

  /**
   * Provision Cloudflare tunnel for a worktree
   */
  private async provisionTunnel(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name, port, subdomain } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    if (typeof port !== 'number') {
      throw new Error('port must be a number');
    }

    const customSubdomain = typeof subdomain === 'string' ? subdomain : null;

    logger.info('Provisioning tunnel', { worktree_name, port, subdomain: customSubdomain });

    try {
      // Check if Cloudflare credentials are configured
      if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ZONE_ID) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Cloudflare credentials not configured',
                  message: 'Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables',
                  worktree_name,
                  fallback: 'Manual tunnel configuration required'
                },
                null,
                2
              )
            }
          ]
        };
      }

      // Generate tunnel name
      const tunnelName = `${worktree_name}-tunnel`;

      // Generate hostname
      const hostname = customSubdomain || `${worktree_name}.martha.arch.ie`;

      // 1. Create tunnel
      logger.info('Creating tunnel', { tunnel_name: tunnelName });
      const tunnel = await this.tunnelManager.createTunnel(tunnelName);

      // 2. Create DNS record
      logger.info('Creating DNS record', { hostname, tunnel_id: tunnel.id });
      const dnsRecord = await this.dnsManager.createDNSRecord({
        hostname,
        tunnelId: tunnel.id,
        proxied: true,
        ttl: 1
      });

      // 3. Start tunnel daemon
      logger.info('Starting tunnel daemon', { tunnel_id: tunnel.id, hostname, port });
      const pid = await this.tunnelManager.startTunnelDaemon(tunnel.id, hostname, port);

      // 4. Wait a moment for tunnel to establish
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 5. Get tunnel status
      const status = await this.tunnelManager.getTunnelStatus(tunnel.id);

      // 6. Update worktree in database
      try {
        await pool.query(
          `UPDATE ts_martha.worktrees
           SET tunnel = $1, updated_at = NOW()
           WHERE name = $2`,
          [
            JSON.stringify({
              tunnel_id: tunnel.id,
              tunnel_name: tunnelName,
              hostname,
              port,
              dns_record_id: dnsRecord.id,
              status: status.is_running ? 'running' : 'error',
              daemon_pid: pid,
              created_at: new Date().toISOString()
            }),
            worktree_name
          ]
        );
      } catch (dbError) {
        logger.warn('Failed to update worktree in database', {
          worktree_name,
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                tunnel: {
                  tunnel_id: tunnel.id,
                  tunnel_name: tunnelName,
                  hostname,
                  url: `https://${hostname}`,
                  port,
                  dns_record_id: dnsRecord.id,
                  status: status.is_running ? 'running' : 'starting',
                  daemon_pid: pid,
                  connections: status.connections.length
                },
                message: `Tunnel provisioned successfully for ${worktree_name}`,
                next_steps: [
                  `Access your service at: https://${hostname}`,
                  'DNS propagation may take 1-2 minutes',
                  `Tunnel daemon running with PID ${pid}`
                ]
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to provision tunnel', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to provision tunnel',
                worktree_name,
                message: error instanceof Error ? error.message : 'Unknown error',
                suggestion: 'Check Cloudflare credentials and try again'
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
   * Destroy Cloudflare tunnel for a worktree
   */
  private async destroyTunnel(args: Record<string, unknown>): Promise<ToolResponse> {
    const { worktree_name } = args;

    if (typeof worktree_name !== 'string') {
      throw new Error('worktree_name must be a string');
    }

    logger.info('Destroying tunnel', { worktree_name });

    try {
      // Get tunnel info from database
      const result = await pool.query(
        'SELECT tunnel FROM ts_martha.worktrees WHERE name = $1',
        [worktree_name]
      );

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Worktree not found',
                  worktree_name,
                  suggestion: 'Check worktree name and try again'
                },
                null,
                2
              )
            }
          ]
        };
      }

      const tunnelData = result.rows[0].tunnel;

      if (!tunnelData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: 'No tunnel configured for this worktree',
                  worktree_name
                },
                null,
                2
              )
            }
          ]
        };
      }

      const { tunnel_id, hostname, dns_record_id } = tunnelData;

      // 1. Stop tunnel daemon
      logger.info('Stopping tunnel daemon', { tunnel_id });
      await this.tunnelManager.stopTunnelDaemon(tunnel_id);

      // 2. Delete DNS record
      if (hostname) {
        logger.info('Deleting DNS record', { hostname });
        await this.dnsManager.deleteDNSRecord(hostname);
      }

      // 3. Delete tunnel
      logger.info('Deleting tunnel', { tunnel_id });
      await this.tunnelManager.deleteTunnel(tunnel_id);

      // 4. Update worktree in database
      await pool.query(
        `UPDATE ts_martha.worktrees
         SET tunnel = NULL, updated_at = NOW()
         WHERE name = $1`,
        [worktree_name]
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Tunnel destroyed successfully for ${worktree_name}`,
                destroyed: {
                  tunnel_id,
                  hostname,
                  dns_record_id
                }
              },
              null,
              2
            )
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to destroy tunnel', {
        worktree_name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Failed to destroy tunnel',
                worktree_name,
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
