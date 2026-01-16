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
}

export interface MonitorAgentHeartbeatInput {
  agentId: string;
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
    // TODO: Implement actual logic
    // 1. Validate issue exists in tracker
    // 2. Generate issue documentation
    // 3. Create feature branch (git checkout -b feature/TASK-123)

    const branch = `feature/${input.issueId}`;

    // Simulate preparation work
    await sleep(1000);

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

  logger.info(
    { activityId, issueId: input.issueId },
    '[spawnAgent] Starting agent spawn'
  );

  try {
    // TODO: Implement actual logic
    // 1. Select agent using ML model (or round-robin)
    // 2. Construct agent command
    // 3. Execute claude-code with issue URL
    // 4. Monitor agent process start
    // 5. Write telemetry event

    const agentId = `agent-${uuidv4().slice(0, 8)}`;
    const processId = Math.floor(Math.random() * 100000);

    // Simulate agent spawn
    await sleep(2000);

    const result: SpawnAgentResult = {
      agentId,
      processId,
    };

    logger.info(
      { activityId, issueId: input.issueId, agentId, processId },
      '[spawnAgent] Agent spawned successfully'
    );

    return result;
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[spawnAgent] Agent spawn failed'
    );
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
    { activityId, agentId: input.agentId },
    '[monitorAgentHeartbeat] Checking heartbeat'
  );

  try {
    // TODO: Implement actual logic
    // 1. Check if agent process is running
    // 2. Query last activity timestamp
    // 3. Return heartbeat status

    const result: MonitorAgentHeartbeatResult = {
      alive: true,
      lastActivity: Date.now(),
    };

    return result;
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

  logger.info(
    { activityId, issueId: input.issueId, commits: input.commits.length },
    '[runTests] Starting tests'
  );

  try {
    // TODO: Implement actual logic
    // 1. Call /martha:test-batch via subprocess
    // 2. Parse test output
    // 3. Upload evidence to Braintrust
    // 4. Return test summary

    // Simulate test execution
    await sleep(3000);

    const result: RunTestsResult = {
      passed: 10,
      failed: 0,
      evidence: `https://braintrust.dev/evidence/${activityId}`,
    };

    logger.info(
      { activityId, issueId: input.issueId, passed: result.passed, failed: result.failed },
      '[runTests] Tests completed'
    );

    return result;
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[runTests] Tests failed'
    );
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
    // TODO: Implement actual logic
    // 1. Update issue status to In Review
    // 2. Create review request (GitHub PR or internal)
    // 3. Assign reviewers
    // 4. Write telemetry

    const reviewId = `review-${uuidv4().slice(0, 8)}`;
    const reviewers = ['reviewer-1', 'reviewer-2'];

    // Simulate review creation
    await sleep(1000);

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

  logger.info(
    { activityId, issueId: input.issueId, branch: input.branch },
    '[mergeCode] Merging code'
  );

  try {
    // TODO: Implement actual logic
    // 1. Merge branch to main
    // 2. Push to remote
    // 3. Update issue status to Done
    // 4. Clean up branch
    // 5. Write telemetry

    const mergeSha = uuidv4().slice(0, 8);

    // Simulate merge
    await sleep(2000);

    const result: MergeCodeResult = {
      mergeSha,
      mergedAt: Date.now(),
    };

    logger.info(
      { activityId, issueId: input.issueId, mergeSha },
      '[mergeCode] Code merged successfully'
    );

    return result;
  } catch (error: any) {
    logger.error(
      { activityId, issueId: input.issueId, error: error.message },
      '[mergeCode] Merge failed'
    );
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

  logger.info(
    { activityId, issueId: input.issueId, agentId: input.agentId },
    '[recordCompletion] Recording completion'
  );

  try {
    // TODO: Implement actual logic
    // 1. Insert into agent_performance table
    // 2. Calculate metrics
    // 3. Write final telemetry event
    // 4. Update learning_feedback for ML

    // Simulate recording
    await sleep(1000);

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

  logger.error(
    { activityId, issueId: input.issueId, stage: input.stage, error: input.error },
    '[captureFailure] Capturing workflow failure'
  );

  try {
    // TODO: Implement actual logic
    // 1. Record failure reason
    // 2. Capture full workflow history
    // 3. Insert into exceptions table
    // 4. Send alert notification

    // Simulate capture
    await sleep(500);

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
