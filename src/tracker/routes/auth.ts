/**
 * Auth Routes
 * Handles authentication (simplified version - can be enhanced later with OAuth)
 */

import { FastifyPluginAsync } from 'fastify';

/**
 * Fastify plugin for auth routes
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/auth/status - Get auth status
  fastify.get('/status', async (request, reply) => {
    // Simplified - always return authenticated for now
    // TODO: Implement proper GitHub OAuth flow
    return reply.send({
      authenticated: true,
      user: {
        id: 'dev-user',
        name: 'Development User',
        avatar: '',
      },
    });
  });

  // GET /api/tracker/auth/login - Initiate GitHub OAuth
  fastify.get('/login', async (request, reply) => {
    // TODO: Implement GitHub OAuth flow
    return reply.status(501).send({ error: 'OAuth not implemented yet' });
  });

  // GET /api/tracker/auth/callback - OAuth callback handler
  fastify.get('/callback', async (request, reply) => {
    // TODO: Implement OAuth callback
    return reply.status(501).send({ error: 'OAuth not implemented yet' });
  });

  // POST /api/tracker/auth/logout - Logout
  fastify.post('/logout', async (request, reply) => {
    return reply.send({ success: true });
  });
};
