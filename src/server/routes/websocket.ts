import { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { connectionManager } from '../../core/connection-manager.js';
import { storeEvent, getEventHistory, Event } from '../../redis/event-store.js';
import { pubSubManager } from '../../redis/pub-sub.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'websocket' });

/**
 * WebSocket routes for agents and clients
 */
export async function websocketRoutes(fastify: FastifyInstance) {
  /**
   * WebSocket endpoint for worktree agents
   */
  fastify.get(
    '/ws/agent/:worktree',
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest) => {
      const { worktree } = request.params as { worktree: string };
      const ws = socket;

      logger.info(`Agent connecting: ${worktree}`);

      // Register connection
      await connectionManager.connectAgent(worktree, ws);

      // Handle incoming messages from agent
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle different message types
          if (message.type === 'heartbeat') {
            // Update worktree status
            if (message.health) {
              connectionManager.updateWorktreeHealth(worktree, message.health);
            }
            if (message.ports) {
              connectionManager.updateWorktreePorts(worktree, message.ports);
            }
            logger.debug(`Heartbeat from ${worktree}`, message);
            return;
          }

          // Parse as event
          const event: Event = {
            type: message.type || 'unknown',
            worktree,
            timestamp: message.timestamp || new Date().toISOString(),
            data: message.data || message,
          };

          logger.info(`📨 Event from ${worktree}: ${event.type}`);

          // Store event in Redis
          try {
            await storeEvent(event);
            logger.debug('✓ Event stored in Redis');
          } catch (error) {
            logger.error('Failed to store event in Redis', {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Publish to Redis Pub/Sub for client broadcast
          await pubSubManager.publish(`worktree:${worktree}`, event as unknown as Record<string, unknown>);

          // Broadcast to subscribed clients immediately
          connectionManager.broadcastToClients(
            {
              type: 'worktree.event',
              worktree,
              event_type: event.type,
              timestamp: event.timestamp,
              data: event.data,
            },
            worktree
          );

          // Update worktree status
          const status = connectionManager.getWorktreeStatus(worktree);
          if (status) {
            status.lastSeen = new Date();
            status.status = 'online';
          }
        } catch (error) {
          logger.error(`Error processing message from ${worktree}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        connectionManager.disconnectAgent(worktree);
        connectionManager.broadcastToClients({
          type: 'agent.disconnected',
          worktree,
          timestamp: new Date().toISOString(),
        });
        logger.warn(`Agent disconnected: ${worktree}`);
      });

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error for agent ${worktree}`, {
          error: error.message,
        });
        connectionManager.disconnectAgent(worktree);
      });
    }
  );

  /**
   * WebSocket endpoint for client applications
   */
  fastify.get(
    '/ws/client/:clientId',
    { websocket: true },
    async (socket: WebSocket, request: FastifyRequest) => {
      const { clientId } = request.params as { clientId: string };
      const ws = socket;

      logger.info(`Client connecting: ${clientId}`);

      // Register connection
      await connectionManager.connectClient(clientId, ws);

      // Handle incoming messages from client
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          const command = message.command;

          if (command === 'subscribe') {
            // Subscribe to specific worktrees
            const worktrees = message.worktrees || [];
            connectionManager.subscribeClient(clientId, worktrees);
            connectionManager.sendToClient(clientId, {
              type: 'subscription.confirmed',
              worktrees,
            });
          } else if (command === 'restart_container') {
            // Forward command to agent
            const worktree = message.worktree;
            const container = message.container;

            const agents = connectionManager.getConnectedAgents();
            if (agents.includes(worktree)) {
              connectionManager.sendToAgent(worktree, {
                command: 'restart_container',
                container,
                request_id: `req_${Date.now()}`,
              });
              connectionManager.sendToClient(clientId, {
                type: 'command.sent',
                command: 'restart_container',
                worktree,
                container,
              });
            } else {
              connectionManager.sendToClient(clientId, {
                type: 'error',
                message: `Agent ${worktree} not connected`,
              });
            }
          } else if (command === 'get_history') {
            // Get historical events
            const worktree = message.worktree;
            const limit = message.limit || 50;

            const events = await getEventHistory(worktree, limit);
            connectionManager.sendToClient(clientId, {
              type: 'history',
              worktree,
              events,
            });
          } else {
            logger.warn(`Unknown command from client ${clientId}`, { command });
          }
        } catch (error) {
          logger.error(`Error processing message from client ${clientId}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        connectionManager.disconnectClient(clientId);
        logger.info(`Client disconnected: ${clientId}`);
      });

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error for client ${clientId}`, {
          error: error.message,
        });
        connectionManager.disconnectClient(clientId);
      });
    }
  );
}
