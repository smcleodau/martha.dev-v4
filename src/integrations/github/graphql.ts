import { graphql } from '@octokit/graphql';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger({ module: 'github-graphql' });

/**
 * GitHub GraphQL client for epics and advanced queries
 */
export class GitHubGraphQL {
  private graphqlClient: typeof graphql;
  private owner: string;
  private repo: string;

  constructor(token?: string, repository?: string) {
    const githubToken = token || process.env.GITHUB_TOKEN;
    const githubRepo = repository || process.env.GITHUB_REPO || 'owner/repo';

    if (!githubToken) {
      throw new Error('GitHub token required for GraphQL queries');
    }

    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${githubToken}`,
      },
    });

    const [owner, repo] = githubRepo.split('/');
    this.owner = owner || 'owner';
    this.repo = repo || 'repo';

    logger.info('GitHub GraphQL client initialized', {
      owner: this.owner,
      repo: this.repo,
    });
  }

  /**
   * Fetch an epic (issue with sub-issues)
   */
  async fetchEpic(epicNumber: number) {
    logger.info('Fetching epic via GraphQL', { epic_number: epicNumber });

    const query = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
            number
            title
            body
            state
            createdAt
            updatedAt
            closedAt
            author {
              login
            }
            labels(first: 10) {
              nodes {
                name
                color
              }
            }
            assignees(first: 10) {
              nodes {
                login
                name
              }
            }
            milestone {
              title
              dueOn
              state
            }
            timelineItems(first: 100, itemTypes: [CROSS_REFERENCED_EVENT]) {
              nodes {
                ... on CrossReferencedEvent {
                  source {
                    ... on Issue {
                      number
                      title
                      state
                      labels(first: 5) {
                        nodes {
                          name
                        }
                      }
                      assignees(first: 5) {
                        nodes {
                          login
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await this.graphqlClient<{
      repository: {
        issue: {
          id: string;
          number: number;
          title: string;
          body: string;
          state: string;
          createdAt: string;
          updatedAt: string;
          closedAt: string | null;
          author: { login: string };
          labels: { nodes: Array<{ name: string; color: string }> };
          assignees: { nodes: Array<{ login: string; name: string | null }> };
          milestone: { title: string; dueOn: string | null; state: string } | null;
          timelineItems: {
            nodes: Array<{
              source?: {
                number: number;
                title: string;
                state: string;
                labels: { nodes: Array<{ name: string }> };
                assignees: { nodes: Array<{ login: string }> };
              };
            }>;
          };
        };
      };
    }>(query, {
      owner: this.owner,
      repo: this.repo,
      number: epicNumber,
    });

    const issue = result.repository.issue;

    // Extract sub-issues from timeline cross-references
    const subIssues =
      issue.timelineItems.nodes
        .map((node) => node.source)
        .filter((source) => source !== undefined)
        .map((source) => ({
          number: source!.number,
          title: source!.title,
          state: source!.state.toLowerCase(),
          labels: source!.labels.nodes.map((l) => l.name),
          assignees: source!.assignees.nodes.map((a) => a.login),
        })) || [];

    return {
      epic_number: issue.number,
      title: issue.title,
      description: issue.body,
      state: issue.state.toLowerCase(),
      created_at: issue.createdAt,
      updated_at: issue.updatedAt,
      closed_at: issue.closedAt,
      author: issue.author.login,
      labels: issue.labels.nodes.map((l) => l.name),
      assignees: issue.assignees.nodes.map((a) => a.login),
      milestone: issue.milestone
        ? {
            title: issue.milestone.title,
            due_on: issue.milestone.dueOn,
            state: issue.milestone.state.toLowerCase(),
          }
        : null,
      sub_issues: subIssues,
      completion_percentage:
        subIssues.length > 0
          ? Math.round(
              (subIssues.filter((s) => s.state === 'closed').length / subIssues.length) * 100
            )
          : 0,
    };
  }

  /**
   * Search issues by query
   */
  async searchIssues(searchQuery: string, first: number = 20) {
    logger.info('Searching issues', { query: searchQuery });

    const query = `
      query($query: String!, $first: Int!) {
        search(query: $query, type: ISSUE, first: $first) {
          nodes {
            ... on Issue {
              number
              title
              state
              createdAt
              updatedAt
              labels(first: 5) {
                nodes {
                  name
                }
              }
              assignees(first: 3) {
                nodes {
                  login
                }
              }
            }
          }
          issueCount
        }
      }
    `;

    const result = await this.graphqlClient<{
      search: {
        nodes: Array<{
          number: number;
          title: string;
          state: string;
          createdAt: string;
          updatedAt: string;
          labels: { nodes: Array<{ name: string }> };
          assignees: { nodes: Array<{ login: string }> };
        }>;
        issueCount: number;
      };
    }>(query, {
      query: `repo:${this.owner}/${this.repo} ${searchQuery}`,
      first,
    });

    return {
      issues: result.search.nodes.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state.toLowerCase(),
        created_at: issue.createdAt,
        updated_at: issue.updatedAt,
        labels: issue.labels.nodes.map((l) => l.name),
        assignees: issue.assignees.nodes.map((a) => a.login),
      })),
      total_count: result.search.issueCount,
    };
  }

  /**
   * Get project board information
   */
  async getProjectBoards() {
    logger.info('Fetching project boards');

    const query = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          projectsV2(first: 10) {
            nodes {
              id
              title
              shortDescription
              url
              closed
              number
            }
          }
        }
      }
    `;

    const result = await this.graphqlClient<{
      repository: {
        projectsV2: {
          nodes: Array<{
            id: string;
            title: string;
            shortDescription: string | null;
            url: string;
            closed: boolean;
            number: number;
          }>;
        };
      };
    }>(query, {
      owner: this.owner,
      repo: this.repo,
    });

    return result.repository.projectsV2.nodes;
  }
}

// Singleton instance
let graphqlClient: GitHubGraphQL | null = null;

export function getGitHubGraphQL(): GitHubGraphQL {
  if (!graphqlClient) {
    graphqlClient = new GitHubGraphQL();
  }
  return graphqlClient;
}
