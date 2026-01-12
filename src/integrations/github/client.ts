import { Octokit } from '@octokit/rest';
import { createLogger } from '../../utils/logger.js';
import { appConfig } from '../../config/index.js';

const logger = createLogger({ module: 'github-client' });

/**
 * GitHub API client using Octokit
 */
export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token?: string, repository?: string) {
    const githubToken = token || process.env.GITHUB_TOKEN;
    const githubRepo = repository || process.env.GITHUB_REPO || 'owner/repo';

    if (!githubToken) {
      logger.warn('GitHub token not configured. API requests may be rate-limited.');
    }

    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: `martha-dev/${appConfig.mcpServerVersion}`,
    });

    const [owner, repo] = githubRepo.split('/');
    this.owner = owner || 'owner';
    this.repo = repo || 'repo';

    logger.info('GitHub client initialized', {
      owner: this.owner,
      repo: this.repo,
      authenticated: !!githubToken,
    });
  }

  /**
   * Get repository information
   */
  async getRepository() {
    logger.debug('Fetching repository info');

    const { data } = await this.octokit.repos.get({
      owner: this.owner,
      repo: this.repo,
    });

    return data;
  }

  /**
   * Get an issue by number
   */
  async getIssue(issueNumber: number) {
    logger.debug('Fetching issue', { issue_number: issueNumber });

    const { data } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });

    return data;
  }

  /**
   * List issues with optional filters
   */
  async listIssues(options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    milestone?: number;
    assignee?: string;
    since?: string;
    per_page?: number;
    page?: number;
  }) {
    logger.debug('Listing issues', options);

    const { data } = await this.octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      ...options,
    });

    return data;
  }

  /**
   * Create a comment on an issue
   */
  async createIssueComment(issueNumber: number, body: string) {
    logger.info('Creating issue comment', { issue_number: issueNumber });

    const { data } = await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body,
    });

    return data;
  }

  /**
   * Update an issue
   */
  async updateIssue(
    issueNumber: number,
    update: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
      milestone?: number | null;
    }
  ) {
    logger.info('Updating issue', { issue_number: issueNumber, update });

    const { data } = await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      ...update,
    });

    return data;
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueNumber: number, labels: string[]) {
    logger.info('Adding labels to issue', { issue_number: issueNumber, labels });

    const { data } = await this.octokit.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels,
    });

    return data;
  }

  /**
   * Remove a label from an issue
   */
  async removeLabel(issueNumber: number, label: string) {
    logger.info('Removing label from issue', { issue_number: issueNumber, label });

    await this.octokit.issues.removeLabel({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      name: label,
    });
  }

  /**
   * Get commits for an issue (searches commit messages)
   */
  async getCommitsForIssue(issueNumber: number) {
    logger.debug('Fetching commits for issue', { issue_number: issueNumber });

    const { data } = await this.octokit.repos.listCommits({
      owner: this.owner,
      repo: this.repo,
    });

    // Filter commits that mention the issue number
    const issuePattern = new RegExp(`#${issueNumber}\\b`, 'i');
    const relatedCommits = data.filter((commit) =>
      issuePattern.test(commit.commit.message)
    );

    return relatedCommits;
  }

  /**
   * List pull requests
   */
  async listPullRequests(options?: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }) {
    logger.debug('Listing pull requests', options);

    const { data } = await this.octokit.pulls.list({
      owner: this.owner,
      repo: this.repo,
      ...options,
    });

    return data;
  }

  /**
   * Get a pull request by number
   */
  async getPullRequest(pullNumber: number) {
    logger.debug('Fetching pull request', { pull_number: pullNumber });

    const { data } = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: pullNumber,
    });

    return data;
  }

  /**
   * Create a pull request
   */
  async createPullRequest(options: {
    title: string;
    head: string;
    base: string;
    body?: string;
    draft?: boolean;
    maintainer_can_modify?: boolean;
  }) {
    logger.info('Creating pull request', { title: options.title, head: options.head });

    const { data } = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      ...options,
    });

    return data;
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    const { data } = await this.octokit.rateLimit.get();
    return data;
  }

  /**
   * Get the underlying Octokit instance for advanced usage
   */
  getOctokit() {
    return this.octokit;
  }

  /**
   * Get owner and repo
   */
  getRepoInfo() {
    return {
      owner: this.owner,
      repo: this.repo,
    };
  }
}

// Singleton instance
let githubClient: GitHubClient | null = null;

export function getGitHubClient(): GitHubClient {
  if (!githubClient) {
    githubClient = new GitHubClient();
  }
  return githubClient;
}
