import { WebSocket } from 'ws';

import { createLogger } from '../utils/logger.js';

const logger = createLogger({ module: 'connection-manager' });

/**
 * Worktree status interface
 */
export interface WorktreeStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: Date;
  agentVersion: string;
  ports: Record<string, number>;
  health: Record<string, unknown>;
}

/**
 * Manages WebSocket connections for agents and clients
 * Port of Python ConnectionManager class
 */
export class ConnectionManager {
  // Agent connections: {worktree_name: websocket}
  private agents: Map<string, WebSocket> = new Map();

  // Client connections: {client_id: websocket}
  private clients: Map<string, WebSocket> = new Map();

  // Client subscriptions: {client_id: Set(worktree_names)}
  private subscriptions: Map<string, Set<string>> = new Map();

  // Worktree metadata
  private worktrees: Map<string, WorktreeStatus> = new Map();

  /**
   * Register a worktree agent connection
   */
  async connectAgent(worktree: string, websocket: WebSocket): Promise<void> {
    this.agents.set(worktree, websocket);

    this.worktrees.set(worktree, {
      name: worktree,
      status: 'online',
      lastSeen: new Date(),
      agentVersion: '3.0.0',
      ports: {},
      health: {},
    });

    logger.info(`✅ Agent connected: ${worktree}`);

    // Broadcast agent online event to all clients
    this.broadcastToClients({
      type: 'agent.connected',
      worktree,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unregister a worktree agent connection
   */
  disconnectAgent(worktree: string): void {
    this.agents.delete(worktree);

    const worktreeStatus = this.worktrees.get(worktree);
    if (worktreeStatus) {
      worktreeStatus.status = 'offline';
      worktreeStatus.lastSeen = new Date();
    }

    logger.warn(`⚠️  Agent disconnected: ${worktree}`);
  }

  /**
   * Register a client connection
   */
  async connectClient(clientId: string, websocket: WebSocket): Promise<void> {
    this.clients.set(clientId, websocket);
    this.subscriptions.set(clientId, new Set());

    logger.info(`✅ Client connected: ${clientId}`);

    // Send current worktree summary to new client
    this.sendToClient(clientId, {
      type: 'worktree.summary',
      worktrees: Array.from(this.worktrees.values()),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unregister a client connection
   */
  disconnectClient(clientId: string): void {
    this.clients.delete(clientId);
    this.subscriptions.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`);
  }

  /**
   * Send message to specific agent
   */
  sendToAgent(worktree: string, message: Record<string, unknown>): void {
    const websocket = this.agents.get(worktree);
    if (!websocket) {
      logger.warn(`Agent ${worktree} not connected`);
      return;
    }

    try {
      websocket.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send to agent ${worktree}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.disconnectAgent(worktree);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: Record<string, unknown>): void {
    const websocket = this.clients.get(clientId);
    if (!websocket) {
      logger.warn(`Client ${clientId} not connected`);
      return;
    }

    try {
      websocket.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to send to client ${clientId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.disconnectClient(clientId);
    }
  }

  /**
   * Broadcast message to all subscribed clients
   */
  broadcastToClients(
    message: Record<string, unknown>,
    worktreeFilter?: string
  ): void {
    const disconnected: string[] = [];

    for (const [clientId, websocket] of this.clients.entries()) {
      // Check if client is subscribed to this worktree
      if (worktreeFilter) {
        const subscriptions = this.subscriptions.get(clientId);
        if (!subscriptions || !subscriptions.has(worktreeFilter)) {
          continue; // Skip if not subscribed
        }
      }

      try {
        websocket.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Failed to broadcast to client ${clientId}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        disconnected.push(clientId);
      }
    }

    // Clean up disconnected clients
    for (const clientId of disconnected) {
      this.disconnectClient(clientId);
    }
  }

  /**
   * Subscribe client to specific worktrees
   */
  subscribeClient(clientId: string, worktrees: string[]): void {
    let subscriptions = this.subscriptions.get(clientId);
    if (!subscriptions) {
      subscriptions = new Set();
      this.subscriptions.set(clientId, subscriptions);
    }

    for (const worktree of worktrees) {
      subscriptions.add(worktree);
    }

    logger.info(`Client ${clientId} subscribed to ${worktrees.join(', ')}`);
  }

  /**
   * Get connected agents list
   */
  getConnectedAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get connected clients list
   */
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get worktree status
   */
  getWorktreeStatus(worktree: string): WorktreeStatus | undefined {
    return this.worktrees.get(worktree);
  }

  /**
   * Get all worktree statuses
   */
  getAllWorktreeStatuses(): WorktreeStatus[] {
    return Array.from(this.worktrees.values());
  }

  /**
   * Update worktree health
   */
  updateWorktreeHealth(worktree: string, health: Record<string, unknown>): void {
    const status = this.worktrees.get(worktree);
    if (status) {
      status.health = health;
      status.lastSeen = new Date();
    }
  }

  /**
   * Update worktree ports
   */
  updateWorktreePorts(worktree: string, ports: Record<string, number>): void {
    const status = this.worktrees.get(worktree);
    if (status) {
      status.ports = ports;
      status.lastSeen = new Date();
    }
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
