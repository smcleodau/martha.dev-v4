/**
 * Seed Data Routes
 * API endpoints to seed test data for development and testing
 */

import { FastifyPluginAsync } from 'fastify';
import { createLogger } from '../../utils/logger.js';
import axios from 'axios';

const logger = createLogger({ module: 'seed-routes' });

interface SeedIssue {
  title: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  status: 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  story_points?: number;
  parent_id?: string;
  epic_id?: string;
}

export const seedRoutes: FastifyPluginAsync = async (fastify) => {
  const API_BASE = `http://localhost:${fastify.server.address()?.port || 20000}`;

  /**
   * POST /api/v1/seed/calculator-epic
   * Seeds a calculator epic with sub-issues for testing orchestration
   */
  fastify.post<{
    Body: {
      worktree_id?: string;
      board_id?: string;
      clear_existing?: boolean;
    };
  }>('/calculator-epic', async (request, reply) => {
    const { worktree_id = 'calculator-app', board_id = 'main', clear_existing = false } = request.body || {};

    logger.info('Seeding calculator epic', { worktree_id, board_id, clear_existing });

    try {
      const issues: any[] = [];
      const dependencies: Array<{ issueId: string; targetId: string; type: string }> = [];

      // Helper to create an issue
      const createIssue = async (issue: SeedIssue) => {
        const response = await axios.post(
          `${API_BASE}/api/tracker/worktrees/${worktree_id}/boards/${board_id}/issues`,
          issue
        );
        issues.push(response.data);
        logger.info('Created issue', { id: response.data.id, title: issue.title });
        return response.data;
      };

      // Create Epic
      const epic = await createIssue({
        title: 'Calculator Application',
        type: 'epic',
        status: 'backlog',
        priority: 'high',
        description: `# Calculator Application

Build a web-based calculator with basic arithmetic, memory functions, and comprehensive testing.

## Features
- Basic arithmetic operations (add, subtract, multiply, divide)
- Memory functions (M+, M-, MR, MC)
- Keyboard support
- Responsive design
- 80%+ test coverage`,
      });

      // Create Story #1 - Arithmetic
      const story1 = await createIssue({
        title: 'Implement basic arithmetic operations',
        type: 'story',
        status: 'todo',
        priority: 'high',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 5,
        description: 'Implement addition, subtraction, multiplication, and division with proper decimal and negative number handling.',
      });

      // Create Story #2 - UI
      const story2 = await createIssue({
        title: 'Build calculator UI components',
        type: 'story',
        status: 'todo',
        priority: 'high',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 8,
        description: 'Create display, number buttons, operation buttons, and responsive layout.',
      });

      // Create Story #3 - Memory
      const story3 = await createIssue({
        title: 'Add memory functions',
        type: 'story',
        status: 'backlog',
        priority: 'medium',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 3,
        description: 'Implement M+, M-, MR, MC memory functions.',
      });

      // Create Task #1 - Unit Tests
      const task1 = await createIssue({
        title: 'Write unit tests for arithmetic logic',
        type: 'task',
        status: 'todo',
        priority: 'high',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 3,
        description: 'Create Jest unit tests with 80%+ coverage.',
      });

      // Create Task #2 - E2E Tests
      const task2 = await createIssue({
        title: 'Create E2E tests for user interactions',
        type: 'task',
        status: 'backlog',
        priority: 'medium',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 5,
        description: 'Implement Playwright E2E tests with Browserbase recording.',
      });

      // Create Bug #1 - Division by Zero
      const bug1 = await createIssue({
        title: 'Handle division by zero gracefully',
        type: 'bug',
        status: 'backlog',
        priority: 'high',
        parent_id: epic.id,
        epic_id: epic.id,
        story_points: 1,
        description: 'Display user-friendly error instead of Infinity.',
      });

      // Add dependencies
      const addDependency = async (issueId: string, targetId: string, type: 'blocked_by' | 'blocks' | 'related') => {
        await axios.post(
          `${API_BASE}/api/tracker/worktrees/${worktree_id}/boards/${board_id}/issues/${issueId}/dependencies`,
          { type, target_issue_id: targetId }
        );
        dependencies.push({ issueId, targetId, type });
        logger.info('Added dependency', { issueId, targetId, type });
      };

      await addDependency(task1.id, story1.id, 'blocked_by');
      await addDependency(task2.id, story2.id, 'blocked_by');
      await addDependency(story3.id, story1.id, 'blocked_by');
      await addDependency(bug1.id, story1.id, 'related');

      // Create release
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 14);
      const releaseResponse = await axios.post(
        `${API_BASE}/api/tracker/worktrees/${worktree_id}/releases`,
        {
          name: 'Calculator v1.0',
          version: '1.0.0',
          target_date: targetDate.toISOString().split('T')[0],
          description: 'Initial release of the calculator application'
        }
      );
      const release = releaseResponse.data;

      // Assign issues to release
      for (const issue of [story1, story2, story3, task1, task2, bug1]) {
        await axios.patch(
          `${API_BASE}/api/tracker/worktrees/${worktree_id}/boards/${board_id}/issues/${issue.id}`,
          { release_id: release.id }
        );
      }

      return reply.send({
        success: true,
        message: 'Calculator epic seeded successfully',
        data: {
          epic: { id: epic.id, title: epic.title },
          stories: [story1, story2, story3].map(s => ({ id: s.id, title: s.title })),
          tasks: [task1, task2].map(t => ({ id: t.id, title: t.title })),
          bugs: [bug1].map(b => ({ id: b.id, title: b.title })),
          release: { id: release.id, name: release.name },
          dependencies: dependencies,
          total_story_points: 25,
          dashboard_url: `http://localhost:3000/tracker/${worktree_id}/${board_id}`,
        },
      });

    } catch (error: any) {
      logger.error('Failed to seed calculator epic', {
        error: error.message,
        response: error.response?.data,
      });

      return reply.status(500).send({
        success: false,
        error: 'Failed to seed calculator epic',
        details: error.response?.data || error.message,
      });
    }
  });

  /**
   * GET /api/v1/seed/status
   * Check seeding status and available seed endpoints
   */
  fastify.get('/status', async (_request, reply) => {
    return reply.send({
      available_seeds: [
        {
          name: 'calculator-epic',
          endpoint: 'POST /api/v1/seed/calculator-epic',
          description: 'Creates a calculator app epic with 6 sub-issues for testing orchestration',
          parameters: {
            worktree_id: 'string (default: calculator-app)',
            board_id: 'string (default: main)',
            clear_existing: 'boolean (default: false)',
          },
        },
      ],
    });
  });
};
