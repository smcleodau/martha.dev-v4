/**
 * Test Data Generator for Performance Benchmarking
 * Generates large datasets of issues for performance testing
 */

import { type Issue } from '../dashboard/src/api/tracker';

export interface TestDataConfig {
  numIssues: number;
  numEvents?: number;
  numTasks?: number;
  withDates?: boolean;
  withDependencies?: boolean;
}

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const TYPES: Array<'epic' | 'story' | 'task' | 'bug'> = ['epic', 'story', 'task', 'bug'];
const PRIORITIES: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const LABELS = ['frontend', 'backend', 'api', 'ui', 'ux', 'database', 'performance', 'security', 'testing', 'documentation'];

/**
 * Generate random date within a range
 */
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

/**
 * Generate random assignee
 */
function randomAssignee() {
  if (Math.random() < 0.3) return null; // 30% unassigned
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return {
    id: `user-${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    avatar: null,
  };
}

/**
 * Generate random labels
 */
function randomLabels(): string[] {
  const count = Math.floor(Math.random() * 3);
  const selected = new Set<string>();
  while (selected.size < count) {
    selected.add(LABELS[Math.floor(Math.random() * LABELS.length)]);
  }
  return Array.from(selected);
}

/**
 * Generate a single issue
 */
function generateIssue(
  index: number,
  config: TestDataConfig,
  existingIssueIds: string[]
): Issue {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
  const id = `TST-${String(index).padStart(4, '0')}`;

  // Generate dates if requested
  let start_date: string | undefined;
  let due_date: string | undefined;
  if (config.withDates) {
    const now = new Date();
    const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now

    start_date = randomDate(past, now);
    const startDateObj = new Date(start_date);
    due_date = randomDate(startDateObj, future);
  }

  // Generate dependencies if requested
  let dependencies: { blocks: string[]; blocked_by: string[] } | undefined;
  if (config.withDependencies && existingIssueIds.length > 0 && Math.random() < 0.3) {
    const numDeps = Math.floor(Math.random() * 3) + 1;
    const blocks: string[] = [];
    for (let i = 0; i < numDeps && i < existingIssueIds.length; i++) {
      const randomId = existingIssueIds[Math.floor(Math.random() * existingIssueIds.length)];
      if (!blocks.includes(randomId)) {
        blocks.push(randomId);
      }
    }
    dependencies = { blocks, blocked_by: [] };
  }

  return {
    id,
    title: `Test ${type} ${index}: ${generateTitle(type)}`,
    description: `This is a test ${type} generated for performance benchmarking. It contains sample data to simulate real-world usage patterns.`,
    type,
    status,
    priority,
    assignee: randomAssignee(),
    labels: randomLabels(),
    start_date,
    due_date,
    dependencies,
    parent_id: null,
    children: [],
    initiative_id: Math.random() < 0.5 ? `INIT-${Math.floor(Math.random() * 10)}` : null,
    team_ids: Math.random() < 0.6 ? [`TEAM-${Math.floor(Math.random() * 5)}`] : null,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate realistic title based on type
 */
function generateTitle(type: string): string {
  const epicTitles = [
    'User Authentication System',
    'Dashboard Redesign',
    'API Performance Optimization',
    'Mobile App Launch',
    'Payment Integration',
  ];

  const storyTitles = [
    'Implement login flow',
    'Add search functionality',
    'Create user profile page',
    'Design new navigation menu',
    'Build analytics dashboard',
  ];

  const taskTitles = [
    'Update dependencies',
    'Fix CSS alignment',
    'Add unit tests',
    'Update documentation',
    'Refactor API client',
  ];

  const bugTitles = [
    'Button not responding on mobile',
    'Memory leak in component',
    'API timeout on large datasets',
    'Form validation not working',
    'Styling broken in Safari',
  ];

  switch (type) {
    case 'epic':
      return epicTitles[Math.floor(Math.random() * epicTitles.length)];
    case 'story':
      return storyTitles[Math.floor(Math.random() * storyTitles.length)];
    case 'task':
      return taskTitles[Math.floor(Math.random() * taskTitles.length)];
    case 'bug':
      return bugTitles[Math.floor(Math.random() * bugTitles.length)];
    default:
      return 'Sample Issue';
  }
}

/**
 * Generate issues for list view testing
 */
export function generateListTestData(numIssues: number = 1000): Issue[] {
  const issues: Issue[] = [];
  const issueIds: string[] = [];

  for (let i = 1; i <= numIssues; i++) {
    const issue = generateIssue(i, { numIssues, withDates: true, withDependencies: false }, issueIds);
    issues.push(issue);
    issueIds.push(issue.id);
  }

  return issues;
}

/**
 * Generate issues for timeline view testing (with dates)
 */
export function generateTimelineTestData(numEvents: number = 500): Issue[] {
  const issues: Issue[] = [];
  const issueIds: string[] = [];

  for (let i = 1; i <= numEvents; i++) {
    const issue = generateIssue(i, { numIssues: numEvents, withDates: true, withDependencies: false }, issueIds);
    issues.push(issue);
    issueIds.push(issue.id);
  }

  return issues;
}

/**
 * Generate issues for Gantt view testing (with dates and dependencies)
 */
export function generateGanttTestData(numTasks: number = 200): Issue[] {
  const issues: Issue[] = [];
  const issueIds: string[] = [];

  for (let i = 1; i <= numTasks; i++) {
    const issue = generateIssue(i, { numIssues: numTasks, withDates: true, withDependencies: true }, issueIds);
    issues.push(issue);
    issueIds.push(issue.id);
  }

  return issues;
}

/**
 * Generate mixed dataset for filtering tests
 */
export function generateFilterTestData(numIssues: number = 1000): Issue[] {
  return generateListTestData(numIssues);
}

/**
 * Convert issues array to issues map (id -> issue)
 */
export function issuesToMap(issues: Issue[]): Record<string, Issue> {
  const map: Record<string, Issue> = {};
  issues.forEach(issue => {
    map[issue.id] = issue;
  });
  return map;
}
