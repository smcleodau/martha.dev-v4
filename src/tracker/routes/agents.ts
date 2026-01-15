/**
 * Agents Routes
 * Handles agent session tracking
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createSession,
  getSession,
  updateSession,
  endSession,
  listActiveSessions,
  addLogEntry,
} from '../services/agent-manager.js';
import type { AgentType } from '../types.js';

interface SessionCreateRequest {
  agent_type: AgentType;
  issue_id: string;
  worktree: string;
  initial_task: string;
}

interface SessionUpdateRequest {
  progress?: number;
  current_task?: string;
  status?: 'active' | 'paused';
}

interface SessionEndRequest {
  status: 'completed' | 'failed';
  summary?: string;
}

interface LogEntryRequest {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fastify plugin for agent session routes
 */
export const agentsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/agents/sessions - List active agent sessions
  fastify.get('/sessions', async (request, reply) => {
    try {
      const sessions = listActiveSessions();
      return reply.send({ sessions, count: sessions.length });
    } catch (error) {
      fastify.log.error('Failed to list agent sessions:', error);
      return reply.status(500).send({ error: 'Failed to list agent sessions' });
    }
  });

  // GET /api/tracker/agents/sessions/:id - Get session details
  fastify.get<{
    Params: { id: string };
  }>('/sessions/:id', async (request, reply) => {
    try {
      const session = getSession(request.params.id);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return reply.send(session);
    } catch (error) {
      fastify.log.error('Failed to get session:', error);
      return reply.status(500).send({ error: 'Failed to get session' });
    }
  });

  // POST /api/tracker/agents/sessions - Start new session
  fastify.post<{
    Body: SessionCreateRequest;
  }>('/sessions', async (request, reply) => {
    try {
      const { agent_type, issue_id, worktree, initial_task } = request.body;
      const session = createSession(agent_type, issue_id, worktree, initial_task);
      return reply.status(201).send(session);
    } catch (error) {
      fastify.log.error('Failed to create session:', error);
      return reply.status(500).send({ error: 'Failed to create session' });
    }
  });

  // PATCH /api/tracker/agents/sessions/:id - Update session progress
  fastify.patch<{
    Params: { id: string };
    Body: SessionUpdateRequest;
  }>('/sessions/:id', async (request, reply) => {
    try {
      const session = updateSession(request.params.id, request.body);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return reply.send(session);
    } catch (error) {
      fastify.log.error('Failed to update session:', error);
      return reply.status(500).send({ error: 'Failed to update session' });
    }
  });

  // POST /api/tracker/agents/sessions/:id/end - End session
  fastify.post<{
    Params: { id: string };
    Body: SessionEndRequest;
  }>('/sessions/:id/end', async (request, reply) => {
    try {
      const { status, summary } = request.body;
      const session = endSession(request.params.id, status, summary);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return reply.send(session);
    } catch (error) {
      fastify.log.error('Failed to end session:', error);
      return reply.status(500).send({ error: 'Failed to end session' });
    }
  });

  // POST /api/tracker/agents/sessions/:id/log - Add log entry
  fastify.post<{
    Params: { id: string };
    Body: LogEntryRequest;
  }>('/sessions/:id/log', async (request, reply) => {
    try {
      const { level, message, metadata } = request.body;
      const session = addLogEntry(request.params.id, level, message, metadata);
      if (!session) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      return reply.status(201).send({ success: true });
    } catch (error) {
      fastify.log.error('Failed to add log entry:', error);
      return reply.status(500).send({ error: 'Failed to add log entry' });
    }
  });
};
