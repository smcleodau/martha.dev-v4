import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';

import { appConfig } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

import { healthRoutes } from './routes/health.js';
import { websocketRoutes } from './routes/websocket.js';
import { worktreeRoutes } from './routes/worktrees.js';
import { registerHookRoutes } from './routes/hooks.js';
import { registerSwarmRoutes } from './routes/swarms.js';

const serverLogger = createLogger({ module: 'fastify' });

/**
 * Create and configure Fastify server
 */
export async function createServer() {
  const server = Fastify({
    logger: false, // Use our Pino logger instead
    requestTimeout: 30000,
    bodyLimit: 1048576, // 1MB
  });

  // Register CORS
  await server.register(cors, {
    origin: true, // Allow all origins in development
    credentials: true,
  });

  // Register WebSocket support
  await server.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
      verifyClient: (_info, next) => {
        // Add authentication here if needed
        next(true);
      },
    },
  });

  // Request logging middleware
  server.addHook('onRequest', (request, _reply, done) => {
    serverLogger.debug('Incoming request', {
      method: request.method,
      url: request.url,
      ip: request.ip,
    });
    done();
  });

  // Response logging middleware
  server.addHook('onResponse', (request, reply, done) => {
    serverLogger.debug('Response sent', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    });
    done();
  });

  // Error handler
  server.setErrorHandler(async (error, request, reply) => {
    serverLogger.error('Request error', {
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
    });

    await reply.status(error.statusCode || 500).send({
      error: {
        message: error.message || 'Internal Server Error',
        statusCode: error.statusCode || 500,
      },
    });
  });

  // Register routes
  await server.register(healthRoutes);
  await server.register(websocketRoutes);
  await server.register(worktreeRoutes);
  await registerHookRoutes(server);
  await registerSwarmRoutes(server);

  return server;
}

/**
 * Start the Fastify server
 */
export async function startServer() {
  try {
    const server = await createServer();

    await server.listen({
      port: appConfig.servicePort,
      host: '0.0.0.0',
    });

    serverLogger.info('Martha TypeScript service started', {
      port: appConfig.servicePort,
      worktree: appConfig.worktreeName,
      version: '3.0.0',
    });

    // Graceful shutdown
    const shutdown = async () => {
      serverLogger.info('Shutting down server...');
      await server.close();
      serverLogger.info('Server shut down complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown());
    process.on('SIGINT', () => void shutdown());

    return server;
  } catch (error) {
    serverLogger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}
