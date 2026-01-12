import { getGitHubClient } from './client.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'project-board' });

/**
 * GitHub Project Board automation
 *
 * Note: GitHub Projects V2 uses GraphQL API extensively.
 * This is a placeholder implementation that provides basic functionality.
 * Full implementation requires complex GraphQL mutations for Projects V2.
 */
export class ProjectBoard {
  private client = getGitHubClient();

  /**
   * Move issue to a column (placeholder)
   *
   * Note: GitHub Projects V2 requires GraphQL mutations to move cards.
   * This method is a placeholder for future implementation.
   */
  async moveIssueToColumn(issueNumber: number, columnName: string): Promise<void> {
    logger.info('Moving issue to column', { issue_number: issueNumber, column: columnName });

    // For now, we'll use labels as a proxy for project board columns
    // Full implementation requires GraphQL mutations for Projects V2

    const columnLabelMap: Record<string, string> = {
      'To Do': 'status:todo',
      'In Progress': 'status:in-progress',
      'In Review': 'status:in-review',
      'Done': 'status:done',
    };

    const label = columnLabelMap[columnName];

    if (label) {
      try {
        // Remove other status labels
        const issue = await this.client.getIssue(issueNumber);
        const statusLabels = issue.labels
          .filter((l) => typeof l === 'object' && 'name' in l && l.name?.startsWith('status:'))
          .map((l) => (typeof l === 'object' && 'name' in l ? l.name : ''))
          .filter((name): name is string => typeof name === 'string');

        for (const statusLabel of statusLabels) {
          if (statusLabel && statusLabel !== label) {
            await this.client.removeLabel(issueNumber, statusLabel);
          }
        }

        // Add new status label
        await this.client.addLabels(issueNumber, [label]);

        logger.info('Issue moved (via label)', {
          issue_number: issueNumber,
          label,
        });
      } catch (error) {
        logger.warn('Failed to move issue via labels', {
          issue_number: issueNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      logger.warn('Unknown column name', { column: columnName });
    }
  }

  /**
   * Get issue status from labels
   */
  async getIssueStatus(issueNumber: number): Promise<string | null> {
    const issue = await this.client.getIssue(issueNumber);

    const statusLabel = issue.labels
      .find((l) => typeof l === 'object' && 'name' in l && l.name.startsWith('status:'));

    if (statusLabel && typeof statusLabel === 'object' && 'name' in statusLabel) {
      return statusLabel.name.replace('status:', '');
    }

    return null;
  }

  /**
   * Mark issue as done
   */
  async markIssueAsDone(issueNumber: number): Promise<void> {
    logger.info('Marking issue as done', { issue_number: issueNumber });

    // Add done label
    await this.moveIssueToColumn(issueNumber, 'Done');

    // Optionally close the issue
    // await this.client.updateIssue(issueNumber, { state: 'closed' });
  }

  /**
   * Mark issue as in progress
   */
  async markIssueAsInProgress(issueNumber: number, assignee?: string): Promise<void> {
    logger.info('Marking issue as in progress', { issue_number: issueNumber, assignee });

    await this.moveIssueToColumn(issueNumber, 'In Progress');

    if (assignee) {
      await this.client.updateIssue(issueNumber, { assignees: [assignee] });
    }
  }

  /**
   * Add comment when work starts
   */
  async commentWorkStarted(issueNumber: number, worktreeName: string): Promise<void> {
    const comment = `
🚀 **Work Started**

Worktree \`${worktreeName}\` has been provisioned for this issue.

- Development environment ready
- Monitoring agent active
- Events being tracked

---
🤖 Martha Development System
    `.trim();

    await this.client.createIssueComment(issueNumber, comment);

    logger.info('Work started comment posted', { issue_number: issueNumber });
  }

  /**
   * Add comment when work is blocked
   */
  async commentWorkBlocked(issueNumber: number, reason: string): Promise<void> {
    const comment = `
⚠️ **Work Blocked**

${reason}

---
🤖 Martha Development System
    `.trim();

    await this.client.createIssueComment(issueNumber, comment);
    await this.client.addLabels(issueNumber, ['blocked']);

    logger.info('Work blocked comment posted', { issue_number: issueNumber });
  }

  /**
   * Add comment when tests fail
   */
  async commentTestsFailed(
    issueNumber: number,
    details: { failed: number; total: number; url?: string }
  ): Promise<void> {
    const comment = `
❌ **Tests Failed**

${details.failed} of ${details.total} tests failed.

${details.url ? `[View Test Results](${details.url})` : ''}

---
🤖 Martha Development System
    `.trim();

    await this.client.createIssueComment(issueNumber, comment);
    await this.client.addLabels(issueNumber, ['tests-failing']);

    logger.info('Tests failed comment posted', { issue_number: issueNumber });
  }
}

// Singleton instance
let projectBoard: ProjectBoard | null = null;

export function getProjectBoard(): ProjectBoard {
  if (!projectBoard) {
    projectBoard = new ProjectBoard();
  }
  return projectBoard;
}
