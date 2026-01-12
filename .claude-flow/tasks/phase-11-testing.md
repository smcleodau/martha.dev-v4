# Phase 11: Testing & Validation

## Goal
Comprehensive test coverage (80%+) across unit, integration, and E2E tests.

## Tasks

### 1. Write Unit Tests

**Test Files to Create:**

**Core Tests:**
- `tests/unit/config.test.ts` - Configuration loader
- `tests/unit/logger.test.ts` - Logging functionality
- `tests/unit/connection-manager.test.ts` - WebSocket management
- `tests/unit/event-store.test.ts` - Redis event storage

**Integration Tests:**
- `tests/unit/cloudflare/*.test.ts` - Cloudflare API, tunnel manager, DNS
- `tests/unit/github/*.test.ts` - GitHub client, GraphQL, issue tracker
- `tests/unit/swarm/*.test.ts` - Swarm orchestrator, repository
- `tests/unit/test-runner.test.ts` - Test execution
- `tests/unit/evidence/*.test.ts` - Evidence collection, validation

**MCP Tests:**
- `tests/unit/mcp/epic-tools.test.ts` - Epic management tools
- `tests/unit/mcp/worktree-tools.test.ts` - Worktree tools
- `tests/unit/mcp/swarm-tools.test.ts` - Swarm tools
- `tests/unit/mcp/test-tools.test.ts` - Test tools
- `tests/unit/mcp/evidence-tools.test.ts` - Evidence tools
- `tests/unit/mcp/tunnel-tools.test.ts` - Tunnel tools

### 2. Write Integration Tests

**Test Scenarios:**

**Worktree Lifecycle:**
```typescript
describe('Worktree Lifecycle', () => {
  it('should create worktree with agent and tunnel', async () => {
    // 1. Create worktree via MCP tool
    const result = await mcpClient.callTool('martha__worktree__create', {
      epic_number: 123,
      branch_name: 'test-feature'
    });

    // 2. Verify worktree exists
    const worktrees = await axios.get('http://localhost:21000/api/v1/worktrees');
    expect(worktrees.data.worktrees).toHaveLength(1);

    // 3. Verify agent connected
    expect(worktrees.data.worktrees[0].status).toBe('online');

    // 4. Verify tunnel created
    expect(worktrees.data.worktrees[0].tunnel).toBeDefined();

    // 5. Cleanup
    await mcpClient.callTool('martha__worktree__destroy', {
      worktree_name: 'test-feature'
    });
  });
});
```

**Epic to Evidence Flow:**
```typescript
describe('Epic to Evidence Flow', () => {
  it('should track epic from start to evidence posting', async () => {
    // 1. Start epic
    const epic = await mcpClient.callTool('martha__epic__start', {
      epic_number: 456
    });

    // 2. Spawn swarm
    const swarm = await mcpClient.callTool('martha__swarm__spawn', {
      epic_number: 456,
      worktree_path: epic.worktree_path
    });

    // 3. Run tests
    const tests = await mcpClient.callTool('martha__test__trigger', {
      worktree_name: epic.worktree_name,
      test_suites: ['unit', 'integration']
    });

    // 4. Collect evidence
    const evidence = await mcpClient.callTool('martha__evidence__collect', {
      issue_number: 456
    });

    // 5. Verify validation
    expect(evidence.validation.valid).toBe(true);

    // 6. Post to GitHub
    const posted = await mcpClient.callTool('martha__evidence__post_to_github', {
      issue_number: 456,
      evidence_bundle: evidence
    });

    expect(posted.comment_url).toBeDefined();
  });
});
```

### 3. Write E2E Tests

**Playwright E2E Tests:**

**Dashboard Tests:**
```typescript
test('Dashboard displays service health', async ({ page }) => {
  await page.goto('http://localhost:21004');

  // Check service status
  await expect(page.locator('[data-testid="service-status"]')).toHaveText('Healthy');

  // Check worktrees list
  const worktrees = page.locator('[data-testid="worktree-card"]');
  await expect(worktrees).toHaveCount(1);
});
```

**API Tests:**
```typescript
test('API health check responds', async ({ request }) => {
  const response = await request.get('http://localhost:21000/health');
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.status).toBe('healthy');
  expect(data.version).toBe('3.0.0');
});
```

### 4. Run Test Suite

**Commands:**
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

### 5. Validate Coverage

**Coverage Targets:**
- Overall: 80%+
- Core modules: 90%+
- Integration modules: 70%+
- MCP tools: 85%+

**Coverage Report:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Jest Configuration

Update `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

## Test Setup

Create `tests/setup.ts`:
```typescript
// Setup test database
beforeAll(async () => {
  // Create test database schema
  await pool.query('CREATE SCHEMA IF NOT EXISTS ts_martha_test');

  // Run migrations
  await runMigrations();

  // Start test server
  await startTestServer();
});

afterAll(async () => {
  // Cleanup test data
  await pool.query('DROP SCHEMA ts_martha_test CASCADE');

  // Close connections
  await pool.end();
  await redisClient.quit();

  // Stop test server
  await stopTestServer();
});
```

## Performance Testing

**Load Tests:**
```typescript
describe('Load Testing', () => {
  it('should handle 100 concurrent requests', async () => {
    const promises = Array(100).fill(null).map(() =>
      axios.get('http://localhost:21000/health')
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r.status === 200)).toBe(true);
  });

  it('should handle 10 concurrent MCP tool calls', async () => {
    const promises = Array(10).fill(null).map(() =>
      mcpClient.callTool('martha__worktree__list_all', {})
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
  });
});
```

## Success Criteria

- [ ] 80%+ code coverage achieved
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Performance tests meet targets
- [ ] No memory leaks detected
- [ ] Load tests pass

## Files: ~2,000 lines of tests

## Commit Message Template

```
Implement Phase 11: Comprehensive testing

Created test suite with 80%+ coverage:
- Unit tests for all core modules
- Integration tests for workflows
- E2E tests for API and dashboard
- Performance and load testing
- Coverage validation

Test categories:
- Unit: 150+ tests
- Integration: 50+ tests
- E2E: 30+ tests

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```
