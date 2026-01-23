/**
 * Filtering Performance Benchmark
 * Target: <100ms to filter and update view
 */

import { generateFilterTestData } from '../../scripts/generate-test-data';
import type { Issue } from '../../dashboard/src/api/tracker';

interface BenchmarkResult {
  name: string;
  target: number;
  runs: number[];
  average: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  passed: boolean;
}

interface FilterState {
  searchText: string;
  types: string[];
  priorities: string[];
  initiatives: string[];
  teams: string[];
  assignees: string[];
  labels: string[];
  showMyIssues: boolean;
  showUnassigned: boolean;
  startDateRange?: { from: Date; to: Date };
  dueDateRange?: { from: Date; to: Date };
}

/**
 * Filter issues based on filter state (from TrackerPage.tsx)
 */
function filterIssues(allIssues: Issue[], filters: FilterState): Issue[] {
  let filtered = [...allIssues];

  // Text search
  if (filters.searchText) {
    const searchLower = filters.searchText.toLowerCase();
    filtered = filtered.filter(issue => {
      // Search in title and description
      const matchesText = issue.title.toLowerCase().includes(searchLower) ||
        issue.description?.toLowerCase().includes(searchLower);

      // Check for special syntax (type:, priority:, status:)
      if (searchLower.includes(':')) {
        const [key, value] = searchLower.split(':', 2);
        if (key === 'type' && value) return issue.type === value.trim();
        if (key === 'priority' && value) return issue.priority === value.trim();
        if (key === 'status' && value) return issue.status === value.trim();
      }

      return matchesText;
    });
  }

  // Type filter
  if (filters.types.length > 0) {
    filtered = filtered.filter(issue => filters.types.includes(issue.type));
  }

  // Priority filter
  if (filters.priorities.length > 0) {
    filtered = filtered.filter(issue => filters.priorities.includes(issue.priority));
  }

  // My issues filter
  if (filters.showMyIssues) {
    filtered = filtered.filter(issue => issue.assignee !== null);
  }

  // Unassigned filter
  if (filters.showUnassigned) {
    filtered = filtered.filter(issue => issue.assignee === null);
  }

  // Initiative filter
  if (filters.initiatives.length > 0) {
    filtered = filtered.filter(issue =>
      issue.initiative_id && filters.initiatives.includes(issue.initiative_id)
    );
  }

  // Team filter
  if (filters.teams.length > 0) {
    filtered = filtered.filter(issue =>
      issue.team_ids && issue.team_ids.some((teamId: string) => filters.teams.includes(teamId))
    );
  }

  // Assignee filter
  if (filters.assignees.length > 0) {
    filtered = filtered.filter(issue =>
      issue.assignee && filters.assignees.includes(issue.assignee.id)
    );
  }

  // Label filter
  if (filters.labels.length > 0) {
    filtered = filtered.filter(issue =>
      issue.labels.some(label => filters.labels.includes(label))
    );
  }

  // Date range filters
  if (filters.startDateRange) {
    const { from, to } = filters.startDateRange;
    filtered = filtered.filter(issue => {
      if (!issue.start_date) return false;
      const startDate = new Date(issue.start_date);
      return startDate >= from && startDate <= to;
    });
  }

  if (filters.dueDateRange) {
    const { from, to } = filters.dueDateRange;
    filtered = filtered.filter(issue => {
      if (!issue.due_date) return false;
      const dueDate = new Date(issue.due_date);
      return dueDate >= from && dueDate <= to;
    });
  }

  return filtered;
}

/**
 * Benchmark text search filtering
 */
export async function benchmarkTextSearch(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_ISSUES = 1000;
  const NUM_RUNS = 10;

  console.log(`\n=== Text Search Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to filter ${NUM_ISSUES} issues`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  // Generate test data once
  const issues = generateFilterTestData(NUM_ISSUES);

  for (let run = 1; run <= NUM_RUNS; run++) {
    const filters: FilterState = {
      searchText: 'test task',
      types: [],
      priorities: [],
      initiatives: [],
      teams: [],
      assignees: [],
      labels: [],
      showMyIssues: false,
      showUnassigned: false,
    };

    // Measure filtering time
    const startTime = performance.now();

    const filtered = filterIssues(issues, filters);

    const endTime = performance.now();
    const filterTime = endTime - startTime;

    runs.push(filterTime);
    console.log(`Run ${run}: ${filterTime.toFixed(2)}ms (${filtered.length} results)`);
  }

  // Calculate statistics
  const sorted = [...runs].sort((a, b) => a - b);
  const average = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const passed = average < TARGET_MS;

  console.log(`\nResults:`);
  console.log(`  Average: ${average.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  return {
    name: 'Text Search (1000 issues)',
    target: TARGET_MS,
    runs,
    average,
    min,
    max,
    p95,
    p99,
    passed,
  };
}

/**
 * Benchmark multi-filter combination
 */
export async function benchmarkMultiFilter(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_ISSUES = 1000;
  const NUM_RUNS = 10;

  console.log(`\n=== Multi-Filter Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to apply multiple filters to ${NUM_ISSUES} issues`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  // Generate test data once
  const issues = generateFilterTestData(NUM_ISSUES);

  for (let run = 1; run <= NUM_RUNS; run++) {
    const filters: FilterState = {
      searchText: 'test',
      types: ['task', 'bug'],
      priorities: ['high', 'critical'],
      initiatives: [],
      teams: [],
      assignees: [],
      labels: ['frontend', 'backend'],
      showMyIssues: false,
      showUnassigned: false,
    };

    // Measure filtering time
    const startTime = performance.now();

    const filtered = filterIssues(issues, filters);

    const endTime = performance.now();
    const filterTime = endTime - startTime;

    runs.push(filterTime);
    console.log(`Run ${run}: ${filterTime.toFixed(2)}ms (${filtered.length} results)`);
  }

  // Calculate statistics
  const sorted = [...runs].sort((a, b) => a - b);
  const average = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const passed = average < TARGET_MS;

  console.log(`\nResults:`);
  console.log(`  Average: ${average.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  return {
    name: 'Multi-Filter (1000 issues)',
    target: TARGET_MS,
    runs,
    average,
    min,
    max,
    p95,
    p99,
    passed,
  };
}

/**
 * Benchmark date range filtering
 */
export async function benchmarkDateRangeFilter(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_ISSUES = 1000;
  const NUM_RUNS = 10;

  console.log(`\n=== Date Range Filter Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to filter by date range`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  // Generate test data once
  const issues = generateFilterTestData(NUM_ISSUES);

  for (let run = 1; run <= NUM_RUNS; run++) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const filters: FilterState = {
      searchText: '',
      types: [],
      priorities: [],
      initiatives: [],
      teams: [],
      assignees: [],
      labels: [],
      showMyIssues: false,
      showUnassigned: false,
      dueDateRange: {
        from: thirtyDaysAgo,
        to: thirtyDaysFromNow,
      },
    };

    // Measure filtering time
    const startTime = performance.now();

    const filtered = filterIssues(issues, filters);

    const endTime = performance.now();
    const filterTime = endTime - startTime;

    runs.push(filterTime);
    console.log(`Run ${run}: ${filterTime.toFixed(2)}ms (${filtered.length} results)`);
  }

  // Calculate statistics
  const sorted = [...runs].sort((a, b) => a - b);
  const average = runs.reduce((a, b) => a + b, 0) / runs.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const passed = average < TARGET_MS;

  console.log(`\nResults:`);
  console.log(`  Average: ${average.toFixed(2)}ms`);
  console.log(`  Min: ${min.toFixed(2)}ms`);
  console.log(`  Max: ${max.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  console.log(`  Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);

  return {
    name: 'Date Range Filter (1000 issues)',
    target: TARGET_MS,
    runs,
    average,
    min,
    max,
    p95,
    p99,
    passed,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await benchmarkTextSearch();
    await benchmarkMultiFilter();
    await benchmarkDateRangeFilter();
  })();
}
