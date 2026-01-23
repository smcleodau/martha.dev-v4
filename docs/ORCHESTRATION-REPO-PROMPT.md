# Orchestration Repository Implementation Guide

## Executive Summary

You are building the **Martha Workflow Orchestration System** - a separate repository from the tracker/kanban system (martha.dev-v4). Your mission is to orchestrate automated development workflows using Temporal Cloud, collect evidence from test runs and LLM interactions, and automatically update issue states in the tracker.

**What You'll Build:**
1. Temporal Cloud workflow integration
2. Evidence collection (Braintrust + Browserbase)
3. Test orchestration with automatic quality gate updates
4. Automatic issue state transitions
5. Enhanced swarm orchestration

**What Already Exists:**
- ✅ Tracker API (martha.dev-v4) - See `TRACKER-API-REFERENCE.md`
- ✅ Custom swarm orchestrator (`src/core/swarm-orchestrator.ts`)
- ✅ Hook system (`src/server/routes/hooks.ts`)
- ✅ Redis event store and pub/sub
- ✅ Temporary SDK installed (`@temporalio/*` packages v1.14.1)

**Integration Points:**
- **Tracker API**: `http://localhost:20000/api/tracker/*`
- **Temporal Cloud**: `ap-northeast-1.aws.api.temporal.io:7233` (namespace: `martha-dev-v4.mnjo7`)
- **GitHub API**: For PR events and issue comments
- **Braintrust**: LLM observability
- **Browserbase**: E2E session replay

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Orchestration Repo (THIS)                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Temporal Cloud Workflows                 │  │
│  │  - IssueLifecycleWorkflow                        │  │
│  │  - EpicDevelopmentWorkflow                       │  │
│  │  - TestExecutionWorkflow                         │  │
│  │  - ReleaseWorkflow                               │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Activities (Actions)                  │  │
│  │  - Git operations (clone, commit, push)          │  │
│  │  - Test execution (Jest, Playwright, Vitest)     │  │
│  │  - Evidence collection (Braintrust, Browserbase) │  │
│  │  - Tracker API calls (update issue, gates)       │  │
│  │  - Swarm spawning/monitoring                     │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │           Event-Driven Automation                │  │
│  │  - Hook handlers (task complete, phase complete) │  │
│  │  - GitHub webhook handlers (PR events)           │  │
│  │  - Auto state transitions                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓ HTTP API Calls
┌─────────────────────────────────────────────────────────┐
│         martha.dev-v4 Tracker API (Separate Repo)       │
│  - Issue state management                               │
│  - Release quality gates                                │
│  - Dependency tracking                                  │
│  - Dashboard UI                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Temporal Cloud Integration (Week 1)

### 1.1 Setup Temporal Client

**File**: `src/temporal/client.ts`

```typescript
import { Client, Connection } from '@temporalio/client';
import * as fs from 'fs';
import * as path from 'path';

// Temporal Cloud configuration
const TEMPORAL_CLOUD_NAMESPACE = 'martha-dev-v4.mnjo7';
const TEMPORAL_CLOUD_ENDPOINT = 'ap-northeast-1.aws.api.temporal.io:7233';

// Load TLS certificates (should be in .temporal/certs/)
const certPath = path.resolve(process.cwd(), '.temporal/certs/client.pem');
const keyPath = path.resolve(process.cwd(), '.temporal/certs/client.key');

export async function createTemporalClient(): Promise<Client> {
  const connection = await Connection.connect({
    address: TEMPORAL_CLOUD_ENDPOINT,
    tls: {
      clientCertPair: {
        crt: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      },
    },
  });

  return new Client({
    connection,
    namespace: TEMPORAL_CLOUD_NAMESPACE,
  });
}

export const temporalClient = await createTemporalClient();
```

**Required Files in Repo Root**:
```
.temporal/
  certs/
    client.pem      # Temporal Cloud client certificate
    client.key      # Temporal Cloud client private key
  config.yaml       # Temporal configuration
```

**Environment Variables** (`.env`):
```bash
TEMPORAL_NAMESPACE=martha-dev-v4.mnjo7
TEMPORAL_ENDPOINT=ap-northeast-1.aws.api.temporal.io:7233
TRACKER_API_URL=http://localhost:20000/api/tracker
```

---

### 1.2 Define Workflows

**File**: `src/temporal/workflows/issue-lifecycle.ts`

```typescript
import * as wf from '@temporalio/workflow';
import type { IssueLifecycleInput } from '../types.js';

// Declare activities (implemented separately)
const activities = wf.proxyActivities({
  startToCloseTimeout: '10 minutes',
});

/**
 * Issue Lifecycle Workflow
 * Orchestrates the complete lifecycle of a single issue from todo → done
 */
export async function IssueLifecycleWorkflow(input: IssueLifecycleInput): Promise<void> {
  const { worktreeId, boardId, issueId } = input;

  // 1. Fetch issue details
  const issue = await activities.getIssue(worktreeId, boardId, issueId);

  // 2. Check dependencies - wait if blocked
  if (issue.dependencies.blocked_by.length > 0) {
    await wf.condition(
      () => activities.checkDependenciesResolved(worktreeId, boardId, issueId),
      '24 hours' // Timeout if blockers not resolved
    );
  }

  // 3. Update status to in-progress
  await activities.updateIssueStatus(worktreeId, boardId, issueId, 'in-progress');

  // 4. Spawn development swarm for this issue
  const swarmId = await activities.spawnSwarm({
    issueId,
    worktreePath: `/mnt/data/martha-workflow/worktrees/${worktreeId}`,
    type: issue.type,
  });

  // 5. Wait for swarm completion (up to 4 hours)
  const swarmResult = await wf.condition(
    () => activities.checkSwarmStatus(swarmId),
    '4 hours'
  );

  if (!swarmResult.success) {
    // Handle swarm failure
    await activities.updateIssueStatus(worktreeId, boardId, issueId, 'todo');
    await activities.addIssueComment(worktreeId, boardId, issueId,
      `Automated development failed: ${swarmResult.error}`
    );
    throw new Error(`Swarm failed: ${swarmResult.error}`);
  }

  // 6. Extract PR URL from swarm output
  const prUrl = swarmResult.pullRequestUrl;
  await activities.updateIssueLinks(worktreeId, boardId, issueId, { pr: prUrl });

  // 7. Update status to in-review
  await activities.updateIssueStatus(worktreeId, boardId, issueId, 'in-review');

  // 8. Wait for PR merge (up to 48 hours)
  const prMerged = await wf.condition(
    () => activities.checkPRMerged(prUrl),
    '48 hours'
  );

  if (prMerged) {
    // 9. Run tests after merge
    const testResult = await activities.runTests({
      worktreeId,
      issueId,
      testType: 'all',
    });

    // 10. Collect evidence
    await activities.collectEvidence({
      worktreeId,
      issueId,
      braintrustTraces: testResult.braintrustTraces,
      browserbaseSession: testResult.browserbaseSession,
      testReport: testResult.reportUrl,
    });

    // 11. Update quality metrics
    await activities.updateIssueQuality(worktreeId, boardId, issueId, {
      coverage: testResult.coverage,
    });

    // 12. Mark issue as done
    await activities.updateIssueStatus(worktreeId, boardId, issueId, 'done');
  } else {
    // PR not merged in time - comment and revert to todo
    await activities.addIssueComment(worktreeId, boardId, issueId,
      'PR not merged within 48 hours. Reverting to todo.'
    );
    await activities.updateIssueStatus(worktreeId, boardId, issueId, 'todo');
  }
}
```

**File**: `src/temporal/workflows/epic-development.ts`

```typescript
import * as wf from '@temporalio/workflow';
import { IssueLifecycleWorkflow } from './issue-lifecycle.js';
import type { EpicDevelopmentInput } from '../types.js';

const activities = wf.proxyActivities({
  startToCloseTimeout: '10 minutes',
});

/**
 * Epic Development Workflow
 * Orchestrates development of an entire epic with all sub-issues
 */
export async function EpicDevelopmentWorkflow(input: EpicDevelopmentInput): Promise<void> {
  const { worktreeId, boardId, epicId } = input;

  // 1. Get all child issues of the epic
  const childIssues = await activities.getEpicChildren(worktreeId, boardId, epicId);

  // 2. Sort by dependencies (topological sort)
  const sortedIssues = await activities.sortByDependencies(childIssues);

  // 3. Update epic status to in-progress
  await activities.updateIssueStatus(worktreeId, boardId, epicId, 'in-progress');

  // 4. Process issues in dependency order
  for (const issue of sortedIssues) {
    // Start child workflow for each issue
    await wf.executeChild(IssueLifecycleWorkflow, {
      args: [{
        worktreeId,
        boardId,
        issueId: issue.id,
      }],
      workflowId: `issue-${issue.id}`,
    });
  }

  // 5. All issues complete - mark epic as done
  await activities.updateIssueStatus(worktreeId, boardId, epicId, 'done');

  // 6. Post completion summary to GitHub
  const stats = await activities.getEpicStats(worktreeId, boardId, epicId);
  await activities.postGitHubComment(epicId, `
Epic completed! 🎉

- Total issues: ${stats.total}
- Completed: ${stats.completed}
- PRs merged: ${stats.prs_merged}
- Test coverage: ${stats.average_coverage}%
- Total story points: ${stats.total_story_points}
  `);
}
```

**File**: `src/temporal/workflows/test-execution.ts`

```typescript
import * as wf from '@temporalio/workflow';
import type { TestExecutionInput } from '../types.js';

const activities = wf.proxyActivities({
  startToCloseTimeout: '30 minutes',
});

/**
 * Test Execution Workflow
 * Runs all tests, collects evidence, updates quality gates
 */
export async function TestExecutionWorkflow(input: TestExecutionInput): Promise<void> {
  const { worktreeId, releaseId, testType } = input;

  // 1. Get release details
  const release = await activities.getRelease(worktreeId, releaseId);

  // 2. Run unit tests
  const unitTestResult = await activities.runTests({
    worktreeId,
    testType: 'unit',
    framework: 'jest',
  });

  // 3. Run E2E tests with Browserbase recording
  const e2eTestResult = await activities.runE2ETests({
    worktreeId,
    testType: 'e2e',
    framework: 'playwright',
    recordSession: true, // Enable Browserbase
  });

  // 4. Collect Braintrust traces
  const braintrustTraces = await activities.collectBraintrustTraces({
    worktreeId,
    releaseId,
    timeRange: '24h',
  });

  // 5. Aggregate evidence
  const evidence = {
    unit_tests: {
      passed: unitTestResult.passed,
      failed: unitTestResult.failed,
      coverage: unitTestResult.coverage,
      report_url: unitTestResult.reportUrl,
    },
    e2e_tests: {
      passed: e2eTestResult.passed,
      failed: e2eTestResult.failed,
      browserbase_session: e2eTestResult.browserbaseSessionUrl,
      report_url: e2eTestResult.reportUrl,
    },
    llm_traces: {
      braintrust_url: braintrustTraces.dashboardUrl,
      total_traces: braintrustTraces.count,
    },
  };

  // 6. Update testing quality gate
  if (unitTestResult.failed === 0 && e2eTestResult.failed === 0) {
    await activities.updateQualityGate(worktreeId, releaseId, 'testing', {
      status: 'passed',
      metadata: evidence,
    });
  } else {
    await activities.updateQualityGate(worktreeId, releaseId, 'testing', {
      status: 'failed',
      metadata: evidence,
    });
  }

  // 7. Post evidence to GitHub
  await activities.postEvidenceToGitHub(releaseId, evidence);
}
```

---

### 1.3 Implement Activities

**File**: `src/temporal/activities/tracker-activities.ts`

```typescript
import axios from 'axios';

const TRACKER_API_URL = process.env.TRACKER_API_URL || 'http://localhost:20000/api/tracker';

export async function getIssue(
  worktreeId: string,
  boardId: string,
  issueId: string
): Promise<any> {
  const response = await axios.get(
    `${TRACKER_API_URL}/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`
  );
  return response.data;
}

export async function updateIssueStatus(
  worktreeId: string,
  boardId: string,
  issueId: string,
  status: string
): Promise<void> {
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`,
    { status }
  );
}

export async function updateIssueLinks(
  worktreeId: string,
  boardId: string,
  issueId: string,
  links: { pr: string }
): Promise<void> {
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/${worktreeId}/boards/${boardId}/issues/${issueId}`,
    { links }
  );
}

export async function checkDependenciesResolved(
  worktreeId: string,
  boardId: string,
  issueId: string
): Promise<boolean> {
  const issue = await getIssue(worktreeId, boardId, issueId);

  // Check all blocking issues
  for (const blockerId of issue.dependencies.blocked_by) {
    const blocker = await getIssue(worktreeId, boardId, blockerId);
    if (blocker.status !== 'done') {
      return false; // Still blocked
    }
  }

  return true; // All blockers resolved
}

export async function updateQualityGate(
  worktreeId: string,
  releaseId: string,
  gateId: string,
  update: { status: string; metadata: any }
): Promise<void> {
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/${worktreeId}/releases/${releaseId}/gates/${gateId}`,
    update
  );
}
```

**File**: `src/temporal/activities/test-activities.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runTests(input: {
  worktreeId: string;
  testType: 'unit' | 'e2e' | 'all';
  framework?: 'jest' | 'playwright' | 'vitest';
}): Promise<any> {
  const { worktreeId, testType, framework = 'jest' } = input;

  const worktreePath = `/mnt/data/martha-workflow/worktrees/${worktreeId}`;

  // Run tests based on type
  let command = '';
  if (testType === 'unit') {
    command = `cd ${worktreePath} && npm run test:unit -- --coverage --json`;
  } else if (testType === 'e2e') {
    command = `cd ${worktreePath} && npm run test:e2e -- --reporter=json`;
  } else {
    command = `cd ${worktreePath} && npm test -- --coverage --json`;
  }

  try {
    const { stdout, stderr } = await execAsync(command);
    const result = JSON.parse(stdout);

    return {
      passed: result.numPassedTests || 0,
      failed: result.numFailedTests || 0,
      coverage: result.coveragePercent || 0,
      reportUrl: `file://${worktreePath}/coverage/index.html`,
      braintrustTraces: [], // Populated by Braintrust integration
      browserbaseSession: null, // Populated by Browserbase integration
    };
  } catch (error: any) {
    return {
      passed: 0,
      failed: 999,
      coverage: 0,
      error: error.message,
    };
  }
}
```

**File**: `src/temporal/activities/swarm-activities.ts`

```typescript
import { spawn } from 'child_process';
import axios from 'axios';

export async function spawnSwarm(input: {
  issueId: string;
  worktreePath: string;
  type: string;
}): Promise<string> {
  const { issueId, worktreePath, type } = input;

  // Call existing swarm orchestrator via HTTP API
  // (Assumes swarm orchestrator is exposed as HTTP endpoint)
  const response = await axios.post('http://localhost:20000/api/v1/swarms', {
    issue_id: issueId,
    worktree_path: worktreePath,
    config: {
      agents: type === 'bug' ? 2 : 3,
      timeout: '4h',
    },
  });

  return response.data.swarm_id;
}

export async function checkSwarmStatus(swarmId: string): Promise<any> {
  const response = await axios.get(`http://localhost:20000/api/v1/swarms/${swarmId}`);
  const status = response.data.status;

  if (status === 'completed') {
    return {
      success: true,
      pullRequestUrl: response.data.outputs.pr_url,
    };
  } else if (status === 'crashed') {
    return {
      success: false,
      error: response.data.error_message,
    };
  }

  return null; // Still running
}
```

---

### 1.4 Setup Temporal Worker

**File**: `src/temporal/worker.ts`

```typescript
import { Worker } from '@temporalio/worker';
import { createTemporalClient } from './client.js';
import * as activities from './activities/index.js';

async function startWorker() {
  const worker = await Worker.create({
    connection: (await createTemporalClient()).connection,
    namespace: 'martha-dev-v4.mnjo7',
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'martha-orchestration',
  });

  await worker.run();
}

startWorker().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
```

**Start Worker**:
```bash
# package.json script
"temporal:worker": "tsx src/temporal/worker.ts"

# Run worker
npm run temporal:worker
```

---

## Phase 2: Evidence Collection (Week 1-2)

### 2.1 Braintrust Integration

**Install SDK**:
```bash
npm install braintrust autoevals
```

**File**: `src/integrations/braintrust/client.ts`

```typescript
import { Braintrust } from 'braintrust';

const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY;

export const braintrust = new Braintrust({
  apiKey: BRAINTRUST_API_KEY,
});

export async function logLLMTrace(input: {
  projectName: string;
  experimentName: string;
  prompt: string;
  response: string;
  model: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const logger = braintrust.logger({
    projectName: input.projectName,
    experimentName: input.experimentName,
  });

  const traceId = await logger.log({
    input: input.prompt,
    output: input.response,
    model: input.model,
    metadata: input.metadata,
  });

  await logger.flush();

  return traceId;
}

export async function getTracesForTimeRange(
  projectName: string,
  timeRange: string
): Promise<any[]> {
  // Query Braintrust API for traces in time range
  // Implementation depends on Braintrust API
  return [];
}
```

**Usage in Swarm**:
```typescript
// When swarm calls LLM, log the trace
await logLLMTrace({
  projectName: 'martha-calculator',
  experimentName: `issue-${issueId}`,
  prompt: systemPrompt + userMessage,
  response: llmResponse,
  model: 'claude-3-opus',
  metadata: {
    issue_id: issueId,
    agent_type: 'developer',
    timestamp: new Date().toISOString(),
  },
});
```

---

### 2.2 Browserbase Integration

**Install SDK**:
```bash
npm install @browserbasehq/sdk
```

**File**: `src/integrations/browserbase/client.ts`

```typescript
import Browserbase from '@browserbasehq/sdk';

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;

export const browserbase = new Browserbase({
  apiKey: BROWSERBASE_API_KEY,
});

export async function createSession(options: {
  projectId?: string;
  recordSession?: boolean;
}): Promise<string> {
  const session = await browserbase.sessions.create({
    projectId: options.projectId || BROWSERBASE_PROJECT_ID,
    record: options.recordSession ?? true,
  });

  return session.id;
}

export async function getSessionRecording(sessionId: string): Promise<string> {
  const session = await browserbase.sessions.retrieve(sessionId);
  return session.recordingUrl || '';
}
```

**Usage in Playwright Tests**:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { createSession } from './src/integrations/browserbase/client';

export default defineConfig({
  use: {
    connectOptions: async () => {
      const sessionId = await createSession({ recordSession: true });
      return {
        wsEndpoint: `wss://connect.browserbase.com?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`,
      };
    },
  },
});
```

---

### 2.3 Evidence Collection Activity

**File**: `src/temporal/activities/evidence-activities.ts`

```typescript
import { logLLMTrace, getTracesForTimeRange } from '../../integrations/braintrust/client.js';
import { getSessionRecording } from '../../integrations/browserbase/client.js';
import axios from 'axios';

const TRACKER_API_URL = process.env.TRACKER_API_URL;

export async function collectEvidence(input: {
  worktreeId: string;
  issueId: string;
  braintrustTraces?: string[];
  browserbaseSession?: string;
  testReport?: string;
}): Promise<void> {
  const evidence: any = {
    collected_at: new Date().toISOString(),
  };

  // Collect Braintrust traces
  if (input.braintrustTraces && input.braintrustTraces.length > 0) {
    evidence.braintrust = {
      trace_ids: input.braintrustTraces,
      dashboard_url: `https://www.braintrust.dev/app/traces?project=martha-calculator`,
    };
  }

  // Collect Browserbase session
  if (input.browserbaseSession) {
    const recordingUrl = await getSessionRecording(input.browserbaseSession);
    evidence.browserbase = {
      session_id: input.browserbaseSession,
      recording_url: recordingUrl,
    };
  }

  // Test report
  if (input.testReport) {
    evidence.test_report = input.testReport;
  }

  // Store evidence in issue metadata
  // (Assuming tracker API supports metadata storage)
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/${input.worktreeId}/boards/default/issues/${input.issueId}`,
    {
      metadata: {
        evidence,
      },
    }
  );
}

export async function postEvidenceToGitHub(
  issueId: string,
  evidence: any
): Promise<void> {
  // Use GitHub API to post comment with evidence links
  const comment = `
## Test Evidence 📊

**Unit Tests**:
- ✅ Passed: ${evidence.unit_tests.passed}
- ❌ Failed: ${evidence.unit_tests.failed}
- Coverage: ${evidence.unit_tests.coverage}%
- [Report](${evidence.unit_tests.report_url})

**E2E Tests**:
- ✅ Passed: ${evidence.e2e_tests.passed}
- ❌ Failed: ${evidence.e2e_tests.failed}
- [Session Replay](${evidence.e2e_tests.browserbase_session})
- [Report](${evidence.e2e_tests.report_url})

**LLM Traces**:
- [Braintrust Dashboard](${evidence.llm_traces.braintrust_url})
- Total traces: ${evidence.llm_traces.total_traces}
  `;

  // Post to GitHub
  // Implementation depends on GitHub API setup
}
```

---

## Phase 3: Automatic State Transitions (Week 2)

### 3.1 GitHub Webhook Handler

**File**: `src/server/routes/webhooks.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import axios from 'axios';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const TRACKER_API_URL = process.env.TRACKER_API_URL;

export const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/webhooks/github - GitHub webhook endpoint
  fastify.post('/github', async (request, reply) => {
    // Verify webhook signature
    const signature = request.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(request.body);

    const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;

    if (signature !== digest) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const event = request.headers['x-github-event'];
    const data = request.body as any;

    // Handle different event types
    if (event === 'pull_request') {
      await handlePullRequestEvent(data);
    } else if (event === 'issues') {
      await handleIssueEvent(data);
    } else if (event === 'push') {
      await handlePushEvent(data);
    }

    return reply.send({ received: true });
  });
};

async function handlePullRequestEvent(data: any): Promise<void> {
  const action = data.action; // opened, closed, merged
  const prNumber = data.pull_request.number;
  const prUrl = data.pull_request.html_url;
  const merged = data.pull_request.merged;

  // Find issue linked to this PR
  const issueId = extractIssueIdFromPR(data.pull_request);

  if (!issueId) return;

  if (action === 'opened') {
    // PR created - move issue to in-review
    await axios.patch(
      `${TRACKER_API_URL}/worktrees/default/boards/default/issues/${issueId}`,
      {
        status: 'in-review',
        links: { pr: prUrl },
      }
    );
  } else if (action === 'closed' && merged) {
    // PR merged - move issue to done
    await axios.patch(
      `${TRACKER_API_URL}/worktrees/default/boards/default/issues/${issueId}`,
      { status: 'done' }
    );

    // Trigger test workflow
    // (Call Temporal workflow to run tests)
  }
}

async function handlePushEvent(data: any): Promise<void> {
  const commits = data.commits;

  for (const commit of commits) {
    const message = commit.message;

    // Parse commit message for issue references
    // e.g., "fixes #MTH-002" or "closes MTH-003"
    const issueMatches = message.match(/(?:fixes|closes|resolves)\s+#?(MTH-\d+)/gi);

    if (issueMatches) {
      for (const match of issueMatches) {
        const issueId = match.match(/MTH-\d+/i)?.[0];
        if (issueId) {
          // Link commit to issue
          await linkCommitToIssue(issueId, commit.id, commit.url);
        }
      }
    }
  }
}

function extractIssueIdFromPR(pr: any): string | null {
  // Look for issue ID in PR title or description
  const text = `${pr.title} ${pr.body}`;
  const match = text.match(/MTH-\d+/i);
  return match ? match[0] : null;
}

async function linkCommitToIssue(
  issueId: string,
  commitHash: string,
  commitUrl: string
): Promise<void> {
  // Add commit to issue's activity log or metadata
  // Implementation depends on tracker API capabilities
}
```

**Register Webhook in GitHub**:
1. Go to repository settings → Webhooks
2. Add webhook: `https://your-domain.com/api/v1/webhooks/github`
3. Select events: Pull requests, Issues, Pushes
4. Add secret (same as `GITHUB_WEBHOOK_SECRET`)

---

### 3.2 Git Commit Hooks

**File**: `src/core/git-hooks.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function installGitHooks(worktreePath: string): Promise<void> {
  const hookPath = path.join(worktreePath, '.git/hooks/commit-msg');

  const hookScript = `#!/bin/sh
# Parse commit message for issue references
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat $COMMIT_MSG_FILE)

# Extract issue IDs (e.g., MTH-001)
ISSUE_IDS=$(echo "$COMMIT_MSG" | grep -oE 'MTH-[0-9]+')

if [ -n "$ISSUE_IDS" ]; then
  echo "Linking commit to issues: $ISSUE_IDS"

  # Call orchestration API to link commit
  for ISSUE_ID in $ISSUE_IDS; do
    curl -X POST http://localhost:20000/api/v1/commits/link \\
      -H "Content-Type: application/json" \\
      -d "{\\"issue_id\\": \\"$ISSUE_ID\\", \\"commit_hash\\": \\"$(git rev-parse HEAD)\\"}"
  done
fi
`;

  fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
}

export async function parseCommitMessage(message: string): Promise<string[]> {
  const issuePattern = /MTH-\d+/gi;
  const matches = message.match(issuePattern);
  return matches || [];
}
```

---

## Phase 4: Enhanced Swarm Orchestration (Week 3)

### 4.1 Swarm → Tracker Integration

**File**: `src/core/swarm-tracker-bridge.ts`

```typescript
import axios from 'axios';

const TRACKER_API_URL = process.env.TRACKER_API_URL;

/**
 * Called when swarm starts working on an issue
 */
export async function onSwarmStart(swarmId: string, issueId: string): Promise<void> {
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/default/boards/default/issues/${issueId}`,
    {
      status: 'in-progress',
      assignee: swarmId,
    }
  );
}

/**
 * Called when swarm completes an issue
 */
export async function onSwarmComplete(
  swarmId: string,
  issueId: string,
  output: any
): Promise<void> {
  // Extract PR URL from swarm output
  const prUrl = output.pull_request_url;

  await axios.patch(
    `${TRACKER_API_URL}/worktrees/default/boards/default/issues/${issueId}`,
    {
      status: 'in-review',
      links: { pr: prUrl },
    }
  );
}

/**
 * Called when swarm crashes
 */
export async function onSwarmCrash(
  swarmId: string,
  issueId: string,
  error: string
): Promise<void> {
  await axios.patch(
    `${TRACKER_API_URL}/worktrees/default/boards/default/issues/${issueId}`,
    {
      status: 'todo',
    }
  );

  // Add error comment
  // (Depends on tracker API supporting comments)
}
```

---

## Phase 5: Testing & Deployment

### 5.1 Calculator End-to-End Test

**Objective**: Test the entire orchestration flow with the calculator epic.

**Steps**:

1. **Start Services**:
   ```bash
   # Terminal 1: Tracker API (martha.dev-v4 repo)
   cd /mnt/data/martha.dev-v4
   npm run dev

   # Terminal 2: Temporal Worker (orchestration repo)
   cd /mnt/data/orchestration-repo
   npm run temporal:worker

   # Terminal 3: Orchestration API (orchestration repo)
   npm run dev
   ```

2. **Trigger Epic Workflow**:
   ```bash
   # Using Temporal CLI
   temporal workflow start \
     --task-queue martha-orchestration \
     --type EpicDevelopmentWorkflow \
     --input '{"worktreeId":"default","boardId":"default","epicId":"MTH-001"}'
   ```

3. **Monitor Progress**:
   - **Temporal UI**: https://cloud.temporal.io → martha-dev-v4.mnjo7
   - **Tracker Dashboard**: http://localhost:20000/tracker
   - **Logs**: Check orchestration service logs

4. **Expected Behavior**:
   - Epic MTH-001 status → `in-progress`
   - Each child issue processed in order:
     - MTH-002 (arithmetic) → spawns swarm → creates PR → in-review → merged → done
     - MTH-003 (UI) → spawns swarm → creates PR → in-review → merged → done
     - (etc. for all 6 issues)
   - Evidence collected for each issue (Braintrust traces, Browserbase sessions)
   - Quality gates updated based on test results
   - Epic MTH-001 status → `done`
   - GitHub issue has completion comment with stats

5. **Verify Outputs**:
   - All 6 issues in `done` status
   - All PRs merged
   - Test coverage > 80%
   - All quality gates `passed`
   - Evidence links in GitHub comments

---

### 5.2 Temporal Dashboard

Access Temporal Cloud UI:
- URL: https://cloud.temporal.io
- Namespace: `martha-dev-v4.mnjo7`

**View Workflow Executions**:
1. Filter by workflow type: `EpicDevelopmentWorkflow`
2. Click on execution to see:
   - Event history
   - Child workflows
   - Activity executions
   - Timers and retries

---

## File Structure

```
orchestration-repo/
├── .temporal/
│   ├── certs/
│   │   ├── client.pem
│   │   └── client.key
│   └── config.yaml
├── src/
│   ├── temporal/
│   │   ├── client.ts                    # Temporal Cloud client
│   │   ├── worker.ts                    # Worker process
│   │   ├── types.ts                     # Workflow input types
│   │   ├── workflows/
│   │   │   ├── index.ts
│   │   │   ├── issue-lifecycle.ts       # Issue workflow
│   │   │   ├── epic-development.ts      # Epic workflow
│   │   │   ├── test-execution.ts        # Test workflow
│   │   │   └── release.ts               # Release workflow
│   │   └── activities/
│   │       ├── index.ts
│   │       ├── tracker-activities.ts    # Tracker API calls
│   │       ├── test-activities.ts       # Test execution
│   │       ├── swarm-activities.ts      # Swarm management
│   │       ├── evidence-activities.ts   # Evidence collection
│   │       └── git-activities.ts        # Git operations
│   ├── integrations/
│   │   ├── braintrust/
│   │   │   └── client.ts                # Braintrust SDK
│   │   ├── browserbase/
│   │   │   └── client.ts                # Browserbase SDK
│   │   └── github/
│   │       └── client.ts                # GitHub API
│   ├── server/
│   │   ├── fastify.ts                   # HTTP server
│   │   └── routes/
│   │       ├── webhooks.ts              # GitHub webhooks
│   │       └── orchestration.ts         # Orchestration API
│   ├── core/
│   │   ├── swarm-tracker-bridge.ts      # Swarm ↔ Tracker
│   │   └── git-hooks.ts                 # Git hook management
│   └── index.ts                         # Main entry point
├── package.json
├── tsconfig.json
└── .env
```

---

## Environment Variables

**`.env`**:
```bash
# Temporal Cloud
TEMPORAL_NAMESPACE=martha-dev-v4.mnjo7
TEMPORAL_ENDPOINT=ap-northeast-1.aws.api.temporal.io:7233

# Tracker API
TRACKER_API_URL=http://localhost:20000/api/tracker

# Evidence Collection
BRAINTRUST_API_KEY=your-braintrust-key
BROWSERBASE_API_KEY=your-browserbase-key
BROWSERBASE_PROJECT_ID=your-project-id

# GitHub
GITHUB_TOKEN=your-github-pat
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Redis (for events)
REDIS_URL=redis://localhost:6379
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "temporal:worker": "tsx src/temporal/worker.ts",
    "build": "swc src -d dist --copy-files",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@temporalio/activity": "^1.14.1",
    "@temporalio/client": "^1.14.1",
    "@temporalio/worker": "^1.14.1",
    "@temporalio/workflow": "^1.14.1",
    "braintrust": "latest",
    "autoevals": "latest",
    "@browserbasehq/sdk": "latest",
    "axios": "^1.6.5",
    "fastify": "^4.26.0",
    "ioredis": "^5.3.2"
  }
}
```

---

## Success Criteria

### Minimum Viable Product (MVP)

- [ ] Temporal Cloud connected and worker running
- [ ] `IssueLifecycleWorkflow` executes end-to-end for one issue
- [ ] `EpicDevelopmentWorkflow` processes all 6 calculator issues
- [ ] Automatic status transitions (backlog → todo → in-progress → in-review → done)
- [ ] GitHub webhook integration working (PR events trigger state changes)
- [ ] Evidence collection (Braintrust traces + Browserbase sessions) working
- [ ] Quality gates updated based on test results
- [ ] Calculator epic completes successfully

### Full Production

- [ ] All workflows implemented (issue, epic, test, release)
- [ ] All quality gates automated
- [ ] Git commit hooks installed and working
- [ ] Swarm orchestration integrated
- [ ] Evidence automatically posted to GitHub
- [ ] Temporal Dashboard shows complete history
- [ ] Zero manual interventions for calculator epic

---

## Next Actions

1. **Create orchestration repository**:
   ```bash
   mkdir orchestration-repo
   cd orchestration-repo
   npm init -y
   npm install @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
   ```

2. **Copy Temporal certificates** from martha.dev-v4:
   ```bash
   mkdir -p .temporal/certs
   # Copy client.pem and client.key from Temporal Cloud
   ```

3. **Implement Temporal client** (`src/temporal/client.ts`)

4. **Implement first workflow** (`IssueLifecycleWorkflow`)

5. **Test with single issue** (MTH-002)

6. **Expand to epic workflow**

7. **Add evidence collection**

8. **Test calculator epic end-to-end**

---

## Questions & Support

- **Temporal Documentation**: https://docs.temporal.io
- **Braintrust Docs**: https://www.braintrust.dev/docs
- **Browserbase Docs**: https://docs.browserbase.com
- **Tracker API Reference**: See `TRACKER-API-REFERENCE.md` in martha.dev-v4 repo

For issues, refer to:
- Temporal Cloud UI: https://cloud.temporal.io
- Tracker Dashboard: http://localhost:20000/tracker
- Service logs: `npm run dev` output
