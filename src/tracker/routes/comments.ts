/**
 * Comments Routes
 * Handles issue comment operations
 */

import { FastifyPluginAsync } from 'fastify';
import {
  createComment,
  listComments,
  getComment,
  updateComment,
  deleteComment,
} from '../services/comment-manager.js';
import type { Assignee } from '../types.js';

interface CommentCreateRequest {
  text: string;
  author: Assignee;
}

interface CommentUpdateRequest {
  text: string;
}

/**
 * Fastify plugin for comments routes
 */
export const commentsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/tracker/issues/:issueId/comments - Add comment
  fastify.post<{
    Params: { issueId: string };
    Body: CommentCreateRequest;
  }>('/issues/:issueId/comments', async (request, reply) => {
    try {
      const { issueId } = request.params;
      const { text, author } = request.body;

      const comment = createComment(issueId, author, text);
      return reply.status(201).send(comment);
    } catch (error) {
      fastify.log.error('Failed to create comment:', error);
      return reply.status(500).send({ error: 'Failed to create comment' });
    }
  });

  // GET /api/tracker/issues/:issueId/comments - List comments
  fastify.get<{
    Params: { issueId: string };
  }>('/issues/:issueId/comments', async (request, reply) => {
    try {
      const comments = listComments(request.params.issueId);
      return reply.send({ comments, count: comments.length });
    } catch (error) {
      fastify.log.error('Failed to list comments:', error);
      return reply.status(500).send({ error: 'Failed to list comments' });
    }
  });

  // PATCH /api/tracker/comments/:commentId - Update comment
  fastify.patch<{
    Params: { commentId: string };
    Body: CommentUpdateRequest;
    Querystring: { issue_id: string };
  }>('/comments/:commentId', async (request, reply) => {
    try {
      const { commentId } = request.params;
      const { issue_id } = request.query;
      const { text } = request.body;

      const comment = updateComment(issue_id, commentId, text);
      if (!comment) {
        return reply.status(404).send({ error: 'Comment not found' });
      }
      return reply.send(comment);
    } catch (error) {
      fastify.log.error('Failed to update comment:', error);
      return reply.status(500).send({ error: 'Failed to update comment' });
    }
  });

  // DELETE /api/tracker/comments/:commentId - Delete comment
  fastify.delete<{
    Params: { commentId: string };
    Querystring: { issue_id: string };
  }>('/comments/:commentId', async (request, reply) => {
    try {
      const { commentId } = request.params;
      const { issue_id } = request.query;

      const deleted = deleteComment(issue_id, commentId);
      if (!deleted) {
        return reply.status(404).send({ error: 'Comment not found' });
      }
      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Failed to delete comment:', error);
      return reply.status(500).send({ error: 'Failed to delete comment' });
    }
  });
};
