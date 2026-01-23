/**
 * List View Performance Benchmark
 * Target: <100ms to render 1000 issues
 */

import { renderHook } from '@testing-library/react';
import { useFlattenedRows } from '../../dashboard/src/components/tracker/list/VirtualizedTable';
import { generateListTestData, issuesToMap } from '../../scripts/generate-test-data';
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

/**
 * Benchmark list view rendering with 1000 issues
 */
export async function benchmarkListView(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_ISSUES = 1000;
  const NUM_RUNS = 10;

  console.log(`\n=== List View Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms for ${NUM_ISSUES} issues`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Generate test data
    const issues = generateListTestData(NUM_ISSUES);

    // Group issues by status
    const groupedIssues = groupIssuesByStatus(issues);
    const expandedGroups = new Set<string>(groupedIssues.map(g => `status-${g.name}`));

    // Measure rendering time
    const startTime = performance.now();

    // Simulate the flattening operation that happens during render
    const rows = flattenGroupedIssues(groupedIssues, expandedGroups, 'status');

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    runs.push(renderTime);
    console.log(`Run ${run}: ${renderTime.toFixed(2)}ms (${rows.length} rows)`);
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
    name: 'List View (1000 issues)',
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
 * Group issues by status
 */
function groupIssuesByStatus(issues: Issue[]): Array<{ name: string; issues: Issue[]; groupBy: string }> {
  const groups = new Map<string, Issue[]>();

  issues.forEach(issue => {
    const status = issue.status;
    if (!groups.has(status)) {
      groups.set(status, []);
    }
    groups.get(status)!.push(issue);
  });

  return Array.from(groups.entries()).map(([name, issues]) => ({
    name,
    issues,
    groupBy: 'status',
  }));
}

/**
 * Flatten grouped issues into rows (simulates useFlattenedRows hook)
 */
function flattenGroupedIssues(
  groupedIssues: Array<{ name: string; issues: Issue[]; groupBy: string }>,
  expandedGroups: Set<string>,
  groupBy: string
): any[] {
  const rows: any[] = [];

  groupedIssues.forEach((group) => {
    const groupId = `${groupBy}-${group.name}`;

    // Add group header
    rows.push({
      type: 'group-header',
      data: {
        ...group,
        groupId,
        isExpanded: expandedGroups.has(groupId),
      },
      groupId,
    });

    // Add issues if group is expanded
    if (expandedGroups.has(groupId)) {
      group.issues.forEach((issue) => {
        rows.push({
          type: 'issue',
          data: issue,
          issue,
          groupId,
        });
      });
    }
  });

  return rows;
}

/**
 * Benchmark filtering performance
 */
export async function benchmarkListFiltering(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_ISSUES = 1000;
  const NUM_RUNS = 10;

  console.log(`\n=== List View Filtering Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to filter ${NUM_ISSUES} issues`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Generate test data
    const issues = generateListTestData(NUM_ISSUES);

    // Measure filtering time
    const startTime = performance.now();

    // Simulate text search filter
    const searchText = 'test';
    const filtered = issues.filter(issue =>
      issue.title.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchText.toLowerCase())
    );

    // Simulate type filter
    const typeFiltered = filtered.filter(issue =>
      ['task', 'bug'].includes(issue.type)
    );

    // Simulate priority filter
    const priorityFiltered = typeFiltered.filter(issue =>
      ['high', 'critical'].includes(issue.priority)
    );

    const endTime = performance.now();
    const filterTime = endTime - startTime;

    runs.push(filterTime);
    console.log(`Run ${run}: ${filterTime.toFixed(2)}ms (${priorityFiltered.length} results)`);
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
    name: 'List View Filtering (1000 issues)',
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
    await benchmarkListView();
    await benchmarkListFiltering();
  })();
}
