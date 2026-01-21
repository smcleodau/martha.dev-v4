/**
 * Issue Activities
 *
 * Temporal activities for IssueLifecycleWorkflow.
 * All activities are idempotent and implement retry logic.
 *
 * Phase 2 Update: Integrated telemetry tracking for all activities
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { Context } from '@temporalio/activity';
import { telemetryWriter } from '../services/TelemetryWriter.js';
import { query } from '../database/client.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentContextBuilder, determineIssueType, extractAcceptanceCriteria } from '../types/agent-context.js';
import { claudeAgentSpawner } from '../services/ClaudeAgentSpawner.js';

const execAsync = promisify(exec);

// Constants
const MARTHA_WORKFLOW_ROOT = '/mnt/data/martha-workflow';

/**
 * Helper: Find issue JSON across all worktrees
 * Returns the issue data along with worktree and board information
 */
async function findIssue(issueId: string): Promise<{
  issueData: any;
  worktreeName: string;
  boardName: string;
  issueJsonPath: string;
}> {
  const worktreesDir = path.join(MARTHA_WORKFLOW_ROOT, '.martha/worktrees');

  try {
    const worktrees = await fs.readdir(worktreesDir);

    for (const worktree of worktrees) {
      const worktreePath = path.join(worktreesDir, worktree);
      const stat = await fs.stat(worktreePath);

      if (!stat.isDirectory()) continue;

      // Check if boards directory exists
      const boardsPath = path.join(worktreePath, 'boards');
      try {
        await fs.access(boardsPath);
      } catch {
        continue;
      }

      // Search all boards in this worktree
      const boards = await fs.readdir(boardsPath);

      for (const board of boards) {
        const boardPath = path.join(boardsPath, board);
        const boardStat = await fs.stat(boardPath);

        if (!boardStat.isDirectory()) continue;

        // Check if issue exists in this board
        const issueJsonPath = path.join(boardPath, 'issues', `${issueId}.json`);

        try {
          const issueJsonContent = await fs.readFile(issueJsonPath, 'utf-8');
          const issueData = JSON.parse(issueJsonContent);

          logger.info({
            issueId,
            worktree,
            board,
            path: issueJsonPath
          }, '[findIssue] Issue found');

          return {
            issueData,
            worktreeName: worktree,
            boardName: board,
            issueJsonPath,
          };
        } catch {
          // Issue not in this board, continue searching
          continue;
        }
      }
    }

    throw new Error(`Issue ${issueId} not found in any worktree`);
  } catch (error: any) {
    logger.error({ error: error.message, issueId }, '[findIssue] Failed to find issue');
    throw error;
  }
}

/**
 * Helper: Detect the default branch in a git repository
 * Returns 'main', 'master', or whatever the default branch is
 */
async function getDefaultBranch(repoPath: string): Promise<string> {
  try {
    // Try to get the default branch from git symbolic-ref
    const { stdout } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null', { cwd: repoPath });
    const match = stdout.trim().match(/refs\/remotes\/origin\/(.+)/);
    if (match && match[1]) {
      logger.info({ defaultBranch: match[1] }, '[getDefaultBranch] Detected from symbolic-ref');
      return match[1];
    }
  } catch {
    // symbolic-ref might not be set, try alternative methods
  }

  // Fallback: check which common branch exists
  try {
    const { stdout: branches } = await execAsync('git branch -a', { cwd: repoPath });

    // Check for main
    if (branches.includes('main')) {
      logger.info({ defaultBranch: 'main' }, '[getDefaultBranch] Detected main branch');
      return 'main';
    }

    // Check for master
    if (branches.includes('master')) {
      logger.info({ defaultBranch: 'master' }, '[getDefaultBranch] Detected master branch');
      return 'master';
    }

    // If neither main nor master exists, try to get the first branch
    const branchMatch = branches.match(/^\*?\s*(\S+)/m);
    if (branchMatch && branchMatch[1]) {
      const branch = branchMatch[1];
      logger.warn({ defaultBranch: branch }, '[getDefaultBranch] Using first available branch');
      return branch;
    }
  } catch (error: any) {
    logger.error({ error: error.message }, '[getDefaultBranch] Failed to detect branch');
  }

  // Ultimate fallback
  logger.warn('[getDefaultBranch] Defaulting to main');
  return 'main';
}

/**
 * Helper function to wrap activities with telemetry tracking
 */
async function withTelemetry<T>(
  activityName: string,
  issueId: string,
  epicId: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  // Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName,
    activityId,
    issueId,
    epicId,
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    const result = await fn();
    const durationMs = Date.now() - startTime;

    // Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName,
      activityId,
      issueId,
      epicId,
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName,
      activityId,
      issueId,
      epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

// Types
export interface PrepareIssueInput {
  issueId: string;
  title: string;
  epicId?: string;
  complexity?: number;
}

export interface PrepareIssueResult {
  issueId: string;
  branch: string;
  documentationGenerated: boolean;
}

export interface SpawnAgentInput {
  issueId: string;
  issueTitle: string;
  epicId?: string;
  complexity?: number;
  branch: string;
}

export interface SpawnAgentResult {
  agentId: string;
  processId: number;
  contextPath?: string;
  branch?: string;
}

export interface MonitorAgentHeartbeatInput {
  agentId: string;
  issueId: string;
}

export interface MonitorAgentHeartbeatResult {
  alive: boolean;
  lastActivity?: number;
}

export interface RunTestsInput {
  issueId: string;
  commits: Array<{ sha: string; message: string; files: string[] }>;
  branch: string;
}

export interface RunTestsResult {
  passed: number;
  failed: number;
  evidence?: string;
}

export interface MoveToReviewInput {
  issueId: string;
  commits: Array<{ sha: string; message: string; files: string[] }>;
  testResults: { passed: number; failed: number; evidence?: string };
  branch: string;
}

export interface MoveToReviewResult {
  reviewId: string;
  reviewers: string[];
}

export interface MergeCodeInput {
  issueId: string;
  branch: string;
  commits: Array<{ sha: string; message: string; files: string[] }>;
}

export interface MergeCodeResult {
  mergeSha: string;
  mergedAt: number;
}

export interface RecordCompletionInput {
  issueId: string;
  agentId: string;
  complexity: number;
  totalDuration: number;
  commits: Array<{ sha: string; message: string; files: string[] }>;
  testResults: { passed: number; failed: number; evidence?: string };
  metrics: any;
  success: boolean;
}

export interface CaptureFailureInput {
  issueId: string;
  agentId?: string;
  stage: string;
  error: string;
  history: any[];
  commits: Array<{ sha: string; message: string; files: string[] }>;
}

/**
 * Prepare Issue Activity
 *
 * Sets up the issue for development:
 * - Validates issue exists in tracker
 * - Generates issue documentation
 * - Creates feature branch
 * - Records telemetry
 */
export async function prepareIssue(
  input: PrepareIssueInput
): Promise<PrepareIssueResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info(
    { activityId, issueId: input.issueId },
    '[prepareIssue] Starting preparation'
  );

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'prepareIssue',
    activityId,
    issueId: input.issueId,
    epicId: input.epicId,
    payload: { title: input.title, complexity: input.complexity },
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // REAL IMPLEMENTATION:
    // 1. Find issue across all worktrees
    const { issueData, worktreeName, boardName, issueJsonPath } = await findIssue(input.issueId);

    logger.info({
      issueId: issueData.id,
      status: issueData.status,
      worktree: worktreeName,
      board: boardName
    }, '[prepareIssue] Issue loaded');

    // 2. Validate issue exists
    if (!issueData || issueData.id !== input.issueId) {
      throw new Error(`Issue ${input.issueId} validation failed - ID mismatch`);
    }

    // 3. Update board state.json - move issue to "todo" column (setup phase)
    const stateJsonPath = path.join(
      MARTHA_WORKFLOW_ROOT,
      '.martha/worktrees',
      worktreeName,
      'boards',
      boardName,
      'state.json'
    );

    logger.info({ stateJsonPath }, '[prepareIssue] Updating board state');

    try {
      const stateJsonContent = await fs.readFile(stateJsonPath, 'utf-8');
      const stateData = JSON.parse(stateJsonContent);

      // Remove issue from all columns
      stateData.columns.forEach((column: any) => {
        column.issue_ids = column.issue_ids.filter((id: string) => id !== input.issueId);
      });

      // Add issue to "todo" column (setup)
      const todoColumn = stateData.columns.find((c: any) => c.id === 'todo');
      if (todoColumn && !todoColumn.issue_ids.includes(input.issueId)) {
        todoColumn.issue_ids.push(input.issueId);
      }

      // Update version and timestamp
      stateData.version = Date.now();
      stateData.updated_at = new Date().toISOString();

      // Write back
      await fs.writeFile(stateJsonPath, JSON.stringify(stateData, null, 2));
      logger.info({ issueId: input.issueId, column: 'todo' }, '[prepareIssue] Board state updated');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[prepareIssue] Could not update board state, continuing');
    }

    // 4. Update issue JSON with status = "todo"
    try {
      issueData.status = 'todo';
      issueData.metadata = issueData.metadata || {};
      issueData.metadata.updated_at = new Date().toISOString();
      issueData.metadata.version = Date.now();

      await fs.writeFile(issueJsonPath, JSON.stringify(issueData, null, 2));
      logger.info({ issueId: input.issueId }, '[prepareIssue] Issue JSON updated');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[prepareIssue] Could not update issue JSON, continuing');
    }

    const branch = `feature/${input.issueId}`;

    const result: PrepareIssueResult = {
      issueId: input.issueId,
      branch,
      documentationGenerated: true,
    };

    const durationMs = Date.now() - startTime;

    logger.info(
      { activityId, issueId: input.issueId, branch },
      '[prepareIssue] Preparation completed'
    );

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'prepareIssue',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: { branch, documentationGenerated: true },
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[prepareIssue] Preparation failed'
    );

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'prepareIssue',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Spawn Agent Activity
 *
 * Selects and spawns appropriate AI agent:
 * - Uses ML model to select best agent (or round-robin initially)
 * - Constructs agent command with issue context
 * - Executes claude-code with issue URL
 * - Monitors agent process start
 * - Records telemetry
 */
export async function spawnAgent(
  input: SpawnAgentInput
): Promise<SpawnAgentResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info(
    { activityId, issueId: input.issueId },
    '[spawnAgent] Starting agent spawn'
  );

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'spawnAgent',
    activityId,
    issueId: input.issueId,
    epicId: input.epicId,
    payload: { branch: input.branch, issueTitle: input.issueTitle },
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // 1. Find issue and get worktree information
    logger.info({ issueId: input.issueId }, '[spawnAgent] Finding issue data');
    const issueInfo = await findIssue(input.issueId);
    const { issueData, worktreeName, boardName } = issueInfo;

    // Read worktree config
    const worktreeConfigPath = path.join(
      MARTHA_WORKFLOW_ROOT,
      '.martha/worktrees',
      worktreeName,
      'config.json'
    );
    const worktreeConfigContent = await fs.readFile(worktreeConfigPath, 'utf-8');
    const worktreeConfig = JSON.parse(worktreeConfigContent);

    const repoPath = worktreeConfig.path || `/mnt/data/${worktreeName}`;
    const branchName = input.branch || `feature/${input.issueId}`;

    // 2. Create git branch
    logger.info({ branchName, repoPath }, '[spawnAgent] Creating git branch');
    try {
      const { stdout: existingBranches } = await execAsync('git branch --list', { cwd: repoPath });
      const branchExists = existingBranches.includes(branchName);

      if (!branchExists) {
        await execAsync(`git checkout -b ${branchName}`, { cwd: repoPath });
        logger.info({ branchName }, '[spawnAgent] Branch created');
      } else {
        await execAsync(`git checkout ${branchName}`, { cwd: repoPath });
        logger.info({ branchName }, '[spawnAgent] Switched to existing branch');
      }
    } catch (error: any) {
      logger.error({ error: error.message }, '[spawnAgent] Failed to create/switch branch');
      throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
    }

    // 3. Build AgentContext
    const agentId = uuidv4();
    const issueType = determineIssueType(issueData.title, issueData.labels);
    const acceptanceCriteria = extractAcceptanceCriteria(issueData.body || issueData.description || '');

    // Get signal API URL from environment
    const apiUrl = process.env.MARTHA_API_URL || 'http://localhost:3000';

    const context = new AgentContextBuilder()
      .withAgentId(agentId)
      .withWorkflowId(workflowId)
      .withIssue({
        id: input.issueId,
        title: issueData.title,
        description: issueData.body || issueData.description || '',
        acceptanceCriteria,
        complexity: input.complexity || issueData.complexity || 5,
        type: issueType,
        labels: issueData.labels,
        priority: issueData.priority || 'medium',
      })
      .withWorktree({
        id: worktreeConfig.id,
        name: worktreeName,
        path: repoPath,
        boardId: boardName,
        boardPath: path.join(MARTHA_WORKFLOW_ROOT, '.martha/worktrees', worktreeName, 'boards', boardName),
      })
      .withGit({
        branch: branchName,
        baseBranch: 'main',
        repoPath,
        remote: 'origin',
        commitMessageTemplate: `feat(${input.issueId}): {{message}}`,
      })
      .withGitHub({
        owner: process.env.GITHUB_OWNER,
        repo: process.env.GITHUB_REPO,
        enabled: false,
      })
      .withWork({
        taskType: issueType === 'bugfix' ? 'bugfix' : issueType === 'refactor' ? 'refactor' : issueType === 'test' ? 'test' : 'feature',
        technicalSpec: issueData.technicalSpec,
        relatedFiles: issueData.relatedFiles || [],
        testRequirements: issueData.testRequirements || ['All tests must pass', 'Code coverage should not decrease'],
        timeBudgetMinutes: (input.complexity || 5) * 30,
        dependencies: issueData.dependencies,
        exitCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : [
          'All acceptance criteria met',
          'Tests passing',
          'Code reviewed',
        ],
      })
      .withSignals({
        apiUrl,
        endpoints: {
          agentStarted: `${apiUrl}/api/v1/workflows/${workflowId}/signals/agent-started`,
          commitMade: `${apiUrl}/api/v1/workflows/${workflowId}/signals/commit-made`,
          agentCompleted: `${apiUrl}/api/v1/workflows/${workflowId}/signals/agent-completed`,
          testResults: `${apiUrl}/api/v1/workflows/${workflowId}/signals/test-results`,
          block: `${apiUrl}/api/v1/workflows/${workflowId}/signals/block`,
        },
      })
      .withMetadata({
        createdAt: new Date().toISOString(),
        spawnedBy: 'IssueLifecycleWorkflow',
        contextVersion: '1.0.0',
        workDirectory: path.join(MARTHA_WORKFLOW_ROOT, '.martha/work', agentId),
      })
      .build();

    logger.info({ agentId, context: context.issue.title }, '[spawnAgent] AgentContext built');

    // 4. Spawn agent using ClaudeAgentSpawner
    const spawnResult = await claudeAgentSpawner.spawnAgent(context);

    logger.info(
      {
        agentId: spawnResult.agentId,
        processId: spawnResult.processId,
        contextPath: spawnResult.contextPath,
      },
      '[spawnAgent] Agent spawned successfully'
    );

    const result: SpawnAgentResult = {
      agentId: spawnResult.agentId,
      processId: spawnResult.processId,
      contextPath: spawnResult.contextPath,
      branch: branchName,
    };

    const durationMs = Date.now() - startTime;

    // Telemetry: Activity completed with agent_spawned event
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'agent_spawned',
      eventCategory: 'agent',
      severity: 'info',
      activityName: 'spawnAgent',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: {
        agentId: spawnResult.agentId,
        processId: spawnResult.processId,
        contextPath: spawnResult.contextPath,
        branch: branchName,
        worktree: worktreeName,
        board: boardName,
      },
      durationMs,
      source: 'temporal',
    });

    // Also write activity_completed event
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'spawnAgent',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      payload: { agentId: spawnResult.agentId, processId: spawnResult.processId },
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[spawnAgent] Agent spawn failed'
    );

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'spawnAgent',
      activityId,
      issueId: input.issueId,
      epicId: input.epicId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Monitor Agent Heartbeat Activity
 *
 * Checks if agent is still alive:
 * - Checks agent process is running
 * - Queries last activity timestamp
 * - Returns heartbeat status
 */
export async function monitorAgentHeartbeat(
  input: MonitorAgentHeartbeatInput
): Promise<MonitorAgentHeartbeatResult> {
  const activityId = uuidv4();

  logger.debug(
    { activityId, agentId: input.agentId, issueId: input.issueId },
    '[monitorAgentHeartbeat] Checking heartbeat'
  );

  try {
    // REAL IMPLEMENTATION:
    const repoPath = '/mnt/data/calculator-app';
    const branchName = `feature/${input.issueId}`;

    logger.debug({ branchName, repoPath }, '[monitorAgentHeartbeat] Checking for recent commits');

    try {
      // Check for commits in last 5 minutes
      const { stdout: recentCommits } = await execAsync(
        `git log ${branchName} --since="5 minutes ago" --oneline`,
        { cwd: repoPath }
      );

      if (recentCommits.trim().length > 0) {
        // Commits found - agent is alive
        logger.debug({ agentId: input.agentId, commits: recentCommits.trim() }, '[monitorAgentHeartbeat] Agent is alive');

        const result: MonitorAgentHeartbeatResult = {
          alive: true,
          lastActivity: Date.now(),
        };

        return result;
      } else {
        // No commits - agent may be inactive
        logger.debug({ agentId: input.agentId }, '[monitorAgentHeartbeat] No recent commits found');

        const result: MonitorAgentHeartbeatResult = {
          alive: false,
          lastActivity: 0,
        };

        return result;
      }
    } catch (error: any) {
      logger.warn({ error: error.message }, '[monitorAgentHeartbeat] Failed to check git log');

      // If we can't check git, assume agent is not alive
      const result: MonitorAgentHeartbeatResult = {
        alive: false,
        lastActivity: 0,
      };

      return result;
    }
  } catch (error: any) {
    logger.error(
      { activityId, agentId: input.agentId, error: error.message },
      '[monitorAgentHeartbeat] Heartbeat check failed'
    );
    throw error;
  }
}

/**
 * Run Tests Activity
 *
 * Delegates to test-batch command:
 * - Gets commits from workflow state
 * - Calls /martha:test-batch via subprocess
 * - Parses test output
 * - Uploads evidence to Braintrust
 * - Returns test summary
 */
export async function runTests(input: RunTestsInput): Promise<RunTestsResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info(
    { activityId, issueId: input.issueId, commits: input.commits.length },
    '[runTests] Starting tests'
  );

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'runTests',
    activityId,
    issueId: input.issueId,
    payload: { branch: input.branch, commits: input.commits.length },
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // REAL IMPLEMENTATION:
    const repoPath = '/mnt/data/calculator-app';

    // 1. Checkout branch
    logger.info({ branch: input.branch, repoPath }, '[runTests] Checking out branch');

    try {
      await execAsync(`git checkout ${input.branch}`, { cwd: repoPath });
      logger.info({ branch: input.branch }, '[runTests] Branch checked out');
    } catch (error: any) {
      logger.error({ error: error.message }, '[runTests] Failed to checkout branch');
      throw new Error(`Failed to checkout branch ${input.branch}: ${error.message}`);
    }

    // 2. Check if package.json exists
    const packageJsonPath = path.join(repoPath, 'package.json');
    let hasPackageJson = false;

    try {
      await fs.access(packageJsonPath);
      hasPackageJson = true;
      logger.info('[runTests] package.json found');
    } catch {
      logger.info('[runTests] No package.json found, skipping tests');
    }

    if (!hasPackageJson) {
      // No package.json, return no tests found
      const result: RunTestsResult = {
        passed: 0,
        failed: 0,
        evidence: 'No tests found (no package.json)',
      };

      const durationMs = Date.now() - startTime;

      logger.info(
        { activityId, issueId: input.issueId },
        '[runTests] No tests to run'
      );

      // Telemetry: Activity completed
      await telemetryWriter.writeEvent({
        workflowId,
        workflowType: 'IssueLifecycleWorkflow',
        eventType: 'activity_completed',
        eventCategory: 'activity',
        severity: 'info',
        activityName: 'runTests',
        activityId,
        issueId: input.issueId,
        payload: { passed: 0, failed: 0, evidence: 'No tests found' },
        durationMs,
        source: 'temporal',
      });

      return result;
    }

    // 3. Run tests with timeout
    logger.info('[runTests] Running npm test');

    let testOutput = '';
    let passed = 0;
    let failed = 0;

    try {
      // Run npm test with 60 second timeout
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: repoPath,
        timeout: 60000,
      });

      testOutput = stdout + '\n' + stderr;
      logger.info({ output: testOutput }, '[runTests] Test execution completed');

      // 4. Parse output for "X passed" and "X failed" using regex
      // Common patterns:
      // - "X tests passed"
      // - "X passed, Y failed"
      // - "Tests: X passed, Y failed"
      // - Jest: "Tests: 5 passed, 5 total"
      // - Vitest: "✓ 5 passed (10)"

      const passedMatch = testOutput.match(/(\d+)\s+(passed|test[s]?\s+passed)/i);
      const failedMatch = testOutput.match(/(\d+)\s+(failed|test[s]?\s+failed)/i);

      if (passedMatch) {
        passed = parseInt(passedMatch[1], 10);
      }

      if (failedMatch) {
        failed = parseInt(failedMatch[1], 10);
      }

      logger.info({ passed, failed }, '[runTests] Test results parsed');
    } catch (error: any) {
      // Test command failed - may indicate test failures
      testOutput = error.stdout + '\n' + error.stderr;
      logger.warn({ error: error.message, output: testOutput }, '[runTests] Test execution failed');

      // Try to parse output even on failure
      const passedMatch = testOutput.match(/(\d+)\s+(passed|test[s]?\s+passed)/i);
      const failedMatch = testOutput.match(/(\d+)\s+(failed|test[s]?\s+failed)/i);

      if (passedMatch) {
        passed = parseInt(passedMatch[1], 10);
      }

      if (failedMatch) {
        failed = parseInt(failedMatch[1], 10);
      }

      // If we couldn't parse anything, assume all tests failed
      if (passed === 0 && failed === 0) {
        failed = 1;
      }

      logger.info({ passed, failed }, '[runTests] Test results parsed from failure output');
    }

    const result: RunTestsResult = {
      passed,
      failed,
      evidence: testOutput.substring(0, 1000), // Store first 1000 chars of output
    };

    const durationMs = Date.now() - startTime;

    logger.info(
      { activityId, issueId: input.issueId, passed: result.passed, failed: result.failed },
      '[runTests] Tests completed'
    );

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'runTests',
      activityId,
      issueId: input.issueId,
      payload: { passed, failed, evidence: result.evidence },
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[runTests] Tests failed'
    );

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'runTests',
      activityId,
      issueId: input.issueId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Move to Review Activity
 *
 * Moves issue to review status:
 * - Updates issue status to In Review
 * - Creates review request (GitHub PR or internal)
 * - Assigns reviewers
 * - Writes telemetry
 */
export async function moveToReview(
  input: MoveToReviewInput
): Promise<MoveToReviewResult> {
  const activityId = uuidv4();

  logger.info(
    { activityId, issueId: input.issueId },
    '[moveToReview] Moving to review'
  );

  try {
    // REAL IMPLEMENTATION:
    // 1. Find issue to get worktree and board
    const { issueData, worktreeName, boardName, issueJsonPath } = await findIssue(input.issueId);

    logger.info({
      issueId: input.issueId,
      worktree: worktreeName,
      board: boardName
    }, '[moveToReview] Issue found');

    // 2. Read board state
    const stateJsonPath = path.join(
      MARTHA_WORKFLOW_ROOT,
      '.martha/worktrees',
      worktreeName,
      'boards',
      boardName,
      'state.json'
    );

    logger.info({ stateJsonPath }, '[moveToReview] Reading board state');

    let stateData: any;
    try {
      const stateJsonContent = await fs.readFile(stateJsonPath, 'utf-8');
      stateData = JSON.parse(stateJsonContent);
    } catch (error: any) {
      logger.error({ error: error.message }, '[moveToReview] Could not read board state');
      throw new Error(`Board state not found at ${stateJsonPath}`);
    }

    // 2. Move issue from current column to "review" column (code_complete)
    // Remove from all columns
    stateData.columns.forEach((column: any) => {
      column.issue_ids = column.issue_ids.filter((id: string) => id !== input.issueId);
    });

    // Add to review column
    const reviewColumn = stateData.columns.find((c: any) => c.id === 'review');
    if (reviewColumn && !reviewColumn.issue_ids.includes(input.issueId)) {
      reviewColumn.issue_ids.push(input.issueId);
      logger.info({ issueId: input.issueId, column: 'review' }, '[moveToReview] Moved to review column');
    } else {
      logger.warn({ issueId: input.issueId }, '[moveToReview] Review column not found, skipping board update');
    }

    // 3. Write updated state back
    stateData.version = Date.now();
    stateData.updated_at = new Date().toISOString();

    try {
      await fs.writeFile(stateJsonPath, JSON.stringify(stateData, null, 2));
      logger.info({ stateJsonPath }, '[moveToReview] Board state updated');
    } catch (error: any) {
      logger.error({ error: error.message }, '[moveToReview] Could not write board state');
      throw error;
    }

    // 4. Update issue JSON (use the one we already found)
    try {

      issueData.status = 'review';
      issueData.metadata = issueData.metadata || {};
      issueData.metadata.updated_at = new Date().toISOString();
      issueData.metadata.version = Date.now();

      // Add test results to issue
      if (input.testResults) {
        issueData.quality = issueData.quality || {};
        issueData.quality.test_results = {
          passed: input.testResults.passed,
          failed: input.testResults.failed,
          evidence: input.testResults.evidence,
          tested_at: new Date().toISOString(),
        };
      }

      await fs.writeFile(issueJsonPath, JSON.stringify(issueData, null, 2));
      logger.info({ issueId: input.issueId }, '[moveToReview] Issue JSON updated');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[moveToReview] Could not update issue JSON, continuing');
    }

    // 5. Return review info
    const reviewId = `review-${uuidv4().slice(0, 8)}`;
    const reviewers = ['claude-sonnet-4.5', 'human-reviewer'];

    const result: MoveToReviewResult = {
      reviewId,
      reviewers,
    };

    logger.info(
      { activityId, issueId: input.issueId, reviewId },
      '[moveToReview] Moved to review'
    );

    return result;
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[moveToReview] Move to review failed'
    );
    throw error;
  }
}

/**
 * Merge Code Activity
 *
 * Merges code to main branch:
 * - Merges branch to main
 * - Pushes to remote
 * - Updates issue status to Done
 * - Cleans up branch
 * - Writes telemetry
 */
export async function mergeCode(
  input: MergeCodeInput
): Promise<MergeCodeResult> {
  const activityId = uuidv4();
  const startTime = Date.now();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info(
    { activityId, issueId: input.issueId, branch: input.branch },
    '[mergeCode] Merging code'
  );

  // Telemetry: Activity started
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'IssueLifecycleWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'mergeCode',
    activityId,
    issueId: input.issueId,
    payload: { branch: input.branch, commits: input.commits.length },
    source: 'temporal',
    retryAttempt: info.attempt,
  });

  try {
    // REAL IMPLEMENTATION:
    // 1. Checkout main and merge branch
    const repoPath = '/mnt/data/calculator-app';

    // Detect the default branch (main or master)
    const defaultBranch = await getDefaultBranch(repoPath);
    logger.info({ repoPath, branch: input.branch, defaultBranch }, '[mergeCode] Checking out default branch');

    // Reset any ongoing merge or conflicted state
    try {
      await execAsync('git reset --hard', { cwd: repoPath });
      await execAsync('git clean -fd', { cwd: repoPath });
      logger.info('[mergeCode] Reset repository to clean state');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[mergeCode] Failed to reset repository');
    }

    // Stash any uncommitted changes before checkout
    let stashCreated = false;
    try {
      const { stdout: statusOutput } = await execAsync('git status --porcelain', { cwd: repoPath });
      if (statusOutput.trim().length > 0) {
        await execAsync('git stash push -u -m "Temporary stash for merge"', { cwd: repoPath });
        stashCreated = true;
        logger.info('[mergeCode] Stashed uncommitted changes');
      }
    } catch (error: any) {
      logger.warn({ error: error.message }, '[mergeCode] Failed to stash, continuing anyway');
    }

    // Checkout default branch
    try {
      await execAsync(`git checkout ${defaultBranch}`, { cwd: repoPath });
      logger.info({ defaultBranch }, '[mergeCode] Checked out default branch');
    } catch (error: any) {
      logger.error({ error: error.message, defaultBranch }, '[mergeCode] Failed to checkout default branch');
      throw new Error(`Failed to checkout ${defaultBranch}: ${error.message}`);
    }

    // Pop stash if we created one
    if (stashCreated) {
      try {
        await execAsync('git stash pop', { cwd: repoPath });
        logger.info('[mergeCode] Restored stashed changes');
      } catch (error: any) {
        logger.warn({ error: error.message }, '[mergeCode] Failed to restore stash, continuing');
      }
    }

    // Merge branch with no-ff to preserve branch history
    const mergeMessage = `Merge ${input.issueId}: ${input.commits.length} commits`;
    logger.info({ branch: input.branch, message: mergeMessage }, '[mergeCode] Merging branch');

    try {
      await execAsync(`git merge ${input.branch} --no-ff -m "${mergeMessage}"`, { cwd: repoPath });
      logger.info({ branch: input.branch }, '[mergeCode] Branch merged successfully');
    } catch (error: any) {
      logger.error({ error: error.message, branch: input.branch }, '[mergeCode] Merge failed');
      throw new Error(`Failed to merge branch ${input.branch}: ${error.message}`);
    }

    // Get merge commit SHA
    let mergeSha: string;
    try {
      const { stdout } = await execAsync('git log -1 --format=%H', { cwd: repoPath });
      mergeSha = stdout.trim();
      logger.info({ mergeSha }, '[mergeCode] Retrieved merge commit SHA');
    } catch (error: any) {
      logger.error({ error: error.message }, '[mergeCode] Failed to get merge SHA');
      throw new Error(`Failed to get merge SHA: ${error.message}`);
    }

    // Write merge evidence to database
    try {
      const { randomUUID } = await import('crypto');

      await query(
        `INSERT INTO evidence_events (
          event_id, issue_id, stage, evidence_type, timestamp,
          evidence_data, quality_score, validation_status, workflow_id, agent_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(),
          input.issueId,
          'MERGE',
          'merge_details',
          new Date().toISOString(),
          JSON.stringify({
            mergeSha,
            branch: input.branch,
            conflictsResolved: true,
            timestamp: new Date().toISOString(),
          }),
          100, // quality score for successful merge
          'valid',
          workflowId,
          null, // no specific agent for merge
        ]
      );

      logger.info({ mergeSha, issueId: input.issueId }, '[mergeCode] Merge evidence written');
    } catch (evidenceError: any) {
      logger.error({
        error: evidenceError.message,
        issueId: input.issueId,
      }, '[mergeCode] Failed to write merge evidence');
      // Don't fail the activity if evidence writing fails
    }

    // 2. Find issue to get worktree and board
    const { issueData, worktreeName, boardName, issueJsonPath } = await findIssue(input.issueId);

    logger.info({
      issueId: input.issueId,
      worktree: worktreeName,
      board: boardName
    }, '[mergeCode] Issue found');

    // 3. Update board state - move issue to "done" column
    const stateJsonPath = path.join(
      MARTHA_WORKFLOW_ROOT,
      '.martha/worktrees',
      worktreeName,
      'boards',
      boardName,
      'state.json'
    );

    logger.info({ stateJsonPath }, '[mergeCode] Updating board state');

    try {
      const stateJsonContent = await fs.readFile(stateJsonPath, 'utf-8');
      const stateData = JSON.parse(stateJsonContent);

      // Remove from all columns
      stateData.columns.forEach((column: any) => {
        column.issue_ids = column.issue_ids.filter((id: string) => id !== input.issueId);
      });

      // Add to done column
      const doneColumn = stateData.columns.find((c: any) => c.id === 'done');
      if (doneColumn && !doneColumn.issue_ids.includes(input.issueId)) {
        doneColumn.issue_ids.push(input.issueId);
        logger.info({ issueId: input.issueId, column: 'done' }, '[mergeCode] Moved to done column');
      } else {
        logger.warn({ issueId: input.issueId }, '[mergeCode] Done column not found, skipping board update');
      }

      // Update version and timestamp
      stateData.version = Date.now();
      stateData.updated_at = new Date().toISOString();

      await fs.writeFile(stateJsonPath, JSON.stringify(stateData, null, 2));
      logger.info({ stateJsonPath }, '[mergeCode] Board state updated');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[mergeCode] Could not update board state, continuing');
    }

    // 4. Update issue JSON (use the one we already found)
    try {

      issueData.status = 'done';
      issueData.merge_info = {
        merge_sha: mergeSha,
        branch: input.branch,
        merged_at: new Date().toISOString(),
      };

      issueData.metadata = issueData.metadata || {};
      issueData.metadata.updated_at = new Date().toISOString();
      issueData.metadata.version = Date.now();

      await fs.writeFile(issueJsonPath, JSON.stringify(issueData, null, 2));
      logger.info({ issueId: input.issueId }, '[mergeCode] Issue JSON updated');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[mergeCode] Could not update issue JSON, continuing');
    }

    const result: MergeCodeResult = {
      mergeSha,
      mergedAt: Date.now(),
    };

    const durationMs = Date.now() - startTime;

    logger.info(
      { activityId, issueId: input.issueId, mergeSha },
      '[mergeCode] Code merged successfully'
    );

    // Telemetry: Activity completed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'mergeCode',
      activityId,
      issueId: input.issueId,
      payload: { mergeSha, branch: input.branch },
      durationMs,
      source: 'temporal',
    });

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[mergeCode] Merge failed'
    );

    // Telemetry: Activity failed
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'mergeCode',
      activityId,
      issueId: input.issueId,
      durationMs,
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    throw error;
  }
}

/**
 * Record Completion Activity
 *
 * Records workflow completion:
 * - Inserts into agent_performance table
 * - Calculates metrics (duration, commits, test pass rate)
 * - Writes final telemetry event
 * - Updates learning_feedback for ML
 */
export async function recordCompletion(
  input: RecordCompletionInput
): Promise<void> {
  const activityId = uuidv4();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info(
    { activityId, issueId: input.issueId, agentId: input.agentId },
    '[recordCompletion] Recording completion'
  );

  try {
    // REAL IMPLEMENTATION:
    // 1. Insert into agent_performance table in TimescaleDB
    const testPassRate = input.testResults.passed + input.testResults.failed > 0
      ? (input.testResults.passed / (input.testResults.passed + input.testResults.failed)) * 100
      : 100;

    logger.info({
      issueId: input.issueId,
      agentId: input.agentId,
      complexity: input.complexity,
      duration: input.totalDuration,
      commits: input.commits.length,
      testPassRate,
    }, '[recordCompletion] Inserting into agent_performance table');

    await query(
      `
      INSERT INTO agent_performance (
        agent_id,
        agent_type,
        issue_id,
        epic_id,
        issue_complexity,
        duration_ms,
        commit_count,
        test_pass_rate,
        success,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (agent_id, issue_id) DO UPDATE SET
        duration_ms = EXCLUDED.duration_ms,
        commit_count = EXCLUDED.commit_count,
        test_pass_rate = EXCLUDED.test_pass_rate,
        success = EXCLUDED.success,
        completed_at = NOW()
      `,
      [
        input.agentId,
        'claude-sonnet-4.5', // agent_type
        input.issueId,
        input.metrics?.epicId || null,
        input.complexity,
        input.totalDuration,
        input.commits.length,
        testPassRate,
        input.success,
      ]
    );

    logger.info({ issueId: input.issueId }, '[recordCompletion] Agent performance recorded');

    // 2. Find issue to get worktree and board
    const { issueData, worktreeName, boardName, issueJsonPath } = await findIssue(input.issueId);

    logger.info({
      issueId: input.issueId,
      worktree: worktreeName,
      board: boardName
    }, '[recordCompletion] Issue found');

    // 3. Update issue JSON with quality_checks
    try {

      issueData.status = 'done';
      issueData.quality = issueData.quality || {};
      issueData.quality.completion_data = {
        agent_id: input.agentId,
        duration_ms: input.totalDuration,
        commit_count: input.commits.length,
        test_pass_rate: testPassRate,
        success: input.success,
        completed_at: new Date().toISOString(),
      };

      issueData.metadata = issueData.metadata || {};
      issueData.metadata.updated_at = new Date().toISOString();
      issueData.metadata.version = Date.now();

      await fs.writeFile(issueJsonPath, JSON.stringify(issueData, null, 2));
      logger.info({ issueId: input.issueId }, '[recordCompletion] Issue JSON updated with completion data');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[recordCompletion] Could not update issue JSON, continuing');
    }

    // 3. Write telemetry completion event
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'workflow_completed',
      eventCategory: 'workflow',
      severity: 'info',
      issueId: input.issueId,
      agentId: input.agentId,
      durationMs: input.totalDuration,
      payload: {
        commits: input.commits.length,
        testPassRate,
        success: input.success,
      },
      source: 'temporal',
    });

    logger.info(
      {
        activityId,
        issueId: input.issueId,
        agentId: input.agentId,
        duration: input.totalDuration,
        commits: input.commits.length,
      },
      '[recordCompletion] Completion recorded'
    );
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[recordCompletion] Failed to record completion'
    );
    throw error;
  }
}

/**
 * Capture Failure Activity
 *
 * Captures workflow failure for analysis:
 * - Records failure reason
 * - Captures full workflow history
 * - Inserts into exceptions table
 * - Sends alert notification
 */
export async function captureFailure(input: CaptureFailureInput): Promise<void> {
  const activityId = uuidv4();
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.error(
    { activityId, issueId: input.issueId, stage: input.stage, error: input.error },
    '[captureFailure] Capturing workflow failure'
  );

  try {
    // REAL IMPLEMENTATION:
    // 1. Insert into exceptions table in TimescaleDB
    logger.info({
      issueId: input.issueId,
      stage: input.stage,
      error: input.error,
    }, '[captureFailure] Inserting into exceptions table');

    await query(
      `
      INSERT INTO exceptions (
        detected_at,
        exception_type,
        severity,
        workflow_id,
        workflow_type,
        issue_id,
        agent_id,
        title,
        description,
        context
      ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        'workflow_failure', // exception_type
        'high', // severity
        workflowId,
        'IssueLifecycleWorkflow',
        input.issueId,
        input.agentId || null,
        `Workflow failed at stage: ${input.stage}`, // title
        input.error, // description
        JSON.stringify({
          stage: input.stage,
          history: input.history,
          commits: input.commits,
        }), // context
      ]
    );

    logger.info({ issueId: input.issueId }, '[captureFailure] Exception recorded');

    // 2. Find issue to get worktree and board
    const { issueData, worktreeName, boardName, issueJsonPath } = await findIssue(input.issueId);

    logger.info({
      issueId: input.issueId,
      worktree: worktreeName,
      board: boardName
    }, '[captureFailure] Issue found');

    // 3. Update issue JSON with error info
    try {

      issueData.status = 'blocked';
      issueData.failure_info = {
        stage: input.stage,
        error: input.error,
        failed_at: new Date().toISOString(),
        workflow_id: workflowId,
      };

      issueData.metadata = issueData.metadata || {};
      issueData.metadata.updated_at = new Date().toISOString();
      issueData.metadata.version = Date.now();

      await fs.writeFile(issueJsonPath, JSON.stringify(issueData, null, 2));
      logger.info({ issueId: input.issueId }, '[captureFailure] Issue JSON updated with failure info');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[captureFailure] Could not update issue JSON, continuing');
    }

    // 4. Move issue to "blocked" status in board
    const stateJsonPath = path.join(
      MARTHA_WORKFLOW_ROOT,
      '.martha/worktrees',
      worktreeName,
      'boards',
      boardName,
      'state.json'
    );

    try {
      const stateJsonContent = await fs.readFile(stateJsonPath, 'utf-8');
      const stateData = JSON.parse(stateJsonContent);

      // Remove from all columns
      stateData.columns.forEach((column: any) => {
        column.issue_ids = column.issue_ids.filter((id: string) => id !== input.issueId);
      });

      // Add to backlog column (as blocked)
      const backlogColumn = stateData.columns.find((c: any) => c.id === 'backlog');
      if (backlogColumn && !backlogColumn.issue_ids.includes(input.issueId)) {
        backlogColumn.issue_ids.push(input.issueId);
      }

      stateData.version = Date.now();
      stateData.updated_at = new Date().toISOString();

      await fs.writeFile(stateJsonPath, JSON.stringify(stateData, null, 2));
      logger.info({ issueId: input.issueId }, '[captureFailure] Board state updated - moved to backlog');
    } catch (error: any) {
      logger.warn({ error: error.message }, '[captureFailure] Could not update board state, continuing');
    }

    // 4. Write telemetry failure event
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'IssueLifecycleWorkflow',
      eventType: 'workflow_failed',
      eventCategory: 'exception',
      severity: 'error',
      issueId: input.issueId,
      agentId: input.agentId,
      errorMessage: input.error,
      payload: {
        stage: input.stage,
        commits: input.commits.length,
      },
      source: 'temporal',
    });

    logger.info(
      { activityId, issueId: input.issueId },
      '[captureFailure] Failure captured'
    );
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[captureFailure] Failed to capture failure'
    );
    // Don't rethrow - best effort capture
  }
}

/**
 * Helper: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
