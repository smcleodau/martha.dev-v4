/**
 * GanttChart Component - Frappe Gantt wrapper for Martha tracker
 * Converts Issue objects to Gantt tasks and handles rendering
 * Enhanced with dependency visualization and critical path analysis (MTH-048)
 */

import { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import type { Issue } from '../../../api/tracker';
import { CriticalPath } from './CriticalPath';
import { DependencyLines, DependencyDetailsModal } from './DependencyLines';
import { GanttToolbar } from './DependencyControls';
import { useCriticalPath, type GanttTask as CriticalPathTask } from './hooks/useCriticalPath';
import './gantt.css';

export interface GanttTask {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  progress: number; // 0-100
  dependencies: string; // comma-separated task IDs
  custom_class: string; // for styling by type/priority
}

export type ViewMode = 'Day' | 'Week' | 'Month' | 'Year';

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick?: (task: GanttTask) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function GanttChart({
  tasks,
  onTaskClick,
  viewMode = 'Week',
  onViewModeChange,
}: GanttChartProps) {
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const ganttInstanceRef = useRef<any>(null);
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(viewMode);

  // MTH-048: Dependency visualization and critical path state
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [showSlackTimes, setShowSlackTimes] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<{
    fromTaskId: string;
    toTaskId: string;
  } | null>(null);

  // Convert Frappe Gantt tasks to CriticalPath tasks
  const criticalPathTasks: CriticalPathTask[] = tasks.map(task => ({
    id: task.id,
    name: task.name,
    start: new Date(task.start),
    end: new Date(task.end),
    progress: task.progress,
    dependencies: task.dependencies,
    custom_class: task.custom_class
  }));

  // Calculate critical path
  const { criticalPath, taskTimings, hasCircularDependency, circularTasks } = useCriticalPath(criticalPathTasks);

  useEffect(() => {
    if (!ganttContainerRef.current || tasks.length === 0) return;

    // Clear any existing gantt instance
    if (ganttContainerRef.current) {
      ganttContainerRef.current.innerHTML = '';
    }

    try {
      // Create Frappe Gantt instance
      ganttInstanceRef.current = new Gantt(ganttContainerRef.current, tasks, {
        view_mode: currentViewMode,
        on_click: (task: any) => {
          if (onTaskClick) {
            onTaskClick(task as GanttTask);
          }
        },
        on_date_change: (task: any, start: Date, end: Date) => {
          // TODO: Implement date change handler for drag updates
          console.log('Date changed:', task, start, end);
        },
        on_progress_change: (task: any, progress: number) => {
          // TODO: Implement progress change handler
          console.log('Progress changed:', task, progress);
        },
        on_view_change: (mode: string) => {
          console.log('View changed:', mode);
        },
        custom_popup_html: (task: any) => {
          // Custom popup content
          return `
            <div class="gantt-popup">
              <div class="gantt-popup-title">${task.name}</div>
              <div class="gantt-popup-dates">
                ${task.start} → ${task.end}
              </div>
              <div class="gantt-popup-progress">
                Progress: ${task.progress}%
              </div>
            </div>
          `;
        },
      });
    } catch (error) {
      console.error('Failed to initialize Gantt chart:', error);
    }

    // MTH-048: Add data-id attributes to task bars for dependency lines
    setTimeout(() => {
      const bars = ganttContainerRef.current?.querySelectorAll('.bar-wrapper');
      bars?.forEach((bar, index) => {
        if (tasks[index]) {
          bar.setAttribute('data-id', tasks[index].id);
        }
      });
    }, 100);

    return () => {
      if (ganttInstanceRef.current) {
        ganttInstanceRef.current = null;
      }
    };
  }, [tasks, currentViewMode, onTaskClick]);

  // MTH-048: Update task styling based on critical path
  useEffect(() => {
    if (!ganttContainerRef.current || !showCriticalPath) return;

    tasks.forEach(task => {
      const barElement = ganttContainerRef.current?.querySelector(`.bar-wrapper[data-id="${task.id}"]`);
      if (!barElement) return;

      // Remove all styling classes
      barElement.classList.remove('critical-task', 'near-critical-task', 'circular-dependency-task');

      // Apply appropriate styling
      if (hasCircularDependency && circularTasks.includes(task.id)) {
        barElement.classList.add('circular-dependency-task');
      } else if (criticalPath.includes(task.id)) {
        barElement.classList.add('critical-task');
      } else if (taskTimings[task.id] && taskTimings[task.id].slack < 2) {
        barElement.classList.add('near-critical-task');
      }
    });
  }, [showCriticalPath, criticalPath, hasCircularDependency, circularTasks, tasks, taskTimings]);

  const handleViewModeChange = (mode: ViewMode) => {
    setCurrentViewMode(mode);
    if (ganttInstanceRef.current) {
      ganttInstanceRef.current.change_view_mode(mode);
    }
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // MTH-048: Handle dependency click to show details
  const handleDependencyClick = (fromTaskId: string, toTaskId: string) => {
    setSelectedDependency({ fromTaskId, toTaskId });
  };

  const fromTask = criticalPathTasks.find(t => t.id === selectedDependency?.fromTaskId);
  const toTask = criticalPathTasks.find(t => t.id === selectedDependency?.toTaskId);

  return (
    <div className="gantt-chart-wrapper">
      {/* MTH-048: Enhanced toolbar with dependency controls */}
      <GanttToolbar
        showDependencies={showDependencies}
        onToggleDependencies={setShowDependencies}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={setShowCriticalPath}
        showSlackTimes={showSlackTimes}
        onToggleSlackTimes={setShowSlackTimes}
        viewMode={currentViewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* MTH-048: Critical Path Info Panel */}
      <CriticalPath
        tasks={criticalPathTasks}
        showCriticalPath={showCriticalPath}
        showSlackTimes={showSlackTimes}
        onTaskClick={(taskId) => {
          const task = tasks.find(t => t.id === taskId);
          if (task && onTaskClick) {
            onTaskClick(task);
          }
        }}
      />

      {/* Gantt Chart Container */}
      <div className="gantt-container-outer" style={{
        padding: '1rem',
        overflow: 'auto',
        backgroundColor: '#F5F1EC',
        position: 'relative'
      }}>
        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#A39686'
          }}>
            <p style={{ fontSize: '0.875rem' }}>
              No tasks with dates to display in Gantt chart.
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Add start_date or due_date to issues to see them here.
            </p>
          </div>
        ) : (
          <>
            <div ref={ganttContainerRef} className="gantt-container" />

            {/* MTH-048: Dependency Lines Overlay */}
            {showDependencies && (
              <DependencyLines
                tasks={criticalPathTasks}
                showDependencies={showDependencies}
                criticalPath={criticalPath}
                onDependencyClick={handleDependencyClick}
              />
            )}
          </>
        )}
      </div>

      {/* MTH-048: Dependency Details Modal */}
      <DependencyDetailsModal
        fromTask={fromTask}
        toTask={toTask}
        isOpen={!!selectedDependency}
        onClose={() => setSelectedDependency(null)}
      />
    </div>
  );
}

/**
 * Convert Issue to GanttTask
 * This is a utility function to transform Issue objects into Gantt-compatible tasks
 */
export function convertIssueToGanttTask(
  issue: Issue,
  allIssues: Issue[]
): GanttTask | null {
  // Skip issues without dates
  if (!issue.due_date && !issue.start_date) return null;

  // Calculate start and end dates
  const start = issue.start_date || issue.due_date || new Date().toISOString().split('T')[0];
  const end = issue.due_date || issue.start_date || new Date().toISOString().split('T')[0];

  // Calculate progress based on status or child completion
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
 * Build hierarchical task structure
 * Calculates date ranges for parent tasks based on children
 */
export function buildHierarchicalTasks(issues: Issue[]): GanttTask[] {
  const issuesArray = Object.values(issues);
  const tasks: GanttTask[] = [];
  const issueMap = new Map<string, Issue>();

  // Build issue map
  issuesArray.forEach((issue) => {
    issueMap.set(issue.id, issue);
  });

  // Calculate date ranges for parent tasks
  const calculateParentDates = (parentId: string): { start: string; end: string } | null => {
    const children = issuesArray.filter((i) => i.parent_id === parentId);
    if (children.length === 0) return null;

    const childDates = children
      .map((child) => {
        if (child.type === 'epic' || child.type === 'story') {
          // Recursively get dates for nested children
          return calculateParentDates(child.id) || {
            start: child.start_date || child.due_date,
            end: child.due_date || child.start_date,
          };
        }
        return {
          start: child.start_date || child.due_date,
          end: child.due_date || child.start_date,
        };
      })
      .filter((d) => d.start && d.end);

    if (childDates.length === 0) return null;

    const starts = childDates.map((d) => new Date(d.start!));
    const ends = childDates.map((d) => new Date(d.end!));

    return {
      start: new Date(Math.min(...starts.map((d) => d.getTime())))
        .toISOString()
        .split('T')[0],
      end: new Date(Math.max(...ends.map((d) => d.getTime())))
        .toISOString()
        .split('T')[0],
    };
  };

  // Convert issues to tasks
  issuesArray.forEach((issue) => {
    let taskData: Partial<Issue> = { ...issue };

    // For epics and stories, use calculated dates from children if available
    if (issue.type === 'epic' || issue.type === 'story') {
      const calculatedDates = calculateParentDates(issue.id);
      if (calculatedDates) {
        taskData = {
          ...taskData,
          start_date: calculatedDates.start,
          due_date: calculatedDates.end,
        };
      }
    }

    const task = convertIssueToGanttTask(taskData as Issue, issuesArray);
    if (task) {
      tasks.push(task);
    }
  });

  return tasks;
}
