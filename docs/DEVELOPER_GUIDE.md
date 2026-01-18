# Martha.dev v4 Platform - Developer Guide

**Version:** 4.0.0
**Last Updated:** January 2026
**Audience:** Software Engineers, Contributors

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Running Tests](#running-tests)
4. [Creating Workflows](#creating-workflows)
5. [Creating Activities](#creating-activities)
6. [Coding Standards](#coding-standards)
7. [Debugging](#debugging)
8. [Contributing](#contributing)

---

## Development Environment Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** >= 20.10.0 (for local Temporal and TimescaleDB)
- **Git** >= 2.30.0
- **PostgreSQL client** (psql) for database access

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/martha.dev-v4-orchestration.git
cd martha.dev-v4-orchestration

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.local.template .env.local
# Edit .env.local with your credentials

# 4. Start dependencies (Temporal + TimescaleDB)
docker-compose -f docker-compose.temporal.yml up -d
docker-compose -f docker-compose.db.yml up -d

# 5. Setup database schema
npm run db:setup

# 6. Build project
npm run build

# 7. Start development mode
npm run dev
```

### Environment Configuration

Edit `.env.local`:

```bash
# Development Temporal (local)
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=martha-tasks

# Database
DATABASE_URL=postgresql://archie_user:password@localhost:21006/martha_development

# Logging
LOG_LEVEL=debug
LOG_PRETTY=true

# Ports
SERVICE_PORT=21009
```

### Verify Setup

```bash
# Check API server
curl http://localhost:21009/health
# Expected: {"status":"ok",...}

# Check database
psql postgresql://archie_user:password@localhost:21006/martha_development -c "SELECT version();"
# Expected: PostgreSQL version with TimescaleDB extension

# Check Temporal UI
open http://localhost:8088
# Expected: Temporal Web UI
```

---

## Project Structure

```
martha.dev-v4-orchestration/
├── src/
│   ├── workflows/              # Temporal workflow definitions
│   │   ├── IssueLifecycleWorkflow.ts
│   │   ├── BatchCoordinatorWorkflow.ts
│   │   └── __tests__/          # Workflow tests
│   ├── activities/             # Temporal activity implementations
│   │   └── issue-activities.ts
│   ├── server/                 # Fastify API server
│   │   ├── routes/             # API route handlers
│   │   │   ├── telemetry.ts
│   │   │   ├── health.ts
│   │   │   └── ...
│   │   └── fastify.ts          # Server setup
│   ├── services/               # Business logic services
│   │   ├── TelemetryWriter.ts
│   │   ├── PerformanceCalculator.ts
│   │   └── ExceptionDetector.ts
│   ├── temporal/               # Temporal client/worker
│   │   ├── client.ts
│   │   ├── worker.ts
│   │   └── config.ts
│   ├── database/               # Database client and models
│   │   ├── client.ts
│   │   └── models/
│   ├── utils/                  # Shared utilities
│   │   └── logger.ts
│   └── index.ts                # Main entry point
├── dashboard/                  # React dashboard (separate app)
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   └── App.tsx
│   └── package.json
├── tests/                      # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                       # Documentation
├── migrations/                 # Database migrations
├── scripts/                    # Utility scripts
├── docker-compose.temporal.yml # Local Temporal setup
├── docker-compose.db.yml       # Local TimescaleDB setup
├── package.json
├── tsconfig.json
└── .env.local                  # Environment config (gitignored)
```

### Key Directories

- **`src/workflows/`**: Temporal workflow logic (orchestration)
- **`src/activities/`**: Temporal activity logic (actual work)
- **`src/server/routes/`**: REST API endpoints
- **`src/services/`**: Business logic (telemetry, performance, exceptions)
- **`tests/`**: All test files (unit, integration, E2E)

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- src/workflows/__tests__/IssueLifecycleWorkflow.test.ts

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Start dependencies first
docker-compose -f docker-compose.temporal.yml up -d
docker-compose -f docker-compose.db.yml up -d

# Run integration tests
npm run test:integration
```

### E2E Tests

```bash
# Start all services
npm run dev &
npm run worker:start &

# Run E2E tests
npm run test:e2e

# Stop services
pkill -f "npm run dev"
pkill -f "npm run worker"
```

### Coverage

```bash
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Test Structure

Example unit test:

```typescript
// src/workflows/__tests__/IssueLifecycleWorkflow.test.ts

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { IssueLifecycleWorkflow, IssueInput } from '../IssueLifecycleWorkflow';

describe('IssueLifecycleWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should complete successfully with all signals', async () => {
    const { client, nativeConnection } = testEnv;

    const handle = await client.workflow.start(IssueLifecycleWorkflow, {
      taskQueue: 'test',
      workflowId: 'test-issue-1',
      args: [{
        id: 'TASK-1',
        title: 'Test issue',
        epicId: 'EPIC-1',
        complexity: 1,
      }],
    });

    // Send signals
    await handle.signal('agentStarted', { agentId: 'agent-1', startTime: Date.now() });
    await handle.signal('commitMade', { sha: 'abc123', message: 'fix: bug', files: ['app.ts'] });
    await handle.signal('agentCompleted', { agentId: 'agent-1', duration: 1000 });
    await handle.signal('testResults', { passed: 10, failed: 0 });
    await handle.signal('reviewApproved');

    // Wait for completion
    await handle.result();

    // Assertions
    const status = await handle.query('getStatus');
    expect(status).toBe('completion');
  });
});
```

---

## Creating Workflows

Workflows define the orchestration logic. They coordinate activities and handle signals/queries.

### Workflow Template

```typescript
// src/workflows/MyNewWorkflow.ts

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
} from '@temporalio/workflow';
import type * as activities from '../activities/my-activities.js';

// Proxy activities
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    initialInterval: '5 seconds',
    backoffCoefficient: 2,
    maximumInterval: '5 minutes',
    maximumAttempts: 5,
  },
});

// Input/Output types
export interface MyWorkflowInput {
  id: string;
  name: string;
}

export interface MyWorkflowState {
  id: string;
  status: 'pending' | 'running' | 'completed';
  result?: any;
}

// Signals
export const mySignal = defineSignal<[{ data: string }]>('mySignal');

// Queries
export const getStatusQuery = defineQuery<string>('getStatus');

/**
 * MyNewWorkflow
 *
 * Description of what this workflow does.
 */
export async function MyNewWorkflow(input: MyWorkflowInput): Promise<void> {
  // Initialize state
  const state: MyWorkflowState = {
    id: input.id,
    status: 'pending',
  };

  // Signal handler
  let signalReceived = false;
  setHandler(mySignal, ({ data }) => {
    signalReceived = true;
    console.log('Signal received:', data);
  });

  // Query handler
  setHandler(getStatusQuery, () => state.status);

  try {
    // Update status
    state.status = 'running';

    // Execute activity
    const result = await myActivity({ id: input.id, name: input.name });

    // Wait for signal (with timeout)
    const signalTimeout = await condition(() => signalReceived, '10 minutes');
    if (!signalTimeout) {
      throw new Error('Signal not received within timeout');
    }

    // Complete
    state.status = 'completed';
    state.result = result;
  } catch (error: any) {
    // Handle failure
    throw error;
  }
}
```

### Best Practices

1. **Determinism**: Workflows must be deterministic
   - NO `Date.now()` - use Temporal's `Date.now()` or signals
   - NO `Math.random()` - use workflow-safe random
   - NO external API calls - use activities instead

2. **Idempotency**: Workflows can be replayed
   - State must be reconstructible from event history
   - Side effects only in activities

3. **Error Handling**: Use try/catch for SAGA compensation
   ```typescript
   try {
     await activity1();
     await activity2();
   } catch (error) {
     // Compensate
     await activity1Rollback();
     throw error;
   }
   ```

4. **Signals vs Activities**:
   - Use **signals** for external events (user input, webhooks)
   - Use **activities** for side effects (API calls, database writes)

5. **Timeouts**: Always set timeouts for conditions
   ```typescript
   const result = await condition(() => signalReceived, '10 minutes');
   if (!result) {
     throw new Error('Timeout waiting for signal');
   }
   ```

---

## Creating Activities

Activities perform the actual work (side effects). They can fail and retry.

### Activity Template

```typescript
// src/activities/my-activities.ts

import { Context } from '@temporalio/activity';
import logger from '../utils/logger.js';
import { telemetryWriter } from '../services/TelemetryWriter.js';

export interface MyActivityInput {
  id: string;
  name: string;
}

export interface MyActivityResult {
  success: boolean;
  data: any;
}

/**
 * My Activity
 *
 * Description of what this activity does.
 */
export async function myActivity(input: MyActivityInput): Promise<MyActivityResult> {
  const info = Context.current().info;
  const workflowId = info.workflowExecution.workflowId;

  logger.info({ activityName: 'myActivity', input }, 'Activity started');

  // Write telemetry
  await telemetryWriter.writeEvent({
    workflowId,
    workflowType: 'MyNewWorkflow',
    eventType: 'activity_started',
    eventCategory: 'activity',
    severity: 'info',
    activityName: 'myActivity',
    payload: input,
    source: 'temporal',
  });

  try {
    // Perform work
    // - Make API calls
    // - Write to database
    // - Execute shell commands
    // - Send emails/notifications

    const result = {
      success: true,
      data: { /* ... */ },
    };

    // Write success telemetry
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'MyNewWorkflow',
      eventType: 'activity_completed',
      eventCategory: 'activity',
      severity: 'info',
      activityName: 'myActivity',
      payload: result,
      source: 'temporal',
    });

    logger.info({ activityName: 'myActivity', result }, 'Activity completed');

    return result;
  } catch (error: any) {
    // Write failure telemetry
    await telemetryWriter.writeEvent({
      workflowId,
      workflowType: 'MyNewWorkflow',
      eventType: 'activity_failed',
      eventCategory: 'activity',
      severity: 'error',
      activityName: 'myActivity',
      errorMessage: error.message,
      errorStack: error.stack,
      source: 'temporal',
    });

    logger.error({ activityName: 'myActivity', error: error.message }, 'Activity failed');

    throw error;
  }
}
```

### Activity Best Practices

1. **Idempotency**: Activities may retry
   - Check if work already done (e.g., check if file exists before creating)
   - Use unique IDs to prevent duplicates

2. **Heartbeats**: For long-running activities (>1 minute)
   ```typescript
   import { Context } from '@temporalio/activity';

   export async function longRunningActivity() {
     const context = Context.current();

     for (let i = 0; i < 100; i++) {
       // Do work
       await doWork(i);

       // Send heartbeat every 10 iterations
       if (i % 10 === 0) {
         context.heartbeat({ progress: i });
       }
     }
   }
   ```

3. **Telemetry**: Always write events for observability
   - `activity_started` - when activity begins
   - `activity_completed` - when activity succeeds
   - `activity_failed` - when activity throws error

4. **Error Handling**: Let errors propagate
   - Temporal will retry based on retry policy
   - Only catch if you need custom logic

5. **Timeouts**: Set appropriate timeouts in workflow
   ```typescript
   const { myActivity } = proxyActivities<typeof activities>({
     startToCloseTimeout: '30 minutes',  // Total time allowed
     scheduleToCloseTimeout: '1 hour',    // Including queuing
     heartbeatTimeout: '5 minutes',       // For heartbeat activities
   });
   ```

---

## Coding Standards

### TypeScript

```typescript
// Use explicit types
function processIssue(issue: Issue): Result {
  // ...
}

// Prefer interfaces over types for objects
interface Issue {
  id: string;
  title: string;
  epicId?: string;
}

// Use async/await (not callbacks)
async function fetchData(): Promise<Data> {
  const response = await fetch(url);
  return response.json();
}

// Use nullish coalescing
const value = input.value ?? 'default';

// Use optional chaining
const name = user?.profile?.name;
```

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `issue-activities.ts`)
- **Classes**: `PascalCase` (e.g., `TelemetryWriter`)
- **Functions**: `camelCase` (e.g., `prepareIssue`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`)
- **Interfaces**: `PascalCase` (e.g., `IssueInput`)

### ESLint

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Prettier

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

Configured via Husky:

```bash
# Automatically runs on git commit:
- npm run lint
- npm run format:check
- npm run typecheck
```

### Comments

```typescript
/**
 * Prepare Issue Activity
 *
 * Sets up the issue for development:
 * - Validates issue exists in tracker
 * - Generates issue documentation
 * - Creates feature branch
 *
 * @param input - Issue preparation input
 * @returns Preparation result with branch name
 */
export async function prepareIssue(input: PrepareIssueInput): Promise<PrepareIssueResult> {
  // Implementation
}
```

---

## Debugging

### VSCode Configuration

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Worker",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "worker"],
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:unit"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Logging

```typescript
import logger from '../utils/logger.js';

// Log levels
logger.debug('Debug message', { data: 'value' });
logger.info('Info message', { data: 'value' });
logger.warn('Warning message', { data: 'value' });
logger.error('Error message', { error: error.message });

// Structured logging (outputs JSON)
logger.info({
  issueId: 'TASK-123',
  duration: 1234,
  success: true,
}, 'Issue completed');
```

### Temporal Workflow Debugging

1. **Use Temporal Web UI**: http://localhost:8088
   - View Event History
   - See query/signal payloads
   - Inspect workflow state

2. **Add console.log in workflows** (visible in worker logs):
   ```typescript
   console.log('Current state:', state);
   ```

3. **Use queries to inspect state**:
   ```typescript
   // In workflow
   setHandler(getStateQuery, () => state);

   // Query from client
   const state = await handle.query('getState');
   console.log('Workflow state:', state);
   ```

4. **Replay workflows locally**:
   ```typescript
   // Download workflow history from Temporal UI
   // Replay in test environment
   import { WorkflowExecutionHistory } from '@temporalio/client';

   const history = await client.workflow.getHistory('workflow-id');
   // Test replay
   ```

### Database Debugging

```bash
# Connect to database
psql postgresql://archie_user:password@localhost:21006/martha_development

# View recent telemetry
SELECT * FROM telemetry_events ORDER BY timestamp DESC LIMIT 10;

# Check workflow metadata
SELECT * FROM telemetry_metadata WHERE workflow_id = 'issue-TASK-123';

# View exceptions
SELECT * FROM exceptions ORDER BY detected_at DESC LIMIT 10;
```

---

## Contributing

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-new-feature

# 2. Make changes
# ...

# 3. Run tests
npm run test

# 4. Commit (triggers pre-commit hooks)
git add .
git commit -m "feat: add new feature"

# 5. Push to remote
git push origin feature/my-new-feature

# 6. Create Pull Request on GitHub
```

### Commit Messages

Follow Conventional Commits:

```
feat: add new workflow for batch processing
fix: correct telemetry timestamp handling
docs: update developer guide with examples
chore: upgrade dependencies
test: add unit tests for IssueLifecycle
refactor: simplify activity error handling
```

### Pull Request Checklist

- [ ] Tests pass (`npm run test`)
- [ ] Code formatted (`npm run format`)
- [ ] No lint errors (`npm run lint`)
- [ ] Type checks pass (`npm run typecheck`)
- [ ] Documentation updated (if needed)
- [ ] Changelog entry added (for significant changes)

### Code Review Guidelines

- Clear description of changes
- Screenshots for UI changes
- Performance impact noted (if any)
- Breaking changes highlighted

---

**For more information**, see:
- System Overview: `SYSTEM_OVERVIEW.md`
- Operator Runbook: `OPERATOR_RUNBOOK.md`
- API Reference: `API_REFERENCE.md`
- Architecture Diagrams: `ARCHITECTURE_DIAGRAMS.md`
