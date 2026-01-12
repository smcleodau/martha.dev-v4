import { execFile } from 'child_process';
import { promisify } from 'util';

import { createLogger } from '../../utils/logger.js';
import { AgentEvent } from '../types.js';

const execFileAsync = promisify(execFile);
const logger = createLogger({ module: 'git-watcher' });

/**
 * Watches Git repository for changes
 */
export class GitWatcher {
  private repoPath: string;
  private lastCommit: string | null = null;
  private lastBranch: string | null = null;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
  }

  /**
   * Check Git status and return events
   */
  async checkStatus(): Promise<AgentEvent[]> {
    const events: AgentEvent[] = [];

    try {
      // Check current branch
      const branchResult = await execFileAsync('git', ['branch', '--show-current'], {
        cwd: this.repoPath,
        timeout: 5000,
      });

      const branch = branchResult.stdout.trim();
      if (branch && branch !== this.lastBranch) {
        events.push({
          type: 'git.branch',
          data: {
            old_branch: this.lastBranch,
            new_branch: branch,
          },
        });
        this.lastBranch = branch;
      }

      // Check latest commit
      const commitResult = await execFileAsync('git', ['log', '-1', '--format=%H:%s'], {
        cwd: this.repoPath,
        timeout: 5000,
      });

      const commitInfo = commitResult.stdout.trim();
      if (commitInfo && commitInfo !== this.lastCommit) {
        const [hash, ...messageParts] = commitInfo.split(':');
        const message = messageParts.join(':');

        if (hash) {
          events.push({
            type: 'git.commit',
            data: {
              hash: hash.substring(0, 8),
              message,
              branch: this.lastBranch,
            },
          });
          this.lastCommit = commitInfo;
        }
      }

      // Check uncommitted changes
      const statusResult = await execFileAsync('git', ['status', '--porcelain'], {
        cwd: this.repoPath,
        timeout: 5000,
      });

      const uncommitted = statusResult.stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0).length;

      if (uncommitted > 0) {
        events.push({
          type: 'git.uncommitted',
          data: {
            count: uncommitted,
          },
        });
      }
    } catch (error) {
      logger.error('Git check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return events;
  }
}
