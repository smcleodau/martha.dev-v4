/**
 * Timeline View Performance Benchmark
 * Target: <200ms to render 500 events
 */

import { generateTimelineTestData } from '../../scripts/generate-test-data';
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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Issue;
}

/**
 * Convert Issue to CalendarEvent (from TimelineCalendar.tsx)
 */
function convertIssueToEvent(issue: Issue): CalendarEvent | null {
  if (!issue.due_date) return null;

  const start = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date);
  const end = new Date(issue.due_date);

  return {
    id: issue.id,
    title: `${issue.id}: ${issue.title}`,
    start,
    end,
    resource: issue,
  };
}

/**
 * Convert multiple issues to calendar events
 */
function convertIssuesToEvents(issues: Issue[]): CalendarEvent[] {
  return issues
    .map(convertIssueToEvent)
    .filter((event): event is CalendarEvent => event !== null);
}

/**
 * Simulate event rendering logic
 */
function renderEvents(events: CalendarEvent[]): void {
  // Simulate the work that react-big-calendar does
  const sortedEvents = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

  // Group by day for week view
  const eventsByDay = new Map<string, CalendarEvent[]>();
  sortedEvents.forEach(event => {
    const dayKey = event.start.toDateString();
    if (!eventsByDay.has(dayKey)) {
      eventsByDay.set(dayKey, []);
    }
    eventsByDay.get(dayKey)!.push(event);
  });

  // Simulate layout calculation
  eventsByDay.forEach((dayEvents) => {
    // Sort by start time
    dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    // Detect overlaps (simplified algorithm)
    for (let i = 0; i < dayEvents.length; i++) {
      const event = dayEvents[i];
      let overlaps = 0;

      for (let j = 0; j < dayEvents.length; j++) {
        if (i !== j) {
          const other = dayEvents[j];
          if (
            (event.start >= other.start && event.start < other.end) ||
            (event.end > other.start && event.end <= other.end) ||
            (event.start <= other.start && event.end >= other.end)
          ) {
            overlaps++;
          }
        }
      }

      // Simulate positioning based on overlaps
      const width = 100 / (overlaps + 1);
      const left = (overlaps * width) / 2;
    }
  });
}

/**
 * Benchmark timeline view rendering with 500 events
 */
export async function benchmarkTimelineView(): Promise<BenchmarkResult> {
  const TARGET_MS = 200;
  const NUM_EVENTS = 500;
  const NUM_RUNS = 10;

  console.log(`\n=== Timeline View Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms for ${NUM_EVENTS} events`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Generate test data with dates
    const issues = generateTimelineTestData(NUM_EVENTS);

    // Measure conversion and rendering time
    const startTime = performance.now();

    // Convert issues to events
    const events = convertIssuesToEvents(issues);

    // Simulate rendering logic
    renderEvents(events);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    runs.push(renderTime);
    console.log(`Run ${run}: ${renderTime.toFixed(2)}ms (${events.length} events)`);
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
    name: 'Timeline View (500 events)',
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
 * Benchmark timeline view with navigation
 */
export async function benchmarkTimelineNavigation(): Promise<BenchmarkResult> {
  const TARGET_MS = 100;
  const NUM_EVENTS = 500;
  const NUM_RUNS = 10;

  console.log(`\n=== Timeline Navigation Benchmark ===`);
  console.log(`Target: <${TARGET_MS}ms to navigate between views`);
  console.log(`Runs: ${NUM_RUNS}\n`);

  const runs: number[] = [];

  // Generate test data once
  const issues = generateTimelineTestData(NUM_EVENTS);
  const events = convertIssuesToEvents(issues);

  for (let run = 1; run <= NUM_RUNS; run++) {
    // Measure view change time (week -> month -> day)
    const startTime = performance.now();

    // Simulate filtering events for different views
    const now = new Date();
    const weekStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const weekEvents = events.filter(
      e => e.start >= weekStart && e.start <= weekEnd
    );

    renderEvents(weekEvents);

    const endTime = performance.now();
    const navTime = endTime - startTime;

    runs.push(navTime);
    console.log(`Run ${run}: ${navTime.toFixed(2)}ms (${weekEvents.length} events in view)`);
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
    name: 'Timeline Navigation',
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
    await benchmarkTimelineView();
    await benchmarkTimelineNavigation();
  })();
}
