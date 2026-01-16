/**
 * BatchCoordinatorWorkflow
 *
 * Coordinates execution of multiple issues in a batch with dependency management.
 * Spawns child IssueLifecycleWorkflow instances and monitors completion.
 *
 * Features:
 * - Dependency graph management
 * - Event-driven child workflow monitoring (NO polling)
 * - Parallel execution of independent issues
 * - Sequential execution when dependencies exist
 * - Batch completion tracking
 */

import {
  proxyActivities,
  defineQuery,
  setHandler,
  startChild,
  ChildWorkflowHandle,
} from '@temporalio/workflow';
import type { IssueLifecycleWorkflow, IssueInput } from './IssueLifecycleWorkflow.js';
import type * as activities from '../activities/issue-activities.js';

// Proxy activities
const {} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    initialInterval: '5 seconds',
    backoffCoefficient: 2,
    maximumInterval: '5 minutes',
    maximumAttempts: 5,
  },
});

// Types
export interface BatchInput {
  batchId: string;
  epics: Epic[];
}

export interface Epic {
  epicId: string;
  name: string;
  issues: Issue[];
}

export interface Issue {
  id: string;
  title: string;
  epicId: string;
  complexity?: number;
  dependencies?: string[]; // Array of issue IDs that must complete first
}

export interface BatchState {
  batchId: string;
  totalIssues: number;
  completedIssues: Set<string>;
  failedIssues: Set<string>;
  runningIssues: Map<string, ChildWorkflowHandle<typeof IssueLifecycleWorkflow>>;
  dependencyGraph: Map<string, string[]>; // issueId -> list of parent issue IDs
  epicProgress: Map<string, EpicProgress>;
  startTime: number;
}

export interface EpicProgress {
  epicId: string;
  total: number;
  completed: number;
  failed: number;
  completionPercentage: number;
}

// Queries
export const getBatchStatusQuery = defineQuery<BatchStatus>('getBatchStatus');
export const getEpicProgressQuery = defineQuery<Map<string, EpicProgress>>(
  'getEpicProgress'
);

export interface BatchStatus {
  batchId: string;
  totalIssues: number;
  completedIssues: number;
  failedIssues: number;
  runningIssues: number;
  completionPercentage: number;
  duration: number;
}

/**
 * BatchCoordinatorWorkflow main function
 */
export async function BatchCoordinatorWorkflow(
  input: BatchInput
): Promise<void> {
  // Initialize state
  const state: BatchState = {
    batchId: input.batchId,
    totalIssues: 0,
    completedIssues: new Set<string>(),
    failedIssues: new Set<string>(),
    runningIssues: new Map(),
    dependencyGraph: new Map(),
    epicProgress: new Map(),
    startTime: Date.now(),
  };

  // Build dependency graph and count total issues
  for (const epic of input.epics) {
    state.totalIssues += epic.issues.length;

    state.epicProgress.set(epic.epicId, {
      epicId: epic.epicId,
      total: epic.issues.length,
      completed: 0,
      failed: 0,
      completionPercentage: 0,
    });

    for (const issue of epic.issues) {
      if (issue.dependencies && issue.dependencies.length > 0) {
        state.dependencyGraph.set(issue.id, issue.dependencies);
      } else {
        state.dependencyGraph.set(issue.id, []);
      }
    }
  }

  // Query handlers
  setHandler(getBatchStatusQuery, () => {
    return {
      batchId: state.batchId,
      totalIssues: state.totalIssues,
      completedIssues: state.completedIssues.size,
      failedIssues: state.failedIssues.size,
      runningIssues: state.runningIssues.size,
      completionPercentage:
        (state.completedIssues.size / state.totalIssues) * 100,
      duration: Date.now() - state.startTime,
    };
  });

  setHandler(getEpicProgressQuery, () => state.epicProgress);

  // Main orchestration loop
  const allIssues: Issue[] = input.epics.flatMap((epic) => epic.issues);

  // Start all issues that have no dependencies
  const readyIssues = allIssues.filter((issue) => {
    const deps = state.dependencyGraph.get(issue.id) || [];
    return deps.length === 0;
  });

  // Spawn initial batch of workflows
  await Promise.all(
    readyIssues.map((issue) => spawnIssueWorkflow(state, issue))
  );

  // Wait for all workflows to complete
  while (
    state.completedIssues.size + state.failedIssues.size <
    state.totalIssues
  ) {
    // Wait for any running workflow to complete
    const running = Array.from(state.runningIssues.entries());

    if (running.length === 0) {
      // No workflows running, check if we can start new ones
      const nextReadyIssues = allIssues.filter((issue) => {
        // Skip if already completed or failed
        if (
          state.completedIssues.has(issue.id) ||
          state.failedIssues.has(issue.id)
        ) {
          return false;
        }

        // Skip if already running
        if (state.runningIssues.has(issue.id)) {
          return false;
        }

        // Check if all dependencies are completed
        const deps = state.dependencyGraph.get(issue.id) || [];
        return deps.every((depId) => state.completedIssues.has(depId));
      });

      if (nextReadyIssues.length > 0) {
        // Start next batch of ready issues
        await Promise.all(
          nextReadyIssues.map((issue) => spawnIssueWorkflow(state, issue))
        );
      } else {
        // No ready issues, but not all completed - deadlock or all failed
        break;
      }
    } else {
      // Wait for any workflow to complete using Promise.race
      const workflowPromises = running.map(async ([issueId, handle]) => {
        try {
          await handle.result();
          return { issueId, success: true };
        } catch (error: any) {
          return { issueId, success: false, error: error.message };
        }
      });

      const completed = await Promise.race(workflowPromises);

      // Update state
      state.runningIssues.delete(completed.issueId);

      if (completed.success) {
        state.completedIssues.add(completed.issueId);

        // Update epic progress
        const issue = allIssues.find((i) => i.id === completed.issueId);
        if (issue) {
          const progress = state.epicProgress.get(issue.epicId);
          if (progress) {
            progress.completed++;
            progress.completionPercentage = (progress.completed / progress.total) * 100;
          }
        }
      } else {
        state.failedIssues.add(completed.issueId);

        // Update epic progress
        const issue = allIssues.find((i) => i.id === completed.issueId);
        if (issue) {
          const progress = state.epicProgress.get(issue.epicId);
          if (progress) {
            progress.failed++;
          }
        }
      }

      // Check for newly unblocked issues
      const nowReadyIssues = allIssues.filter((issue) => {
        // Skip if already completed or failed
        if (
          state.completedIssues.has(issue.id) ||
          state.failedIssues.has(issue.id)
        ) {
          return false;
        }

        // Skip if already running
        if (state.runningIssues.has(issue.id)) {
          return false;
        }

        // Check if all dependencies are completed
        const deps = state.dependencyGraph.get(issue.id) || [];
        return deps.every((depId) => state.completedIssues.has(depId));
      });

      // Start newly ready issues
      await Promise.all(
        nowReadyIssues.map((issue) => spawnIssueWorkflow(state, issue))
      );
    }
  }

  // Final logging
  const totalDuration = Date.now() - state.startTime;
  const successRate =
    (state.completedIssues.size / state.totalIssues) * 100;

  if (state.failedIssues.size > 0) {
    throw new Error(
      `Batch ${state.batchId} completed with ${state.failedIssues.size} failures. ` +
        `Success rate: ${successRate.toFixed(2)}%. Duration: ${totalDuration}ms`
    );
  }
}

/**
 * Helper: Spawn an issue workflow
 */
async function spawnIssueWorkflow(
  state: BatchState,
  issue: Issue
): Promise<void> {
  const workflowId = `issue-lifecycle-${issue.id}`;

  const issueInput: IssueInput = {
    id: issue.id,
    title: issue.title,
    epicId: issue.epicId,
    complexity: issue.complexity,
    dependencies: issue.dependencies,
  };

  const handle = await startChild<typeof IssueLifecycleWorkflow>(
    'IssueLifecycleWorkflow',
    {
      workflowId,
      args: [issueInput],
      searchAttributes: {
        IssueId: [issue.id],
        EpicId: [issue.epicId],
        BatchId: [state.batchId],
      },
    }
  );

  state.runningIssues.set(issue.id, handle);
}
