# Phase 8: Test Orchestration

## Goal
Implement automated test execution, result parsing, and coverage tracking.

## Tasks

### 1. Implement Test Runner (`src/core/test-runner.ts`)

**Methods:**
- `executeTests(worktreeName: string, suites: string[]): Promise<TestExecution>`
- `parseResults(output: string, framework: string): TestResults`
- `extractCoverage(worktreePath: string): Promise<CoverageData>`
- `validateQualityGates(results: TestResults): QualityGateResult`

**Execution Strategy:**
```typescript
async executeTests(worktreeName: string, suites: string[]) {
  // 1. Get worktree info
  const worktree = await worktreeRepository.findByName(worktreeName);

  // 2. Execute tests in Docker container
  const result = await exec(`docker exec archie-${worktreeName}-app npm test`);

  // 3. Parse output
  const parsed = this.parseResults(result.stdout, 'jest');

  // 4. Extract coverage
  const coverage = await this.extractCoverage(worktree.path);

  // 5. Store in database
  return await testRepository.create({
    worktreeId: worktree.id,
    suites,
    results: parsed,
    coverage
  });
}
```

### 2. Implement Test Repository (`src/database/repositories/test-repository.ts`)

**Methods:**
- `create(data: CreateTestExecutionDTO): Promise<TestExecution>`
- `findById(id: string): Promise<TestExecution | null>`
- `findByWorktree(worktreeId: number): Promise<TestExecution[]>`
- `findByIssue(issueNumber: number): Promise<TestExecution[]>`
- `getHistory(worktreeId: number, limit: number): Promise<TestExecution[]>`

### 3. Implement Result Parsers (`src/core/test-parsers.ts`)

Support for multiple frameworks:
- Jest (JSON reporter)
- Playwright (JSON reporter)
- Pytest (JUnit XML)
- Vitest (JSON reporter)

### 4. Implement MCP Test Tools (`src/mcp/tools/test-tools.ts`)

**Three tools:**
- `martha__test__trigger` - Execute tests
- `martha__test__get_results` - Get test results by ID
- `martha__test__get_history` - Get test history for worktree

## Success Criteria
- [ ] Can execute tests in Docker
- [ ] Parses Jest/Playwright/Pytest results
- [ ] Extracts coverage data
- [ ] Stores results in database
- [ ] MCP tools work end-to-end

## Files: ~1,200 lines total
