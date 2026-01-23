/**
 * Gantt View Performance Benchmark
 * Target: <300ms to render 200 tasks
 */

import { generateGanttTestData } from '../../scripts/generate-test-data';
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

export interface GanttTask {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  progress: number; // 0-100
  dependencies: string; // comma-separated task IDs
  custom_class: string; // for styling by type/priority
}

/**
 * Convert Issue to GanttTask (from GanttChart.tsx)
 */
function convertIssueToGanttTask(
  issue: Issue,
  allIssues: Issue[]
): GanttTask | null {
  // Skip issues without dates
  if (!issue.due_date && !issue.start_date) return null;

  // Calculate start and end dates
  const start = issue.start_date || issue.due_date || new Date().toISOString().split('T')[0];
  const end = issue.due_date || issue.start_date || new Date().toISOString().split('T')[0];

  // Calculate progress based on status
  let progress = 0;
  if (issue.type === 'epic' || issue.type === 'story') {
    // For epics and stories, calculate progress from children
    const children = allIssues.filter((i) => i.parent_id === issue.id);
    if (children.length > 0) {
      const doneChildren = children.filter((i) => i.status === 'done').length;
      progress = Math.round((doneChildren / children.length) * 100);
    }
  } else {
    // For tasks and bugs, use simple done/not done
    progress = issue.status === 'done' ? 100 : issue.status === 'in_progress' ? 50 : 0;
  }

  // Build dependencies string
  const deps = issue.dependencies?.blocks || [];
  const dependencies = deps.join(',');

  // Build custom class for styling
  const customClass = `gantt-task-${issue.type} gantt-priority-${issue.priority}`;

  return {
    id: issue.id,
    name: `${issue.id}: ${issue.title}`,
    start,
    end,
    progress,
    dependencies,
    custom_class: customClass,
  };
}

/**
 * Calculate critical path (simplified algorithm)
 */
function calculateCriticalPath(tasks: GanttTask[]): {
  criticalPath: string[];
  taskTimings: Record<string, { earlyStart: number; earlyFinish: number; lateStart: number; lateFinish: number; slack: number }>;
} {
  const taskMap = new Map<string, GanttTask>();
  tasks.forEach(t => taskMap.set(t.id, t));

  const timings: Record<string, { earlyStart: number; earlyFinish: number; lateStart: number; lateFinish: number; slack: number }> = {};

  // Forward pass - calculate early start/finish
  tasks.forEach(task => {
    const duration = daysBetween(task.start, task.end);
    let earlyStart = 0;

    // Find latest early finish of dependencies
    if (task.dependencies) {
      const deps = task.dependencies.split(',').filter(d => d.trim());
      deps.forEach(depId => {
        const depTiming = timings[depId];
        if (depTiming) {
          earlyStart = Math.max(earlyStart, depTiming.earlyFinish);
        }
      });
    }

    timings[task.id] = {
      earlyStart,
      earlyFinish: earlyStart + duration,
      lateStart: 0,
      lateFinish: 0,
      slack: 0,
    };
  });

  // Backward pass - calculate late start/finish
  const projectDuration = Math.max(...Object.values(timings).map(t => t.earlyFinish));

  [...tasks].reverse().forEach(task => {
    const duration = daysBetween(task.start, task.end);
    let lateFinish = projectDuration;

    // Find earliest late start of dependents
    tasks.forEach(otherTask => {
      if (otherTask.dependencies && otherTask.dependencies.split(',').includes(task.id)) {
        const depTiming = timings[otherTask.id];
        if (depTiming) {
          lateFinish = Math.min(lateFinish, depTiming.lateStart);
        }
      }
    });

    timings[task.id].lateFinish = lateFinish;
    timings[task.id].lateStart = lateFinish - duration;
    timings[task.id].slack = timings[task.id].lateStart - timings[task.id].earlyStart;
  });

  // Critical path = tasks with zero slack
  const criticalPath = tasks
    .filter(task => timings[task.id].slack === 0)
    .map(task => task.id);

  return { criticalPath, taskTimings: timings };
}

/**
 * Helper function to calculate days between dates
 */
function daysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Benchmark Gantt view rendering with 200 tasks
 */
export async function benchmarkGanttView(): Promise<BenchmarkResult> {
  const TARGET_MS = 300;
  const NUM_TASKS = 200;
  const NUM_RUNS = 10;

  console.log(`\n=== Gantt View Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms for ${NUM_TASKS} tasks`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Generate test data with dates and dependencies
    const issues = generateGanttTestData(NUM_TASKS);

    // Measure conversion and rendering time
    const startTime = performance.now();

    // Convert issues to Gantt tasks
    const tasks = issues
      .map(issue => convertIssueToGanttTask(issue, issues))
      .filter((task): task is GanttTask => task !== null);

    // Simulate Gantt rendering work
    // 1. Sort by start date
    const sortedTasks = [...tasks].sort((a, b) => a.start.localeCompare(b.start));

    // 2. Build dependency graph
    const dependencyGraph = new Map<string, string[]>();
    sortedTasks.forEach(task => {
      if (task.dependencies) {
        const deps = task.dependencies.split(',').filter(d => d.trim());
        dependencyGraph.set(task.id, deps);
      }
    });

    // 3. Calculate task positions (simulated layout)
    const positions = new Map<string, { x: number; y: number; width: number }>();
    sortedTasks.forEach((task, index) => {
      const startDay = daysBetween('2024-01-01', task.start);
      const duration = daysBetween(task.start, task.end);
      positions.set(task.id, {
        x: startDay * 20, // 20px per day
        y: index * 40, // 40px per task
        width: duration * 20,
      });
    });

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    runs.push(renderTime);
    console.log(`Run ${run}: ${renderTime.toFixed(2)}ms (${tasks.length} tasks)`);
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
    name: 'Gantt View (200 tasks)',
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
 * Benchmark critical path calculation
 */
export async function benchmarkCriticalPath(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_TASKS = 200;
  const NUM_RUNS = 10;

  console.log(`\n=== Gantt Critical Path Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to calculate critical path for ${NUM_TASKS} tasks`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Generate test data with dates and dependencies
    const issues = generateGanttTestData(NUM_TASKS);
    const tasks = issues
      .map(issue => convertIssueToGanttTask(issue, issues))
      .filter((task): task is GanttTask => task !== null);

    // Measure critical path calculation time
    const startTime = performance.now();

    const { criticalPath, taskTimings } = calculateCriticalPath(tasks);

    const endTime = performance.now();
    const calcTime = endTime - startTime;

    runs.push(calcTime);
    console.log(`Run ${run}: ${calcTime.toFixed(2)}ms (${criticalPath.length} critical tasks)`);
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
    name: 'Critical Path Calculation (200 tasks)',
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
    await benchmarkGanttView();
    await benchmarkCriticalPath();
  })();
}
