# Phase 9: Evidence Collection

## Goal
Implement Braintrust + Browserbase integration for traceability and evidence validation.

## Tasks

### 1. Implement Braintrust Client (`src/integrations/braintrust/client.ts`)

**Methods:**
- `captureTrace(options: TraceOptions): Promise<{traceId, url}>`
- `getTracesByIssue(issueNumber: number): Promise<BraintrustTrace[]>`
- `getTracesByWorktree(worktreeName: string): Promise<BraintrustTrace[]>`

**Integration:**
```typescript
import { Braintrust } from 'braintrust';

async captureTrace(options: {
  project: string;
  experiment: string;
  epicNumber: number;
  issueNumber: number;
  operation: string;
  inputs: any;
  output: any;
}) {
  const trace = await this.client.log({
    project: options.project,
    experiment: options.experiment,
    inputs: options.inputs,
    output: options.output,
    metadata: {
      epic_number: options.epicNumber,
      issue_number: options.issueNumber
    },
    tags: [
      `epic:${options.epicNumber}`,
      `issue:${options.issueNumber}`,
      options.operation
    ]
  });

  return {
    traceId: trace.id,
    url: `https://braintrust.dev/traces/${trace.id}`
  };
}
```

### 2. Implement Browserbase Client (`src/integrations/browserbase/client.ts`)

**Methods:**
- `createSession(options: SessionOptions): Promise<BrowserbaseSession>`
- `getSessionsByIssue(issueNumber: number): Promise<BrowserbaseSession[]>`
- `listSessions(): Promise<BrowserbaseSession[]>`

**Integration with Playwright:**
```typescript
import Browserbase from '@browserbasehq/sdk';

async createSession(options: { issueNumber: number; testName: string }) {
  const session = await this.client.sessions.create({
    projectId: this.projectId,
    browserSettings: {
      recordSession: true,
      recordNetwork: true
    }
  });

  await this.client.sessions.update(session.id, {
    metadata: {
      issue_number: options.issueNumber,
      test_name: options.testName
    }
  });

  return {
    id: session.id,
    url: session.connectUrl,
    replayUrl: `https://www.browserbase.com/sessions/${session.id}`
  };
}
```

### 3. Implement Evidence Collector (`src/core/evidence-collector.ts`)

**Core Method:**
```typescript
async collect(issueNumber: number): Promise<EvidenceBundle> {
  // 1. Verify test artifacts with timestamps
  const testEvidence = await this.verifyTestArtifacts(worktree.path, issueNumber);

  // 2. Get Braintrust traces
  const traces = await this.braintrustClient.getTracesByIssue(issueNumber);

  // 3. Get Browserbase sessions
  const sessions = await this.browserbaseClient.getSessionsByIssue(issueNumber);

  // 4. Get commits
  const commits = await this.githubClient.getCommitsForIssue(issueNumber);

  // 5. Cross-reference with swarm logs
  const swarmLogs = await this.readSwarmLogs(worktree.path);

  // 6. Validate with timestamp correlation
  const validation = this.validateWithTimestamps({
    testEvidence,
    traces,
    sessions,
    commits,
    swarmLogs
  });

  return {
    issue_number: issueNumber,
    tests: testEvidence,
    traces,
    sessions,
    commits,
    validation,
    timestamp: new Date()
  };
}
```

**Validation Strategy:**
```typescript
private validateWithTimestamps(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check test artifact age
  if (data.testEvidence.age_minutes > 60) {
    warnings.push(`Test artifacts are ${Math.floor(data.testEvidence.age_minutes)} minutes old`);
  }

  // Cross-reference test timestamp with commits
  const lastCommit = data.commits[0];
  if (lastCommit && data.testEvidence.timestamp < new Date(lastCommit.timestamp)) {
    errors.push('Test artifacts older than last commit');
  }

  // Verify tests passed
  if (!this.testsPassedFromEvidence(data.testEvidence)) {
    errors.push('Tests did not pass');
  }

  // Check coverage threshold
  if (data.testEvidence.coverage < 80) {
    warnings.push(`Coverage ${data.testEvidence.coverage}% below 80%`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    confidence_score: this.calculateConfidenceScore(data, errors, warnings)
  };
}
```

### 4. Implement MCP Evidence Tools (`src/mcp/tools/evidence-tools.ts`)

**Four tools:**
- `martha__evidence__collect` - Collect all evidence for issue
- `martha__evidence__post_to_github` - Post evidence comment to GitHub
- `martha__evidence__validate` - Validate evidence bundle
- `martha__evidence__get_traces` - Get Braintrust traces for issue

## Dependencies

```bash
npm install braintrust @browserbasehq/sdk --save
```

## Success Criteria
- [ ] Braintrust traces collected
- [ ] Browserbase sessions recorded
- [ ] Evidence validation with confidence scoring
- [ ] Timestamp correlation works
- [ ] GitHub comment posting works
- [ ] MCP tools functional

## Files: ~1,500 lines total
