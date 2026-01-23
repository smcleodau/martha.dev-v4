/**
 * Performance Testing Utilities for ListView
 * Use this to test virtualization with large datasets
 */

import { type Issue } from '../../../api/tracker';

/**
 * Generate test issues for performance testing
 */
export function generateTestIssues(count: number): Issue[] {
  const types: Issue['type'][] = ['epic', 'story', 'task', 'bug'];
  const statuses = ['todo', 'in progress', 'review', 'done', 'blocked'];
  const priorities: Issue['priority'][] = ['critical', 'high', 'medium', 'low'];
  const assignees = [
    { id: 'user-1', name: 'Alice Johnson', avatar: '' },
    { id: 'user-2', name: 'Bob Smith', avatar: '' },
    { id: 'user-3', name: 'Carol Williams', avatar: '' },
    { id: 'user-4', name: 'David Brown', avatar: '' },
    { id: 'user-5', name: 'Eve Davis', avatar: '' },
  ];

  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    const hasParent = type !== 'epic' && i % 3 === 0;

    return {
      id: `TEST-${String(i + 1).padStart(4, '0')}`,
      worktree_id: 'martha-dev-v4',
      board_id: '2C98C1',
      type,
      title: `Test ${type} ${i + 1}: ${getRandomTitle(type)}`,
      description: `This is a test ${type} for performance testing. Issue number ${i + 1}.`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      parent_id: hasParent ? `TEST-${String(Math.floor(i / 10) + 1).padStart(4, '0')}` : null,
      assignee: i % 4 === 0 ? null : assignees[i % assignees.length],
      labels: generateLabels(i),
      quality: {
        coverage: Math.random() * 100,
        checklist: [],
      },
      time_tracking: {
        estimated_hours: type === 'task' ? (i % 8) + 1 : null,
        logged_hours: Math.random() * 10,
      },
      documentation: {
        overview: null,
        technical_spec: null,
        related_docs: [],
      },
      links: {
        pr: i % 5 === 0 ? `https://github.com/test/repo/pull/${i}` : null,
        related_issues: [],
        external: [],
      },
      metadata: {
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        version: 1,
      },
      story_points: type === 'story' || type === 'task' ? (i % 8) + 1 : null,
      team_ids: [`team-${i % 3}`],
      dependencies: {
        blocks: [],
        blocked_by: [],
        related: [],
      },
      watchers: [],
    } as Issue;
  });
}

function getRandomTitle(type: Issue['type']): string {
  const titles = {
    epic: [
      'User Authentication System',
      'Payment Processing Pipeline',
      'Analytics Dashboard',
      'Mobile App Release',
      'API Gateway Refactor',
    ],
    story: [
      'User can login with OAuth',
      'Display transaction history',
      'Export data to CSV',
      'Implement dark mode',
      'Add email notifications',
    ],
    task: [
      'Update dependencies',
      'Write unit tests',
      'Configure CI/CD',
      'Update documentation',
      'Code review fixes',
    ],
    bug: [
      'Fix login redirect loop',
      'Resolve memory leak',
      'Correct date formatting',
      'Fix mobile layout',
      'Handle edge case errors',
    ],
  };

  const options = titles[type];
  return options[Math.floor(Math.random() * options.length)];
}

function generateLabels(index: number): string[] {
  const allLabels = [
    'frontend',
    'backend',
    'database',
    'security',
    'performance',
    'ux',
    'api',
    'testing',
    'documentation',
    'infrastructure',
  ];

  const count = (index % 3) + 1;
  const startIdx = index % (allLabels.length - count);

  return allLabels.slice(startIdx, startIdx + count);
}

/**
 * Performance measurement helper
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measurements: Array<{ name: string; duration: number }> = [];

  start(markName: string) {
    this.marks.set(markName, performance.now());
  }

  end(markName: string): number {
    const startTime = this.marks.get(markName);
    if (!startTime) {
      console.warn(`No start mark found for: ${markName}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.measurements.push({ name: markName, duration });
    this.marks.delete(markName);

    return duration;
  }

  report() {
    console.table(
      this.measurements.map((m) => ({
        Operation: m.name,
        'Duration (ms)': m.duration.toFixed(2),
        Status: m.duration < 100 ? '✅' : m.duration < 200 ? '⚠️' : '❌',
      }))
    );

    return this.measurements;
  }

  clear() {
    this.marks.clear();
    this.measurements = [];
  }
}

/**
 * Test grouping performance
 */
export function testGroupingPerformance(issues: Issue[], groupBy: 'status' | 'type' | 'assignee' | 'priority') {
  const monitor = new PerformanceMonitor();

  monitor.start('grouping');

  const groups: Record<string, Issue[]> = {};
  issues.forEach((issue) => {
    let key: string;
    switch (groupBy) {
      case 'status':
        key = issue.status || 'No Status';
        break;
      case 'type':
        key = issue.type;
        break;
      case 'assignee':
        key = issue.assignee?.name || 'Unassigned';
        break;
      case 'priority':
        key = issue.priority;
        break;
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  });

  const duration = monitor.end('grouping');

  console.log(`Grouped ${issues.length} issues by ${groupBy} in ${duration.toFixed(2)}ms`);
  console.log(`Created ${Object.keys(groups).length} groups`);

  return { groups, duration };
}

/**
 * Usage example:
 *
 * const testIssues = generateTestIssues(1000);
 * const monitor = new PerformanceMonitor();
 *
 * monitor.start('render');
 * // Render ListView component
 * monitor.end('render');
 *
 * monitor.report();
 */
