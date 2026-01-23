#!/usr/bin/env tsx

/**
 * Error Resolver
 *
 * Intelligent diagnosis and resolution of common errors during autonomous verification.
 * Provides auto-fix capabilities where possible.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { createLogger } from '../../../src/utils/logger.js';

const logger = createLogger({ module: 'error-resolver' });

export interface Diagnosis {
  issue: string;
  component: string;
  autoFixable: boolean;
  resolution: string;
  commands?: string[];
}

export class ErrorResolver {
  /**
   * Diagnose an error and suggest resolution
   */
  async diagnose(error: Error): Promise<Diagnosis> {
    const message = error.message.toLowerCase();

    // Database issues
    if (message.includes('relation') && message.includes('does not exist')) {
      return {
        issue: 'missing_table',
        component: 'database',
        autoFixable: true,
        resolution: 'Run database migrations',
        commands: ['npm run db:migrate'],
      };
    }

    if (message.includes('connection') && message.includes('refused')) {
      return {
        issue: 'database_connection',
        component: 'database',
        autoFixable: false,
        resolution: 'Start PostgreSQL service or check connection settings',
      };
    }

    // Temporal issues
    if (message.includes('temporal') && message.includes('connection')) {
      return {
        issue: 'temporal_connection',
        component: 'temporal',
        autoFixable: false,
        resolution: 'Check TEMPORAL_API_KEY in .env.local',
      };
    }

    // Claude CLI issues
    if (message.includes('claude') || message.includes('ENOENT')) {
      if (!existsSync('/home/archiedev/.local/bin/claude')) {
        return {
          issue: 'missing_claude_cli',
          component: 'claude',
          autoFixable: false,
          resolution: 'Install Claude CLI: npm install -g @anthropic-ai/claude-code',
        };
      }
    }

    // Node modules issues
    if (message.includes('cannot find module')) {
      return {
        issue: 'missing_dependencies',
        component: 'npm',
        autoFixable: true,
        resolution: 'Install dependencies',
        commands: ['npm install'],
      };
    }

    // Test failures
    if (message.includes('test') && message.includes('failed')) {
      return {
        issue: 'test_failure',
        component: 'tests',
        autoFixable: false,
        resolution: 'Review test failures in logs and fix issues',
      };
    }

    // Unknown error
    return {
      issue: 'unknown',
      component: 'unknown',
      autoFixable: false,
      resolution: 'Review error details and fix manually',
    };
  }

  /**
   * Attempt to auto-fix an issue
   */
  async attemptAutoFix(diagnosis: Diagnosis): Promise<boolean> {
    if (!diagnosis.autoFixable || !diagnosis.commands) {
      return false;
    }

    logger.info(`Attempting auto-fix for: ${diagnosis.issue}`);

    try {
      for (const command of diagnosis.commands) {
        logger.info(`Running: ${command}`);
        execSync(command, { stdio: 'inherit', cwd: '/mnt/data/martha.dev-v4-orchestration' });
      }

      logger.info('✅ Auto-fix successful');
      return true;
    } catch (error: any) {
      logger.error('❌ Auto-fix failed:', error.message);
      return false;
    }
  }
}
