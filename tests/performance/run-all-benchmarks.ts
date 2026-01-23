/**
 * Master Benchmark Runner
 * Runs all performance benchmarks and generates report
 */

import { benchmarkListView, benchmarkListFiltering } from './benchmark-list-view';
import { benchmarkTimelineView, benchmarkTimelineNavigation } from './benchmark-timeline-view';
import { benchmarkGanttView, benchmarkCriticalPath } from './benchmark-gantt-view';
import { benchmarkTextSearch, benchmarkMultiFilter, benchmarkDateRangeFilter } from './benchmark-filtering';
import * as fs from 'fs';
import * as path from 'path';

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

interface BenchmarkSummary {
  timestamp: string;
  results: BenchmarkResult[];
  totalTests: number;
  passed: number;
  failed: number;
  overallStatus: 'PASS' | 'FAIL';
}

/**
 * Run all benchmarks and generate report
 */
async function runAllBenchmarks(): Promise<BenchmarkSummary> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     MARTHA TRACKER - PERFORMANCE BENCHMARK SUITE               ║');
  console.log('║     MTH-058: Performance Benchmarks & Optimization             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: BenchmarkResult[] = [];

  try {
    // List View Benchmarks
    console.log('\n┌─ LIST VIEW BENCHMARKS ─────────────────────────────────────┐');
    results.push(await benchmarkListView());
    results.push(await benchmarkListFiltering());
    console.log('└────────────────────────────────────────────────────────────┘');

    // Timeline View Benchmarks
    console.log('\n┌─ TIMELINE VIEW BENCHMARKS ─────────────────────────────────┐');
    results.push(await benchmarkTimelineView());
    results.push(await benchmarkTimelineNavigation());
    console.log('└────────────────────────────────────────────────────────────┘');

    // Gantt View Benchmarks
    console.log('\n┌─ GANTT VIEW BENCHMARKS ────────────────────────────────────┐');
    results.push(await benchmarkGanttView());
    results.push(await benchmarkCriticalPath());
    console.log('└────────────────────────────────────────────────────────────┘');

    // Filtering Benchmarks
    console.log('\n┌─ FILTERING BENCHMARKS ─────────────────────────────────────┐');
    results.push(await benchmarkTextSearch());
    results.push(await benchmarkMultiFilter());
    results.push(await benchmarkDateRangeFilter());
    console.log('└────────────────────────────────────────────────────────────┘');

  } catch (error) {
    console.error('\n❌ Benchmark execution failed:', error);
    throw error;
  }

  // Calculate summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const overallStatus: 'PASS' | 'FAIL' = failed === 0 ? 'PASS' : 'FAIL';

  const summary: BenchmarkSummary = {
    timestamp: new Date().toISOString(),
    results,
    totalTests: results.length,
    passed,
    failed,
    overallStatus,
  };

  // Print summary
  printSummary(summary);

  // Generate markdown report
  generateMarkdownReport(summary);

  return summary;
}

/**
 * Print summary to console
 */
function printSummary(summary: BenchmarkSummary): void {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    BENCHMARK SUMMARY                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Overall Status: ${summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  console.log('Individual Results:');
  console.log('');

  summary.results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'PASS' : 'FAIL';
    console.log(`${status} ${result.name}`);
    console.log(`   Target: ${result.target}ms | Average: ${result.average.toFixed(2)}ms | P95: ${result.p95.toFixed(2)}ms`);
  });

  console.log('');
  console.log('Report saved to: /mnt/data/martha.dev-v4/test-results/MTH-058-PERFORMANCE-REPORT.md');
  console.log('');
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(summary: BenchmarkSummary): void {
  const reportPath = path.join(process.cwd(), 'test-results', 'MTH-058-PERFORMANCE-REPORT.md');

  let markdown = `# MTH-058: Performance Benchmark Report

**Generated:** ${new Date(summary.timestamp).toLocaleString()}
**Status:** ${summary.overallStatus === 'PASS' ? '✅ PASS' : '❌ FAIL'}
**Tests:** ${summary.passed}/${summary.totalTests} passed

## Executive Summary

This report contains the results of comprehensive performance benchmarks for the Martha Tracker application, measuring rendering and filtering performance across all major views.

### Performance Targets

| View | Target | Status |
|------|--------|--------|
| List View (1000 issues) | <100ms | ${summary.results.find(r => r.name.includes('List View (1000 issues)'))?.passed ? '✅' : '❌'} |
| Timeline View (500 events) | <200ms | ${summary.results.find(r => r.name.includes('Timeline View (500 events)'))?.passed ? '✅' : '❌'} |
| Gantt View (200 tasks) | <300ms | ${summary.results.find(r => r.name.includes('Gantt View (200 tasks)'))?.passed ? '✅' : '❌'} |
| Filter Response | <100ms | ${summary.results.find(r => r.name.includes('Text Search'))?.passed ? '✅' : '❌'} |

## Detailed Results

`;

  // Group results by category
  const categories = [
    { name: 'List View', results: summary.results.filter(r => r.name.includes('List')) },
    { name: 'Timeline View', results: summary.results.filter(r => r.name.includes('Timeline')) },
    { name: 'Gantt View', results: summary.results.filter(r => r.name.includes('Gantt') || r.name.includes('Critical')) },
    { name: 'Filtering', results: summary.results.filter(r => r.name.includes('Search') || r.name.includes('Filter') || r.name.includes('Date Range')) },
  ];

  categories.forEach(category => {
    markdown += `### ${category.name}\n\n`;

    category.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      markdown += `#### ${result.name} - ${status}\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| Target | ${result.target}ms |\n`;
      markdown += `| Average | ${result.average.toFixed(2)}ms |\n`;
      markdown += `| Min | ${result.min.toFixed(2)}ms |\n`;
      markdown += `| Max | ${result.max.toFixed(2)}ms |\n`;
      markdown += `| P95 | ${result.p95.toFixed(2)}ms |\n`;
      markdown += `| P99 | ${result.p99.toFixed(2)}ms |\n`;
      markdown += `| Status | ${result.passed ? 'Within target' : 'Exceeds target'} |\n\n`;

      // Add distribution visualization
      markdown += `**Performance Distribution:**\n\n`;
      markdown += '```\n';
      const bars = result.runs.map(r => {
        const barLength = Math.round((r / result.max) * 40);
        const bar = '█'.repeat(barLength);
        return `${r.toFixed(2)}ms ${bar}`;
      });
      markdown += bars.join('\n');
      markdown += '\n```\n\n';
    });
  });

  // Add recommendations
  markdown += `## Optimization Analysis\n\n`;

  const failedTests = summary.results.filter(r => !r.passed);
  if (failedTests.length === 0) {
    markdown += `✅ **All performance targets met!** No immediate optimizations required.\n\n`;
    markdown += `### Recommended Optimizations for Future\n\n`;
    markdown += `1. **Code Splitting** - Further split components to reduce initial bundle size\n`;
    markdown += `2. **Service Worker** - Implement caching for offline support\n`;
    markdown += `3. **Web Workers** - Move heavy computations to background threads\n`;
    markdown += `4. **Database Indexing** - Add indexes for frequently queried fields\n`;
  } else {
    markdown += `⚠️ **${failedTests.length} test(s) exceeded target performance.** Recommended optimizations:\n\n`;

    failedTests.forEach(result => {
      markdown += `### ${result.name}\n\n`;
      markdown += `**Issue:** Average ${result.average.toFixed(2)}ms exceeds target of ${result.target}ms by ${(result.average - result.target).toFixed(2)}ms\n\n`;

      if (result.name.includes('List')) {
        markdown += `**Recommendations:**\n`;
        markdown += `- Implement row virtualization with dynamic heights\n`;
        markdown += `- Memoize row rendering components\n`;
        markdown += `- Use React.memo() for row components\n`;
        markdown += `- Debounce filter updates\n`;
      } else if (result.name.includes('Timeline')) {
        markdown += `**Recommendations:**\n`;
        markdown += `- Optimize event layout algorithm\n`;
        markdown += `- Implement event caching\n`;
        markdown += `- Use canvas rendering for large event counts\n`;
        markdown += `- Lazy load events outside visible range\n`;
      } else if (result.name.includes('Gantt')) {
        markdown += `**Recommendations:**\n`;
        markdown += `- Optimize dependency graph calculation\n`;
        markdown += `- Use memoization for critical path\n`;
        markdown += `- Implement incremental rendering\n`;
        markdown += `- Cache task positions\n`;
      } else if (result.name.includes('Filter')) {
        markdown += `**Recommendations:**\n`;
        markdown += `- Implement indexed search (e.g., Fuse.js)\n`;
        markdown += `- Use Web Workers for filtering\n`;
        markdown += `- Debounce filter input\n`;
        markdown += `- Cache filter results\n`;
      }
      markdown += `\n`;
    });
  }

  // Add current optimizations
  markdown += `## Current Optimizations\n\n`;
  markdown += `The following optimizations are already implemented:\n\n`;
  markdown += `1. ✅ **Virtualization** - Using @tanstack/react-virtual for list views\n`;
  markdown += `2. ✅ **React Query Caching** - API responses cached with staleTime\n`;
  markdown += `3. ✅ **Debouncing** - Search input debounced to reduce re-renders\n`;
  markdown += `4. ✅ **Memoization** - useMemo for expensive calculations\n`;
  markdown += `5. ✅ **Code Splitting** - React.lazy and Suspense for route-based splitting\n\n`;

  markdown += `## Test Environment\n\n`;
  markdown += `- **Node Version:** ${process.version}\n`;
  markdown += `- **Platform:** ${process.platform}\n`;
  markdown += `- **Architecture:** ${process.arch}\n`;
  markdown += `- **Test Data:** Synthetic data generated with realistic distributions\n`;
  markdown += `- **Runs per Test:** 10\n\n`;

  markdown += `## Conclusion\n\n`;
  if (summary.overallStatus === 'PASS') {
    markdown += `✅ All performance benchmarks passed. The application meets or exceeds all performance targets.\n\n`;
  } else {
    markdown += `⚠️ Some performance benchmarks did not meet targets. Review recommendations above and implement suggested optimizations.\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `*Report generated by Martha Tracker Performance Benchmark Suite*\n`;

  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write report
  fs.writeFileSync(reportPath, markdown, 'utf-8');
}

// Run benchmarks
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks()
    .then(summary => {
      process.exit(summary.overallStatus === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAllBenchmarks };
