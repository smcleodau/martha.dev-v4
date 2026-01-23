/**
 * MTH-048: Usage Example for Dependency Visualization & Critical Path
 *
 * This file demonstrates how to use the Gantt chart with dependency visualization
 * and critical path analysis in the Martha tracker.
 */

import React, { useEffect, useState } from 'react';
import { GanttChart, convertIssueToGanttTask, buildHierarchicalTasks } from './';
import type { Issue } from '../../../api/tracker';

interface GanttViewProps {
  worktreeId: string;
  boardId: string;
}

/**
 * Example: Gantt View with Critical Path
 */
export function GanttViewExample({ worktreeId, boardId }: GanttViewProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch issues from API
  useEffect(() => {
    async function fetchIssues() {
      try {
        const response = await fetch(
          `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch issues');
        }

        const data = await response.json();
        setIssues(data.issues || []);
      } catch (error) {
        console.error('Error fetching issues:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, [worktreeId, boardId]);

  // Convert issues to Gantt tasks
  const tasks = buildHierarchicalTasks(issues);

  // Handle task click
  const handleTaskClick = (task: any) => {
    console.log('Task clicked:', task);
    // Navigate to issue detail page or open modal
    window.location.href = `/tracker/${worktreeId}/${boardId}/${task.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading Gantt chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-view-container">
      <GanttChart
        tasks={tasks}
        onTaskClick={handleTaskClick}
        viewMode="Week"
      />
    </div>
  );
}

/**
 * Example: Issues with Dependencies
 *
 * This example shows how to structure issues with dependencies
 * for the Gantt chart to display correctly.
 */
export const EXAMPLE_ISSUES: Partial<Issue>[] = [
  {
    id: 'MTH-001',
    title: 'Design API Architecture',
    type: 'epic',
    status: 'done',
    priority: 'high',
    start_date: '2026-01-01',
    due_date: '2026-01-07',
    dependencies: {
      blocks: ['MTH-002', 'MTH-003'],
      blocked_by: [],
      related: []
    }
  },
  {
    id: 'MTH-002',
    title: 'Implement Authentication Service',
    type: 'story',
    status: 'in_progress',
    priority: 'critical',
    start_date: '2026-01-08',
    due_date: '2026-01-15',
    dependencies: {
      blocks: ['MTH-004'],
      blocked_by: ['MTH-001'],
      related: ['MTH-003']
    }
  },
  {
    id: 'MTH-003',
    title: 'Implement Database Layer',
    type: 'story',
    status: 'in_progress',
    priority: 'high',
    start_date: '2026-01-08',
    due_date: '2026-01-14',
    dependencies: {
      blocks: ['MTH-004', 'MTH-005'],
      blocked_by: ['MTH-001'],
      related: ['MTH-002']
    }
  },
  {
    id: 'MTH-004',
    title: 'Implement User Management API',
    type: 'task',
    status: 'todo',
    priority: 'high',
    start_date: '2026-01-16',
    due_date: '2026-01-22',
    dependencies: {
      blocks: ['MTH-006'],
      blocked_by: ['MTH-002', 'MTH-003'],
      related: []
    }
  },
  {
    id: 'MTH-005',
    title: 'Create Database Migrations',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    start_date: '2026-01-15',
    due_date: '2026-01-18',
    dependencies: {
      blocks: [],
      blocked_by: ['MTH-003'],
      related: []
    }
  },
  {
    id: 'MTH-006',
    title: 'Integration Testing',
    type: 'task',
    status: 'todo',
    priority: 'high',
    start_date: '2026-01-23',
    due_date: '2026-01-28',
    dependencies: {
      blocks: [],
      blocked_by: ['MTH-004'],
      related: []
    }
  }
];

/**
 * Critical Path for above example:
 * MTH-001 → MTH-002 → MTH-004 → MTH-006
 *
 * These tasks have zero slack and form the critical path.
 * Any delay in these tasks will delay the project completion.
 *
 * MTH-003 and MTH-005 have some slack time and are not on critical path.
 */

/**
 * Example: Using Critical Path Hook Directly
 */
export function CriticalPathAnalysisExample() {
  const { useCriticalPath } = require('./hooks/useCriticalPath');

  const tasks = EXAMPLE_ISSUES
    .filter(issue => issue.start_date && issue.due_date)
    .map(issue => ({
      id: issue.id!,
      name: issue.title!,
      start: new Date(issue.start_date!),
      end: new Date(issue.due_date!),
      progress: issue.status === 'done' ? 100 : issue.status === 'in_progress' ? 50 : 0,
      dependencies: issue.dependencies?.blocked_by?.join(',') || ''
    }));

  const { criticalPath, taskTimings, hasCircularDependency, circularTasks } =
    useCriticalPath(tasks);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Critical Path Analysis</h2>

      {hasCircularDependency ? (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
          <p className="font-bold">Circular Dependency Detected!</p>
          <p className="text-sm mt-2">
            The following tasks form a circular dependency: {circularTasks.join(', ')}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
            <p className="font-bold">Critical Path ({criticalPath.length} tasks)</p>
            <p className="text-sm mt-2">{criticalPath.join(' → ')}</p>
          </div>

          <div className="space-y-2">
            {tasks.map(task => {
              const timing = taskTimings[task.id];
              if (!timing) return null;

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded ${
                    timing.isCritical ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{task.id}</span>
                    {timing.isCritical ? (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                        CRITICAL
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">
                        Slack: {Math.round(timing.slack)} days
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{task.name}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Example: Custom Dependency Styling
 */
export function CustomStyledGanttExample() {
  return (
    <div className="custom-gantt-container">
      <style>{`
        /* Override critical path colors */
        .gantt .bar-wrapper.critical-task .bar {
          fill: #8B0000 !important; /* Dark red */
        }

        /* Custom near-critical color */
        .gantt .bar-wrapper.near-critical-task .bar {
          fill: #FF6B35 !important; /* Bright orange */
        }

        /* Animate critical tasks */
        .gantt .bar-wrapper.critical-task .bar {
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(192, 57, 43, 0.5)); }
          50% { filter: drop-shadow(0 0 15px rgba(192, 57, 43, 0.8)); }
        }
      `}</style>

      <GanttChart
        tasks={[]}
        viewMode="Week"
      />
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. The GanttChart component automatically:
 *    - Calculates critical path
 *    - Detects circular dependencies
 *    - Renders dependency arrows
 *    - Shows interactive controls
 *
 * 2. Dependencies are read from Issue.dependencies:
 *    - blocks: Array of issue IDs this task blocks
 *    - blocked_by: Array of issue IDs blocking this task
 *    - related: Array of related issue IDs
 *
 * 3. Critical path is calculated using:
 *    - Forward pass: Earliest start/finish
 *    - Backward pass: Latest start/finish
 *    - Slack = Latest Start - Earliest Start
 *    - Critical = Slack ≤ 0.5 days
 *
 * 4. User interactions:
 *    - Toggle dependencies visibility
 *    - Toggle critical path highlighting
 *    - Toggle slack time display
 *    - Click task to view details
 *    - Click dependency to see relationship
 *    - Hover for tooltips
 */
