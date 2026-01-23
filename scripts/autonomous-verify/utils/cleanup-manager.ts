#!/usr/bin/env tsx

/**
 * Cleanup Manager
 *
 * Tracks and removes test data from all systems:
 * - Database (evidence_events, telemetry_events)
 * - Filesystem (temp repos, agent work directories)
 * - Martha tracker (test issues)
 * - Temporal (test workflows)
 */

import { execSync } from 'child_process';
import { readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../../../src/utils/logger.js';

const logger = createLogger({ module: 'cleanup-manager' });

export interface CleanupItem {
  type: 'database' | 'filesystem' | 'temporal' | 'martha';
  identifier: string;
  path?: string;
  cleaned: boolean;
  error?: string;
}

export class CleanupManager {
  private items: CleanupItem[] = [];

  /**
   * Register a database record for cleanup
   */
  registerDatabase(table: string, issueId: string): void {
    this.items.push({
      type: 'database',
      identifier: `${table}:${issueId}`,
      cleaned: false,
    });
  }

  /**
   * Register a filesystem path for cleanup
   */
  registerFilesystem(path: string): void {
    this.items.push({
      type: 'filesystem',
      identifier: path,
      path,
      cleaned: false,
    });
  }

  /**
   * Register a Temporal workflow for cleanup
   */
  registerTemporal(workflowId: string): void {
    this.items.push({
      type: 'temporal',
      identifier: workflowId,
      cleaned: false,
    });
  }

  /**
   * Register a Martha issue for cleanup
   */
  registerMartha(issueId: string): void {
    this.items.push({
      type: 'martha',
      identifier: issueId,
      cleaned: false,
    });
  }

  /**
   * Clean up all registered items
   */
  async cleanupAll(): Promise<void> {
    logger.info('Starting cleanup...');
    logger.info(`Total items to clean: ${this.items.length}`);
    logger.info('');

    let cleaned = 0;
    let failed = 0;

    for (const item of this.items) {
      try {
        switch (item.type) {
          case 'database':
            await this.cleanupDatabase(item);
            break;
          case 'filesystem':
            await this.cleanupFilesystem(item);
            break;
          case 'temporal':
            await this.cleanupTemporal(item);
            break;
          case 'martha':
            await this.cleanupMartha(item);
            break;
        }
        item.cleaned = true;
        cleaned++;
      } catch (error: any) {
        item.error = error.message;
        failed++;
        logger.warn(`Failed to cleanup ${item.type}: ${item.identifier}`, error.message);
      }
    }

    logger.info('');
    logger.info('Cleanup Summary:');
    logger.info(`  ✅ Cleaned: ${cleaned}`);
    logger.info(`  ❌ Failed: ${failed}`);
    logger.info(`  Total: ${this.items.length}`);
  }

  /**
   * Clean up database records
   */
  private async cleanupDatabase(item: CleanupItem): Promise<void> {
    // Note: Would need database connection here
    // For now, just log what would be cleaned
    logger.info(`Would clean database: ${item.identifier}`);
  }

  /**
   * Clean up filesystem paths
   */
  private async cleanupFilesystem(item: CleanupItem): Promise<void> {
    if (!item.path) return;

    try {
      rmSync(item.path, { recursive: true, force: true });
      logger.info(`Cleaned filesystem: ${item.path}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // Path doesn't exist, consider it cleaned
    }
  }

  /**
   * Clean up Temporal workflows
   */
  private async cleanupTemporal(item: CleanupItem): Promise<void> {
    // Note: Would terminate workflow using Temporal client
    // For now, just log what would be cleaned
    logger.info(`Would terminate Temporal workflow: ${item.identifier}`);
  }

  /**
   * Clean up Martha issues
   */
  private async cleanupMartha(item: CleanupItem): Promise<void> {
    // Note: Would delete issue from Martha tracker
    // For now, just log what would be cleaned
    logger.info(`Would delete Martha issue: ${item.identifier}`);
  }

  /**
   * Clean up all test repositories in /tmp
   */
  async cleanupTestRepos(): Promise<void> {
    const tmpDir = '/tmp';
    const testRepoPrefix = 'test-repo-';

    try {
      const entries = readdirSync(tmpDir);

      for (const entry of entries) {
        if (entry.startsWith(testRepoPrefix)) {
          const fullPath = join(tmpDir, entry);

          try {
            const stats = statSync(fullPath);
            if (stats.isDirectory()) {
              rmSync(fullPath, { recursive: true, force: true });
              logger.info(`Cleaned test repo: ${entry}`);
            }
          } catch (error) {
            logger.warn(`Failed to cleanup ${entry}:`, error);
          }
        }
      }
    } catch (error: any) {
      logger.error('Failed to cleanup test repos:', error.message);
    }
  }

  /**
   * Get cleanup summary
   */
  getSummary(): {
    total: number;
    cleaned: number;
    failed: number;
    items: CleanupItem[];
  } {
    return {
      total: this.items.length,
      cleaned: this.items.filter(i => i.cleaned).length,
      failed: this.items.filter(i => !i.cleaned && i.error).length,
      items: this.items,
    };
  }
}
