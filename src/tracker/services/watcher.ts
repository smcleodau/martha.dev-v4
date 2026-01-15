/**
 * Tracker File Watcher Service
 * Watches .martha directory for changes and broadcasts events via WebSocket
 */

import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'node:path';
import { getTrackerPath } from './file-storage.js';
import { connectionManager } from '../../core/connection-manager.js';
import { logger } from '../../utils/logger.js';
import type { TrackerEvent } from '../types.js';

export class TrackerWatcher {
  private watcher: FSWatcher | null = null;
  private isRunning = false;

  /**
   * Start watching the .martha directory
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('TrackerWatcher already running');
      return;
    }

    const trackerRoot = getTrackerPath();

    logger.info(`Starting TrackerWatcher on ${trackerRoot}`);

    this.watcher = chokidar.watch(
      [
        path.join(trackerRoot, 'issues/**/*.{json,md}'),
        path.join(trackerRoot, 'board/state.json'),
        path.join(trackerRoot, 'comments/**/*.json'),
        path.join(trackerRoot, 'agents/sessions/**/*.json'),
      ],
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      }
    );

    this.watcher.on('change', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('add', (filePath) => this.handleFileAdd(filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileDelete(filePath));
    this.watcher.on('error', (error) => {
      logger.error('TrackerWatcher error:', error);
    });

    this.isRunning = true;
    logger.info('TrackerWatcher started successfully');
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.watcher) {
      return;
    }

    logger.info('Stopping TrackerWatcher');
    await this.watcher.close();
    this.watcher = null;
    this.isRunning = false;
    logger.info('TrackerWatcher stopped');
  }

  /**
   * Handle file change event
   */
  private handleFileChange(filePath: string): void {
    const event = this.getEventForPath(filePath, 'change');
    if (event) {
      this.broadcastEvent(event);
    }
  }

  /**
   * Handle file add event
   */
  private handleFileAdd(filePath: string): void {
    const event = this.getEventForPath(filePath, 'add');
    if (event) {
      this.broadcastEvent(event);
    }
  }

  /**
   * Handle file delete event
   */
  private handleFileDelete(filePath: string): void {
    const event = this.getEventForPath(filePath, 'delete');
    if (event) {
      this.broadcastEvent(event);
    }
  }

  /**
   * Determine event type based on file path
   */
  private getEventForPath(
    filePath: string,
    action: 'change' | 'add' | 'delete'
  ): TrackerEvent | null {
    const relativePath = path.relative(getTrackerPath(), filePath);

    // Issue files
    if (relativePath.startsWith('issues/') && !relativePath.includes('index.json')) {
      const issueId = path.basename(filePath, path.extname(filePath));

      if (action === 'add') {
        return {
          type: 'tracker:issue_created',
          data: { issue_id: issueId, issue: {} as any }, // Will be populated by handler
        };
      } else if (action === 'change') {
        return {
          type: 'tracker:issue_updated',
          data: { issue_id: issueId, issue: {} as any },
        };
      } else if (action === 'delete') {
        return {
          type: 'tracker:issue_deleted',
          data: { issue_id: issueId },
        };
      }
    }

    // Board state
    if (relativePath === 'board/state.json') {
      return {
        type: 'tracker:board_updated',
        data: { path: relativePath },
      };
    }

    // Comments
    if (relativePath.startsWith('comments/')) {
      const parts = relativePath.split(path.sep);
      if (parts.length >= 3) {
        const issueId = parts[1];
        return {
          type: 'tracker:comment_added',
          data: { issue_id: issueId, comment: {} as any },
        };
      }
    }

    // Agent sessions
    if (relativePath.startsWith('agents/sessions/') && !relativePath.includes('index.json')) {
      const sessionId = path.basename(filePath, '.json');

      if (action === 'add') {
        return {
          type: 'tracker:agent_started',
          data: { session_id: sessionId, session: {} as any },
        };
      } else if (action === 'change') {
        return {
          type: 'tracker:agent_progress',
          data: { session_id: sessionId, progress: 0 },
        };
      }
    }

    return null;
  }

  /**
   * Broadcast event to all connected clients
   */
  private broadcastEvent(event: TrackerEvent): void {
    try {
      connectionManager.broadcastToClients(event);
      logger.debug('Broadcasted tracker event:', event.type);
    } catch (error) {
      logger.error('Failed to broadcast tracker event:', error);
    }
  }
}

// Singleton instance
export const trackerWatcher = new TrackerWatcher();
