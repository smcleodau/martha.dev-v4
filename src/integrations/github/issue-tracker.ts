import { getGitHubClient } from './client.js';
import { getGitHubGraphQL } from './graphql.js';
import { createLogger } from '../../utils/logger.js';
import { pool } from '../../database/client.js';

const logger = createLogger({ module: 'issue-tracker' });

export interface Epic {
  epic_number: number;
  title: string;
  description: string;
  state: string;
  sub_issues: SubIssue[];
  completion_percentage: number;
  worktree_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SubIssue {
  number: number;
  title: string;
  state: string;
  labels: string[];
  assignees: string[];
}

/**
 * Issue tracking and management
 */
export class IssueTracker {
  private client = getGitHubClient();
  private graphql = getGitHubGraphQL();

  /**
   * Track an epic and store in database
   */
  async trackEpic(epicNumber: number, worktreeName?: string): Promise<Epic> {
    logger.info('Tracking epic', { epic_number: epicNumber, worktree_name: worktreeName });

    // Fetch epic from GitHub GraphQL
    const epicData = await this.graphql.fetchEpic(epicNumber);

    // Store in database
    await pool.query(
      `
      INSERT INTO epics (epic_number, title, description, state, worktree_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (epic_number)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        state = EXCLUDED.state,
        worktree_name = COALESCE(EXCLUDED.worktree_name, epics.worktree_name),
        updated_at = NOW()
      RETURNING id
    `,
      [epicData.epic_number, epicData.title, epicData.description, epicData.state, worktreeName]
    );

    // Get epic ID
    const epicResult = await pool.query(
      'SELECT id FROM epics WHERE epic_number = $1',
      [epicNumber]
    );
    const epicId = epicResult.rows[0]?.id;

    // Store sub-issues
    if (epicId && epicData.sub_issues.length > 0) {
      for (const subIssue of epicData.sub_issues) {
        await pool.query(
          `
          INSERT INTO issues (issue_number, epic_id, title, state, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (issue_number, epic_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            state = EXCLUDED.state,
            updated_at = NOW()
        `,
          [subIssue.number, epicId, subIssue.title, subIssue.state]
        );
      }
    }

    logger.info('Epic tracked successfully', {
      epic_number: epicNumber,
      sub_issues: epicData.sub_issues.length,
    });

    return {
      ...epicData,
      worktree_name: worktreeName,
    };
  }

  /**
   * Get epic from database
   */
  async getEpic(epicNumber: number): Promise<Epic | null> {
    logger.debug('Getting epic from database', { epic_number: epicNumber });

    const epicResult = await pool.query(
      'SELECT * FROM epics WHERE epic_number = $1',
      [epicNumber]
    );

    if (epicResult.rows.length === 0) {
      return null;
    }

    const epic = epicResult.rows[0];

    // Get sub-issues
    const issuesResult = await pool.query(
      'SELECT * FROM issues WHERE epic_id = $1 ORDER BY issue_number',
      [epic.id]
    );

    const subIssues: SubIssue[] = issuesResult.rows.map((row) => ({
      number: row.issue_number,
      title: row.title,
      state: row.state,
      labels: [],
      assignees: [],
    }));

    const completionPercentage =
      subIssues.length > 0
        ? Math.round(
            (subIssues.filter((s) => s.state === 'closed').length / subIssues.length) * 100
          )
        : 0;

    return {
      epic_number: epic.epic_number,
      title: epic.title,
      description: epic.description,
      state: epic.state,
      sub_issues: subIssues,
      completion_percentage: completionPercentage,
      worktree_name: epic.worktree_name,
      created_at: epic.created_at.toISOString(),
      updated_at: epic.updated_at.toISOString(),
    };
  }

  /**
   * Update epic status
   */
  async updateEpicStatus(epicNumber: number, state: string): Promise<void> {
    logger.info('Updating epic status', { epic_number: epicNumber, state });

    await pool.query(
      'UPDATE epics SET state = $1, updated_at = NOW() WHERE epic_number = $2',
      [state, epicNumber]
    );
  }

  /**
   * Post evidence comment to issue
   */
  async postEvidenceComment(
    issueNumber: number,
    evidence: {
      traces: Array<{ url: string; operation: string }>;
      sessions: Array<{ url: string; duration: number }>;
      tests: { passed: number; total: number; coverage?: number };
      commits: Array<{ sha: string; message: string }>;
    }
  ): Promise<string> {
    logger.info('Posting evidence comment', { issue_number: issueNumber });

    const comment = this.formatEvidenceComment(evidence);
    const result = await this.client.createIssueComment(issueNumber, comment);

    logger.info('Evidence comment posted', {
      issue_number: issueNumber,
      comment_url: result.html_url,
    });

    return result.html_url;
  }

  /**
   * Format evidence as markdown comment
   */
  private formatEvidenceComment(evidence: {
    traces: Array<{ url: string; operation: string }>;
    sessions: Array<{ url: string; duration: number }>;
    tests: { passed: number; total: number; coverage?: number };
    commits: Array<{ sha: string; message: string }>;
  }): string {
    const sections: string[] = [];

    sections.push('## ✅ Task Complete - Evidence Attached\n');

    if (evidence.traces.length > 0) {
      sections.push('### 📊 Execution Traces');
      sections.push(
        evidence.traces.map((t) => `- [${t.operation}](${t.url})`).join('\n')
      );
      sections.push('');
    }

    if (evidence.sessions.length > 0) {
      sections.push('### 🎥 Session Replays');
      sections.push(
        evidence.sessions.map((s) => `- [Replay](${s.url}) (${s.duration}s)`).join('\n')
      );
      sections.push('');
    }

    if (evidence.tests) {
      sections.push('### ✓ Test Results');
      sections.push(`- **Tests:** ${evidence.tests.passed}/${evidence.tests.total} passed ✅`);
      if (evidence.tests.coverage !== undefined) {
        sections.push(`- **Coverage:** ${evidence.tests.coverage}%`);
      }
      sections.push('');
    }

    if (evidence.commits.length > 0) {
      sections.push('### 📝 Commits');
      sections.push(
        evidence.commits.map((c) => `- \`${c.sha.substring(0, 7)}\` - ${c.message}`).join('\n')
      );
      sections.push('');
    }

    sections.push('**Definition of Done:** ✅ Traceable, replayable, independently inspectable');
    sections.push('');
    sections.push('---');
    sections.push('🤖 Generated by Martha Development System');

    return sections.join('\n');
  }

  /**
   * Search issues
   */
  async searchIssues(query: string, limit: number = 20) {
    logger.debug('Searching issues', { query, limit });
    return await this.graphql.searchIssues(query, limit);
  }

  /**
   * Get issue details
   */
  async getIssue(issueNumber: number) {
    logger.debug('Getting issue details', { issue_number: issueNumber });
    return await this.client.getIssue(issueNumber);
  }

  /**
   * Update issue
   */
  async updateIssue(
    issueNumber: number,
    update: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
    }
  ) {
    logger.info('Updating issue', { issue_number: issueNumber, update });
    return await this.client.updateIssue(issueNumber, update);
  }

  /**
   * Get commits for an issue
   */
  async getCommitsForIssue(issueNumber: number) {
    logger.debug('Getting commits for issue', { issue_number: issueNumber });
    return await this.client.getCommitsForIssue(issueNumber);
  }
}

// Singleton instance
let issueTracker: IssueTracker | null = null;

export function getIssueTracker(): IssueTracker {
  if (!issueTracker) {
    issueTracker = new IssueTracker();
  }
  return issueTracker;
}
