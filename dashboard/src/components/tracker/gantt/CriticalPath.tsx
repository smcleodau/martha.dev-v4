/**
 * CriticalPath Component - Highlights critical path tasks in Gantt chart
 * Shows slack time for non-critical tasks and warns about circular dependencies
 */

import React from 'react';
import { useCriticalPath, type GanttTask, type TaskTiming } from './hooks/useCriticalPath';

interface CriticalPathProps {
  tasks: GanttTask[];
  showCriticalPath: boolean;
  showSlackTimes: boolean;
  onTaskClick?: (taskId: string) => void;
}

export function CriticalPath({
  tasks,
  showCriticalPath,
  showSlackTimes,
  onTaskClick
}: CriticalPathProps) {
  const { criticalPath, taskTimings, hasCircularDependency, circularTasks } = useCriticalPath(tasks);

  // Apply critical path styling to tasks
  React.useEffect(() => {
    if (!showCriticalPath) {
      // Remove all critical path classes
      const allBars = document.querySelectorAll('.bar-wrapper');
      allBars.forEach(bar => {
        bar.classList.remove('critical-task', 'near-critical-task', 'circular-dependency-task');
      });
      return;
    }

    // Add critical path classes
    tasks.forEach(task => {
      const timing = taskTimings[task.id];
      const barElement = document.querySelector(`.bar-wrapper[data-id="${task.id}"]`);

      if (barElement) {
        // Remove existing classes
        barElement.classList.remove('critical-task', 'near-critical-task', 'circular-dependency-task');

        // Add appropriate class
        if (hasCircularDependency && circularTasks.includes(task.id)) {
          barElement.classList.add('circular-dependency-task');
        } else if (timing?.isCritical) {
          barElement.classList.add('critical-task');
        } else if (timing && timing.slack < 2) {
          barElement.classList.add('near-critical-task');
        }
      }
    });
  }, [showCriticalPath, tasks, taskTimings, criticalPath, hasCircularDependency, circularTasks]);

  // Generate tooltip content for slack time
  const getSlackTooltip = (taskId: string): string | null => {
    if (!showSlackTimes) return null;

    const timing = taskTimings[taskId];
    if (!timing) return null;

    if (timing.isCritical) {
      return 'CRITICAL PATH - No slack time';
    }

    const slackDays = Math.round(timing.slack);
    return `Slack: ${slackDays} day${slackDays !== 1 ? 's' : ''}`;
  };

  if (hasCircularDependency) {
    return (
      <div
        className="mb-4 p-4 rounded-lg border-2 animate-pulse"
        style={{
          backgroundColor: '#FEF3E2',
          borderColor: '#E8A93A'
        }}
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 flex-shrink-0"
            style={{ color: '#E8A93A' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-bold mb-1" style={{ color: '#D97F6F' }}>
              Circular Dependency Detected
            </h4>
            <p className="text-sm mb-2" style={{ color: '#6B5D52' }}>
              The following tasks form a circular dependency chain. This prevents critical path
              calculation and may cause scheduling issues.
            </p>
            <div className="flex flex-wrap gap-2">
              {circularTasks.map(taskId => {
                const task = tasks.find(t => t.id === taskId);
                return (
                  <button
                    key={taskId}
                    onClick={() => onTaskClick?.(taskId)}
                    className="px-3 py-1 rounded-full text-xs font-mono font-semibold hover:shadow-md transition-all"
                    style={{
                      backgroundColor: '#E8A93A',
                      color: 'white'
                    }}
                  >
                    {task?.name || taskId}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showCriticalPath && criticalPath.length > 0) {
    return (
      <div
        className="mb-4 p-4 rounded-lg border"
        style={{
          backgroundColor: '#FCEEEB',
          borderColor: '#F5B1A4'
        }}
      >
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: '#C0392B' }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-bold mb-1" style={{ color: '#C0392B' }}>
              Critical Path Highlighted
            </h4>
            <p className="text-sm mb-2" style={{ color: '#6B5D52' }}>
              {criticalPath.length} critical task{criticalPath.length !== 1 ? 's' : ''} identified.
              These tasks have zero slack and directly impact project completion.
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#C0392B' }}
                />
                <span style={{ color: '#6B5D52' }}>Critical (0 slack)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#E8A93A' }}
                />
                <span style={{ color: '#6B5D52' }}>Near-critical (&lt;2 days slack)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: '#A39686' }}
                />
                <span style={{ color: '#6B5D52' }}>Normal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * CriticalPathBadge - Shows on critical task bars
 */
export function CriticalPathBadge({ taskId, timing }: { taskId: string; timing: TaskTiming }) {
  if (!timing.isCritical) return null;

  return (
    <div
      className="absolute top-0 right-0 px-2 py-0.5 text-xs font-bold rounded-bl"
      style={{
        backgroundColor: '#C0392B',
        color: 'white',
        fontSize: '10px'
      }}
    >
      CRITICAL
    </div>
  );
}

/**
 * SlackTooltip - Shows slack time on hover
 */
export function SlackTooltip({
  taskId,
  timing,
  visible
}: {
  taskId: string;
  timing: TaskTiming | undefined;
  visible: boolean;
}) {
  if (!visible || !timing) return null;

  const slackDays = Math.round(timing.slack);

  return (
    <div
      className="absolute z-50 px-3 py-2 rounded-lg shadow-lg pointer-events-none"
      style={{
        backgroundColor: '#2F241B',
        color: 'white',
        fontSize: '12px',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap'
      }}
    >
      {timing.isCritical ? (
        <span className="font-bold">CRITICAL - No slack</span>
      ) : (
        <span>
          Slack: <strong>{slackDays}</strong> day{slackDays !== 1 ? 's' : ''}
        </span>
      )}
      <div
        className="absolute"
        style={{
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #2F241B'
        }}
      />
    </div>
  );
}
