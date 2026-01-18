/**
 * IssueLifecycleWorkflow
 *
 * Orchestrates the complete lifecycle of a single issue from preparation to completion.
 * Implements 7 stages with full telemetry, signal handling, and SAGA compensation.
 *
 * Stages:
 * 1. Preparation - Set up issue, generate documentation, create branch
 * 2. Agent Spawn - Select and spawn appropriate agent
 * 3. Development - Monitor agent progress, track commits
 * 4. Testing - Run tests, verify code quality
 * 5. Review - Move to review, wait for approval
 * 6. Merge - Merge code to main branch
 * 7. Completion - Record metrics, update tracker
 *
 * Signals:
 * - agentStartedSignal: Agent has started working
 * - commitMadeSignal: Agent made a commit
 * - agentCompletedSignal: Agent finished work
 * - testResultsSignal: Test results available
 * - reviewApprovedSignal: Code review approved
 * - blockSignal: Block workflow (manual intervention needed)
 *
 * Queries:
 * - getStatusQuery: Get current workflow status
 * - getMetricsQuery: Get workflow metrics
 * - getHistoryQuery: Get workflow event history
 */

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  sleep,
  proxySinks,
  workflowInfo,
} from '@temporalio/workflow';
import type * as activities from '../activities/issue-activities.js';
import type * as gateActivities from '../activities/gate-activities.js';

// Telemetry sink for stage transition events
interface TelemetrySinks {
  telemetry: {
    writeEvent(event: {
      eventType: string;
      eventCategory: string;
      workflowId: string;
      workflowType: string;
      payload?: Record<string, unknown>;
      source: string;
    }): void;
  };
}

const { telemetry } = proxySinks<TelemetrySinks>();

/**
 * Helper to write stage transition events
 */
function logStageTransition(
  fromStage: Stage,
  toStage: Stage,
  issueId: string,
  reason?: string
): void {
  const info = workflowInfo();
  telemetry.writeEvent({
    eventType: 'stage_transitioned',
    eventCategory: 'workflow',
    workflowId: info.workflowId,
    workflowType: info.workflowType,
    payload: {
      fromStage,
      toStage,
      issueId,
      reason,
      timestamp: Date.now(),
    },
    source: 'temporal',
  });
}

// Proxy activities with retry policies
const {
  prepareIssue,
  spawnAgent,
  monitorAgentHeartbeat,
  runTests,
  moveToReview,
  mergeCode,
  recordCompletion,
  captureFailure,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    initialInterval: '5 seconds',
    backoffCoefficient: 2,
    maximumInterval: '5 minutes',
    maximumAttempts: 5,
  },
});

// Proxy gate check activities
const { checkStageGate } = proxyActivities<typeof gateActivities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '2 seconds',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 3,
  },
});

// Types
export interface IssueInput {
  id: string;
  title: string;
  epicId?: string;
  complexity?: number;
  dependencies?: string[];
}

export interface IssueState {
  issueId: string;
  stage: Stage;
  agentId?: string;
  commits: Commit[];
  history: HistoryEvent[];
  blocked: boolean;
  blockReason?: string;
  startTime: number;
  testResults?: TestResults;
  metrics: WorkflowMetrics;
}

export enum Stage {
  PREPARATION = 'preparation',
  SPAWN = 'spawn',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  REVIEW = 'review',
  MERGE = 'merge',
  COMPLETION = 'completion',
  FAILED = 'failed',
}

export interface Commit {
  sha: string;
  message: string;
  timestamp: number;
  files: string[];
}

export interface TestResults {
  passed: number;
  failed: number;
  evidence?: string;
}

export interface HistoryEvent {
  stage: Stage;
  timestamp: number;
  event: string;
  details?: any;
}

export interface WorkflowMetrics {
  timeToFirstCommit?: number;
  totalCommits: number;
  developmentDuration?: number;
  testDuration?: number;
  reviewDuration?: number;
}

// Signals
export const agentStartedSignal = defineSignal<[{ agentId: string; startTime: number }]>(
  'agentStarted'
);

export const commitMadeSignal = defineSignal<
  [{ sha: string; message: string; files: string[] }]
>('commitMade');

export const agentCompletedSignal = defineSignal<[{ agentId: string; duration: number }]>(
  'agentCompleted'
);

export const testResultsSignal = defineSignal<
  [{ passed: number; failed: number; evidence?: string }]
>('testResults');

export const reviewApprovedSignal = defineSignal('reviewApproved');

export const blockSignal = defineSignal<[{ reason: string }]>('block');

// Queries
export const getStatusQuery = defineQuery<string>('getStatus');
export const getMetricsQuery = defineQuery<WorkflowMetrics>('getMetrics');
export const getHistoryQuery = defineQuery<HistoryEvent[]>('getHistory');

/**
 * IssueLifecycleWorkflow main function
 */
export async function IssueLifecycleWorkflow(issue: IssueInput): Promise<void> {
  // Initialize state
  const state: IssueState = {
    issueId: issue.id,
    stage: Stage.PREPARATION,
    commits: [],
    history: [],
    blocked: false,
    startTime: Date.now(),
    metrics: {
      totalCommits: 0,
    },
  };

  // Signal handlers
  let agentStarted = false;
  let agentCompleted = false;
  let testsCompleted = false;
  let reviewApproved = false;

  setHandler(agentStartedSignal, ({ agentId, startTime }) => {
    state.agentId = agentId;
    agentStarted = true;
    addHistory(state, 'Agent started', { agentId, startTime });

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'agent_started_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        agentId,
        stage: state.stage,
        startTime,
      },
      source: 'temporal',
    });
  });

  setHandler(commitMadeSignal, ({ sha, message, files }) => {
    const commit: Commit = {
      sha,
      message,
      timestamp: Date.now(),
      files,
    };
    state.commits.push(commit);
    state.metrics.totalCommits++;

    if (state.metrics.totalCommits === 1) {
      state.metrics.timeToFirstCommit = Date.now() - state.startTime;
    }

    addHistory(state, 'Commit made', { sha, message, filesCount: files.length });

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'commit_made_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        sha,
        commitMessage: message,
        filesCount: files.length,
        totalCommits: state.metrics.totalCommits,
        stage: state.stage,
        isFirstCommit: state.metrics.totalCommits === 1,
      },
      source: 'temporal',
    });
  });

  setHandler(agentCompletedSignal, ({ agentId, duration }) => {
    agentCompleted = true;
    state.metrics.developmentDuration = duration;
    addHistory(state, 'Agent completed', { agentId, duration });

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'agent_completed_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        agentId,
        duration,
        totalCommits: state.metrics.totalCommits,
        stage: state.stage,
      },
      source: 'temporal',
    });
  });

  setHandler(testResultsSignal, ({ passed, failed, evidence }) => {
    state.testResults = { passed, failed, evidence };
    testsCompleted = true;
    addHistory(state, 'Tests completed', { passed, failed });

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'test_results_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        passed,
        failed,
        testsPassed: failed === 0,
        evidenceLength: evidence?.length || 0,
        stage: state.stage,
      },
      source: 'temporal',
    });
  });

  setHandler(reviewApprovedSignal, () => {
    reviewApproved = true;
    addHistory(state, 'Review approved', {});

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'review_approved_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        stage: state.stage,
        reviewDuration: state.metrics.reviewDuration,
      },
      source: 'temporal',
    });
  });

  setHandler(blockSignal, ({ reason }) => {
    state.blocked = true;
    state.blockReason = reason;
    addHistory(state, 'Workflow blocked', { reason });

    // Log signal handling
    const info = workflowInfo();
    telemetry.writeEvent({
      eventType: 'workflow_blocked_handled',
      eventCategory: 'signal',
      workflowId: info.workflowId,
      workflowType: info.workflowType,
      payload: {
        issueId: issue.id,
        reason,
        stage: state.stage,
        totalCommits: state.metrics.totalCommits,
      },
      source: 'temporal',
    });
  });

  // Query handlers
  setHandler(getStatusQuery, () => state.stage);
  setHandler(getMetricsQuery, () => state.metrics);
  setHandler(getHistoryQuery, () => state.history);

  // Main workflow execution with SAGA compensation
  try {
    // ===== Stage 1: Preparation =====
    const previousStage = state.stage;
    state.stage = Stage.PREPARATION;
    logStageTransition(previousStage, Stage.PREPARATION, issue.id, 'Workflow started');
    addHistory(state, 'Started preparation stage', {});

    const prepResult = await prepareIssue({
      issueId: issue.id,
      title: issue.title,
      epicId: issue.epicId,
      complexity: issue.complexity,
    });

    addHistory(state, 'Issue prepared', { branch: prepResult.branch });

    // ===== Stage 2: Agent Spawn =====
    logStageTransition(state.stage, Stage.SPAWN, issue.id, 'Preparation completed');
    state.stage = Stage.SPAWN;
    addHistory(state, 'Started spawn stage', {});

    const spawnResult = await spawnAgent({
      issueId: issue.id,
      issueTitle: issue.title,
      epicId: issue.epicId,
      complexity: issue.complexity,
      branch: prepResult.branch,
    });

    addHistory(state, 'Agent spawned', { agentId: spawnResult.agentId });

    // Wait for agent to start (timeout 10 minutes)
    const agentStartTimeout = await condition(() => agentStarted, '10 minutes');
    if (!agentStartTimeout) {
      throw new Error('Agent failed to start within 10 minutes');
    }

    // ===== Stage 3: Development Monitoring =====
    logStageTransition(state.stage, Stage.DEVELOPMENT, issue.id, 'Agent started');
    state.stage = Stage.DEVELOPMENT;
    addHistory(state, 'Started development stage', {});

    const devStartTime = Date.now();

    // Monitor agent progress (timeout configurable, default 2 hours)
    const developmentTimeout = issue.complexity
      ? issue.complexity * 30 * 60 * 1000 // complexity * 30 minutes
      : 2 * 60 * 60 * 1000; // 2 hours default

    // Wait for agent completion
    const devCompleted = await condition(() => agentCompleted, developmentTimeout);

    if (!devCompleted) {
      addHistory(state, 'Development timeout exceeded', { timeout: developmentTimeout });
      throw new Error(
        `Agent did not complete work within ${developmentTimeout}ms`
      );
    }

    // ===== Gate Check: Development -> Testing =====
    const devGateResult = await checkStageGate({
      issueId: issue.id,
      currentStage: 'DEVELOPMENT',
      epicId: issue.epicId,
    });

    if (!devGateResult.allowed) {
      addHistory(state, 'Gate check failed: Development -> Testing', {
        reason: devGateResult.reason,
        missingRequirements: devGateResult.missingRequirements,
      });
      throw new Error(
        `Cannot move to TESTING: ${devGateResult.reason}. Missing: ${devGateResult.missingRequirements.join(', ')}`
      );
    }

    addHistory(state, 'Gate check passed: Development -> Testing', {
      qualityScore: devGateResult.qualityScore,
    });

    // ===== Stage 4: Testing =====
    logStageTransition(state.stage, Stage.TESTING, issue.id, 'Development completed');
    state.stage = Stage.TESTING;
    addHistory(state, 'Started testing stage', {});

    const testStartTime = Date.now();

    // Run tests
    await runTests({
      issueId: issue.id,
      commits: state.commits,
      branch: prepResult.branch,
    });

    // Wait for test results (timeout 20 minutes)
    const testsTimeout = await condition(() => testsCompleted, '20 minutes');
    if (!testsTimeout) {
      throw new Error('Tests did not complete within 20 minutes');
    }

    state.metrics.testDuration = Date.now() - testStartTime;

    // Check if tests passed
    if (state.testResults && state.testResults.failed > 0) {
      addHistory(state, 'Tests failed', {
        passed: state.testResults.passed,
        failed: state.testResults.failed,
      });
      throw new Error(
        `Tests failed: ${state.testResults.failed} failures, ${state.testResults.passed} passed`
      );
    }

    addHistory(state, 'Tests passed', { passed: state.testResults?.passed });

    // ===== Gate Check: Testing -> Review =====
    const testGateResult = await checkStageGate({
      issueId: issue.id,
      currentStage: 'TESTING',
      epicId: issue.epicId,
    });

    if (!testGateResult.allowed) {
      addHistory(state, 'Gate check failed: Testing -> Review', {
        reason: testGateResult.reason,
        missingRequirements: testGateResult.missingRequirements,
      });
      throw new Error(
        `Cannot move to REVIEW: ${testGateResult.reason}. Missing: ${testGateResult.missingRequirements.join(', ')}`
      );
    }

    addHistory(state, 'Gate check passed: Testing -> Review', {
      qualityScore: testGateResult.qualityScore,
    });

    // ===== Stage 5: Review =====
    logStageTransition(state.stage, Stage.REVIEW, issue.id, 'Tests passed');
    state.stage = Stage.REVIEW;
    addHistory(state, 'Started review stage', {});

    const reviewStartTime = Date.now();

    await moveToReview({
      issueId: issue.id,
      commits: state.commits,
      testResults: state.testResults!,
      branch: prepResult.branch,
    });

    // Wait for review approval (timeout 48 hours)
    const reviewTimeout = await condition(() => reviewApproved, '48 hours');
    if (!reviewTimeout) {
      addHistory(state, 'Review timeout exceeded', {});
      throw new Error('Review not approved within 48 hours');
    }

    state.metrics.reviewDuration = Date.now() - reviewStartTime;
    addHistory(state, 'Review approved', {});

    // ===== Gate Check: Review -> Merge =====
    const reviewGateResult = await checkStageGate({
      issueId: issue.id,
      currentStage: 'REVIEW',
      epicId: issue.epicId,
    });

    if (!reviewGateResult.allowed) {
      addHistory(state, 'Gate check failed: Review -> Merge', {
        reason: reviewGateResult.reason,
        missingRequirements: reviewGateResult.missingRequirements,
      });
      throw new Error(
        `Cannot move to MERGE: ${reviewGateResult.reason}. Missing: ${reviewGateResult.missingRequirements.join(', ')}`
      );
    }

    addHistory(state, 'Gate check passed: Review -> Merge', {
      qualityScore: reviewGateResult.qualityScore,
    });

    // ===== Stage 6: Merge =====
    logStageTransition(state.stage, Stage.MERGE, issue.id, 'Review approved');
    state.stage = Stage.MERGE;
    addHistory(state, 'Started merge stage', {});

    const mergeResult = await mergeCode({
      issueId: issue.id,
      branch: prepResult.branch,
      commits: state.commits,
    });

    addHistory(state, 'Code merged', { mergeSha: mergeResult.mergeSha });

    // ===== Gate Check: Merge -> Completion =====
    const mergeGateResult = await checkStageGate({
      issueId: issue.id,
      currentStage: 'MERGE',
      epicId: issue.epicId,
    });

    if (!mergeGateResult.allowed) {
      addHistory(state, 'Gate check failed: Merge -> Completion', {
        reason: mergeGateResult.reason,
        missingRequirements: mergeGateResult.missingRequirements,
      });
      throw new Error(
        `Cannot move to COMPLETION: ${mergeGateResult.reason}. Missing: ${mergeGateResult.missingRequirements.join(', ')}`
      );
    }

    addHistory(state, 'Gate check passed: Merge -> Completion', {
      qualityScore: mergeGateResult.qualityScore,
    });

    // ===== Stage 7: Completion =====
    logStageTransition(state.stage, Stage.COMPLETION, issue.id, 'Code merged');
    state.stage = Stage.COMPLETION;
    addHistory(state, 'Started completion stage', {});

    const totalDuration = Date.now() - state.startTime;

    await recordCompletion({
      issueId: issue.id,
      agentId: state.agentId!,
      complexity: issue.complexity || 1,
      totalDuration,
      commits: state.commits,
      testResults: state.testResults!,
      metrics: state.metrics,
      success: true,
    });

    addHistory(state, 'Workflow completed successfully', { totalDuration });
  } catch (error: any) {
    // SAGA Compensation
    const failedFromStage = state.stage;
    logStageTransition(state.stage, Stage.FAILED, issue.id, error.message);
    state.stage = Stage.FAILED;
    addHistory(state, 'Workflow failed', { error: error.message });

    try {
      await captureFailure({
        issueId: issue.id,
        agentId: state.agentId,
        stage: state.stage,
        error: error.message,
        history: state.history,
        commits: state.commits,
      });
    } catch (captureError: any) {
      // Log but don't fail if capture fails
      addHistory(state, 'Failed to capture failure', {
        error: captureError.message,
      });
    }

    throw error;
  }
}

/**
 * Helper function to add history event
 */
function addHistory(state: IssueState, event: string, details?: any): void {
  state.history.push({
    stage: state.stage,
    timestamp: Date.now(),
    event,
    details,
  });
}
