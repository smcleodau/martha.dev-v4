/**
 * Documentation Routes
 * Handles documentation CRUD operations and linking
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createDocumentation,
  getDocumentation,
  listDocumentation,
  updateDocumentation,
  deleteDocumentation,
  linkDocumentation,
  linkDocumentationToIssue,
  getDocumentationForIssue,
  searchDocumentation,
} from '../services/documentation-manager.js';
import type { Documentation } from '../types.js';

interface DocumentationCreateRequest {
  issue_id?: string;
  epic_id?: string;
  board_id?: string;
  type: Documentation['type'];
  title: string;
  content: string;
  tags?: string[];
  links?: {
    related_issues?: string[];
    related_docs?: string[];
    external_links?: string[];
  };
  author: string;
}

interface DocumentationUpdateRequest {
  title?: string;
  content?: string;
  tags?: string[];
  links?: {
    related_issues?: string[];
    related_docs?: string[];
    external_links?: string[];
  };
}

interface LinkRequest {
  target_doc_id?: string;
  issue_id?: string;
}

/**
 * Fastify plugin for documentation routes
 * Mounted at /api/tracker/worktrees/:worktreeId/documentation
 */
export const documentationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/documentation - List documentation
  fastify.get<{
    Params: { worktreeId: string };
    Querystring: {
      type?: Documentation['type'];
      issue_id?: string;
      epic_id?: string;
      board_id?: string;
      tags?: string;
      search?: string;
    };
  }>('/', async (request, reply) => {
    try {
      const { worktreeId } = request.params;
      const { search, tags, ...filters } = request.query;

      let docs: Documentation[];

      if (search) {
        // Search by keyword
        docs = searchDocumentation(worktreeId, search);
      } else {
        // List with filters
        const parsedFilters = {
          ...filters,
          tags: tags ? tags.split(',') : undefined,
        };
        docs = listDocumentation(worktreeId, parsedFilters);
      }

      return reply.send({ documentation: docs, count: docs.length });
    } catch (error) {
      fastify.log.error('Failed to list documentation:', error);
      return reply.status(500).send({ error: 'Failed to list documentation' });
    }
  });

  // GET /api/tracker/worktrees/:worktreeId/documentation/:docId - Get single documentation
  fastify.get<{
    Params: { worktreeId: string; docId: string };
  }>('/:docId', async (request, reply) => {
    try {
      const doc = getDocumentation(request.params.worktreeId, request.params.docId);
      if (!doc) {
        return reply.status(404).send({ error: 'Documentation not found' });
      }
      return reply.send(doc);
    } catch (error) {
      fastify.log.error('Failed to get documentation:', error);
      return reply.status(500).send({ error: 'Failed to get documentation' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/documentation - Create documentation
  fastify.post<{
    Params: { worktreeId: string };
    Body: DocumentationCreateRequest;
  }>('/', async (request, reply) => {
    try {
      const { worktreeId } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.type || !data.title || !data.content || !data.author) {
        return reply.status(400).send({
          error: 'Missing required fields: type, title, content, author',
        });
      }

      const doc = createDocumentation(worktreeId, data);
      return reply.status(201).send(doc);
    } catch (error) {
      fastify.log.error('Failed to create documentation:', error);
      return reply.status(500).send({ error: 'Failed to create documentation' });
    }
  });

  // PATCH /api/tracker/worktrees/:worktreeId/documentation/:docId - Update documentation
  fastify.patch<{
    Params: { worktreeId: string; docId: string };
    Body: DocumentationUpdateRequest;
  }>('/:docId', async (request, reply) => {
    try {
      const { worktreeId, docId } = request.params;
      const updates = request.body;

      const doc = updateDocumentation(worktreeId, docId, updates);
      if (!doc) {
        return reply.status(404).send({ error: 'Documentation not found' });
      }
      return reply.send(doc);
    } catch (error) {
      fastify.log.error('Failed to update documentation:', error);
      return reply.status(500).send({ error: 'Failed to update documentation' });
    }
  });

  // DELETE /api/tracker/worktrees/:worktreeId/documentation/:docId - Delete documentation
  fastify.delete<{
    Params: { worktreeId: string; docId: string };
  }>('/:docId', async (request, reply) => {
    try {
      const { worktreeId, docId } = request.params;

      const deleted = deleteDocumentation(worktreeId, docId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Documentation not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete documentation:', error);
      return reply.status(500).send({ error: 'Failed to delete documentation' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/documentation/:docId/link - Link documentation
  fastify.post<{
    Params: { worktreeId: string; docId: string };
    Body: LinkRequest;
  }>('/:docId/link', async (request, reply) => {
    try {
      const { worktreeId, docId } = request.params;
      const { target_doc_id, issue_id } = request.body;

      if (!target_doc_id && !issue_id) {
        return reply.status(400).send({
          error: 'Must provide either target_doc_id or issue_id',
        });
      }

      let doc: Documentation | null = null;

      if (target_doc_id) {
        // Link to another document
        doc = linkDocumentation(worktreeId, docId, target_doc_id);
      } else if (issue_id) {
        // Link to an issue
        doc = linkDocumentationToIssue(worktreeId, docId, issue_id);
      }

      if (!doc) {
        return reply.status(404).send({ error: 'Documentation not found' });
      }

      return reply.send(doc);
    } catch (error) {
      fastify.log.error('Failed to link documentation:', error);
      return reply.status(500).send({ error: 'Failed to link documentation' });
    }
  });
};

/**
 * Fastify plugin for issue-specific documentation routes
 * Mounted at /api/tracker/worktrees/:worktreeId/issues/:issueId/documentation
 */
export const issueDocumentationRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/tracker/worktrees/:worktreeId/issues/:issueId/documentation - Get docs for issue
  fastify.get<{
    Params: { worktreeId: string; issueId: string };
  }>('/', async (request, reply) => {
    try {
      const { worktreeId, issueId } = request.params;
      const docs = getDocumentationForIssue(worktreeId, issueId);
      return reply.send({ documentation: docs, count: docs.length });
    } catch (error) {
      fastify.log.error('Failed to get issue documentation:', error);
      return reply.status(500).send({ error: 'Failed to get issue documentation' });
    }
  });

  // POST /api/tracker/worktrees/:worktreeId/issues/:issueId/documentation - Create doc for issue
  fastify.post<{
    Params: { worktreeId: string; issueId: string };
    Body: Omit<DocumentationCreateRequest, 'issue_id'>;
  }>('/', async (request, reply) => {
    try {
      const { worktreeId, issueId } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.type || !data.title || !data.content || !data.author) {
        return reply.status(400).send({
          error: 'Missing required fields: type, title, content, author',
        });
      }

      const doc = createDocumentation(worktreeId, {
        ...data,
        issue_id: issueId,
      });

      return reply.status(201).send(doc);
    } catch (error) {
      fastify.log.error('Failed to create issue documentation:', error);
      return reply.status(500).send({ error: 'Failed to create issue documentation' });
    }
  });
};
