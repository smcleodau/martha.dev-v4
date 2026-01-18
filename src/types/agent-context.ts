/**
 * Agent Context Types
 *
 * Comprehensive context structure for spawning Claude agents with full work context.
 * This context is serialized to JSON and provided to agents via file-based handoff.
 *
 * Flow:
 * 1. spawnAgent activity builds AgentContext
 * 2. Context written to /.martha/work/{agentId}/context.json
 * 3. Claude CLI spawned with context path as env var
 * 4. Agent reads context on startup
 * 5. Agent sends HTTP signals back to workflow
 */

/**
 * Complete agent context for issue work
 */
export interface AgentContext {
  // Agent identification
  agentId: string;
  workflowId: string;

  // Issue details
  issue: IssueContext;

  // Worktree configuration
  worktree: WorktreeContext;

  // Git configuration
  git: GitContext;

  // GitHub integration
  github: GitHubContext;

  // Work specification
  work: WorkSpecification;

  // Signal endpoints for workflow communication
  signals: SignalEndpoints;

  // Metadata
  metadata: ContextMetadata;
}

/**
 * Issue context
 */
export interface IssueContext {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  complexity: number;
  type: 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation';
  labels?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Worktree context
 */
export interface WorktreeContext {
  id: string;
  name: string;
  path: string;
  boardId: string;
  boardPath: string;
}

/**
 * Git context
 */
export interface GitContext {
  branch: string;
  baseBranch: string;
  repoPath: string;
  remote?: string;
  commitMessageTemplate?: string;
}

/**
 * GitHub context
 */
export interface GitHubContext {
  owner?: string;
  repo?: string;
  projectBoardId?: string;
  issueNumber?: number;
  enabled: boolean;
}

/**
 * Work specification
 */
export interface WorkSpecification {
  taskType: 'feature' | 'bugfix' | 'refactor' | 'test';
  technicalSpec?: string;
  relatedFiles: string[];
  testRequirements: string[];
  timeBudgetMinutes: number;
  dependencies?: string[];
  exitCriteria: string[];
}

/**
 * Signal endpoints for agent-to-workflow communication
 */
export interface SignalEndpoints {
  apiUrl: string;
  endpoints: {
    agentStarted: string;
    commitMade: string;
    agentCompleted: string;
    testResults: string;
    block: string;
  };
}

/**
 * Context metadata
 */
export interface ContextMetadata {
  createdAt: string;
  spawnedBy: string;
  contextVersion: string;
  workDirectory: string;
}

/**
 * Agent context builder helper
 */
export class AgentContextBuilder {
  private context: Partial<AgentContext> = {};

  withAgentId(agentId: string): this {
    this.context.agentId = agentId;
    return this;
  }

  withWorkflowId(workflowId: string): this {
    this.context.workflowId = workflowId;
    return this;
  }

  withIssue(issue: IssueContext): this {
    this.context.issue = issue;
    return this;
  }

  withWorktree(worktree: WorktreeContext): this {
    this.context.worktree = worktree;
    return this;
  }

  withGit(git: GitContext): this {
    this.context.git = git;
    return this;
  }

  withGitHub(github: GitHubContext): this {
    this.context.github = github;
    return this;
  }

  withWork(work: WorkSpecification): this {
    this.context.work = work;
    return this;
  }

  withSignals(signals: SignalEndpoints): this {
    this.context.signals = signals;
    return this;
  }

  withMetadata(metadata: ContextMetadata): this {
    this.context.metadata = metadata;
    return this;
  }

  build(): AgentContext {
    // Validate required fields
    if (!this.context.agentId) throw new Error('agentId is required');
    if (!this.context.workflowId) throw new Error('workflowId is required');
    if (!this.context.issue) throw new Error('issue is required');
    if (!this.context.worktree) throw new Error('worktree is required');
    if (!this.context.git) throw new Error('git is required');
    if (!this.context.github) throw new Error('github is required');
    if (!this.context.work) throw new Error('work is required');
    if (!this.context.signals) throw new Error('signals is required');
    if (!this.context.metadata) throw new Error('metadata is required');

    return this.context as AgentContext;
  }
}

/**
 * Helper to extract acceptance criteria from issue description
 */
export function extractAcceptanceCriteria(description: string): string[] {
  const criteria: string[] = [];

  // Look for acceptance criteria section
  const acMatch = description.match(
    /(?:acceptance criteria|success criteria|requirements?):?\s*([\s\S]*?)(?=\n#|\n\n|$)/i
  );

  if (acMatch) {
    const acSection = acMatch[1];

    // Extract bullet points or numbered items
    const items = acSection.match(/^[-*\d.]+\s+(.+)$/gm);
    if (items) {
      criteria.push(...items.map((item) => item.replace(/^[-*\d.]+\s+/, '').trim()));
    }
  }

  // If no criteria found, look for task checklist
  const checklistMatch = description.match(/^- \[[ x]\] (.+)$/gm);
  if (checklistMatch && criteria.length === 0) {
    criteria.push(...checklistMatch.map((item) => item.replace(/^- \[[ x]\] /, '').trim()));
  }

  return criteria;
}

/**
 * Helper to determine issue type from labels or title
 */
export function determineIssueType(
  title: string,
  labels?: string[]
): 'feature' | 'bugfix' | 'refactor' | 'test' | 'documentation' {
  const titleLower = title.toLowerCase();
  const allLabels = (labels || []).map((l) => l.toLowerCase());

  // Check labels first
  if (allLabels.includes('bug') || allLabels.includes('bugfix')) return 'bugfix';
  if (allLabels.includes('feature') || allLabels.includes('enhancement')) return 'feature';
  if (allLabels.includes('refactor') || allLabels.includes('refactoring')) return 'refactor';
  if (allLabels.includes('test') || allLabels.includes('testing')) return 'test';
  if (allLabels.includes('documentation') || allLabels.includes('docs')) return 'documentation';

  // Check title
  if (titleLower.includes('fix') || titleLower.includes('bug')) return 'bugfix';
  if (titleLower.includes('add') || titleLower.includes('implement')) return 'feature';
  if (titleLower.includes('refactor') || titleLower.includes('improve')) return 'refactor';
  if (titleLower.includes('test')) return 'test';
  if (titleLower.includes('document') || titleLower.includes('readme')) return 'documentation';

  // Default to feature
  return 'feature';
}
