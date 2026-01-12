import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { appConfig } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dashboardRoutes from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { websocketRoutes } from './routes/websocket.js';
import { worktreeRoutes } from './routes/worktrees.js';
import { logsRoutes } from './routes/logs.js';
import { registerHookRoutes } from './routes/hooks.js';
import { registerSwarmRoutes } from './routes/swarms.js';
import { testRoutes } from './routes/tests.js';

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

  // Register API routes first
  await server.register(healthRoutes);
  await server.register(websocketRoutes);
  await server.register(worktreeRoutes);
  await server.register(logsRoutes);
  await registerHookRoutes(server);
  await registerSwarmRoutes(server);
  await server.register(testRoutes);
  await server.register(dashboardRoutes); // Changelog API

  // Register static file serving for React dashboard (after all API routes)
  const dashboardDistPath = join(__dirname, '../../../dashboard/dist');
  serverLogger.info('Registering static files', { path: dashboardDistPath });

  try {
    await server.register(fastifyStatic, {
      root: dashboardDistPath,
      prefix: '/',
    });
    serverLogger.info('Static files registered successfully');

    // Fallback for SPA routing - serve index.html for any unmatched routes
    // But only for HTML requests, not for assets
    server.setNotFoundHandler(async (request, reply) => {
      const url = request.url.split('?')[0]; // Remove query params
      // If the request is for an asset (has file extension), return 404
      if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/)) {
        return reply.code(404).send({ error: 'Asset not found', url: request.url });
      }
      // Otherwise, serve index.html for SPA routing
      return reply.sendFile('index.html');
    });
  } catch (error) {
    console.error('Static file registration error:', error);
    serverLogger.error('Failed to register static files', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

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
