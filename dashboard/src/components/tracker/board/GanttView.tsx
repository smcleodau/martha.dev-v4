/**
 * GanttView Component - Main Gantt chart view for tracker
 * Filters issues with dates and builds hierarchical task structure
 */

import { useMemo, useState } from 'react';
import type { Issue } from '../../../api/tracker';
import {
  GanttChart,
  buildHierarchicalTasks,
  type ViewMode,
  type GanttTask,
} from '../gantt/GanttChart';

interface GanttViewProps {
  issues: Record<string, Issue>;
  onIssueClick?: (issueId: string) => void;
}

export function GanttView({ issues, onIssueClick }: GanttViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('Week');

  // Filter issues to only those with dates
  const issuesWithDates = useMemo(() => {
    return Object.values(issues).filter(
      (issue) => issue.start_date || issue.due_date
    );
  }, [issues]);

  // Build hierarchical task structure
  const ganttTasks = useMemo(() => {
    if (issuesWithDates.length === 0) return [];
    return buildHierarchicalTasks(issuesWithDates);
  }, [issuesWithDates]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = issuesWithDates.length;
    const byType = issuesWithDates.reduce(
      (acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const completed = issuesWithDates.filter(
      (issue) => issue.status === 'done'
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      byType,
      completed,
      completionRate,
    };
  }, [issuesWithDates]);

  const handleTaskClick = (task: GanttTask) => {
    if (onIssueClick) {
      onIssueClick(task.id);
    }
  };

  return (
    <div className="gantt-view" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Stats Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #E8E0D5',
          backgroundColor: '#FDFCFA',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A39686', marginBottom: '0.25rem' }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2F241B' }}>
              {stats.total}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#A39686', marginBottom: '0.25rem' }}>
              Completion Rate
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#52A560' }}>
              {stats.completionRate}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
            {stats.byType.epic && (
              <div style={{ color: '#6B5D52' }}>
                <span style={{ fontWeight: 600, color: '#8B7AA8' }}>{stats.byType.epic}</span> Epics
              </div>
            )}
            {stats.byType.story && (
              <div style={{ color: '#6B5D52' }}>
                <span style={{ fontWeight: 600, color: '#D97F6F' }}>{stats.byType.story}</span> Stories
              </div>
            )}
            {stats.byType.task && (
              <div style={{ color: '#6B5D52' }}>
                <span style={{ fontWeight: 600, color: '#A39686' }}>{stats.byType.task}</span> Tasks
              </div>
            )}
            {stats.byType.bug && (
              <div style={{ color: '#6B5D52' }}>
                <span style={{ fontWeight: 600, color: '#C0392B' }}>{stats.byType.bug}</span> Bugs
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#8B7AA8',
                borderRadius: '3px',
              }}
            />
            <span style={{ color: '#6B5D52' }}>Epic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#D97F6F',
                borderRadius: '3px',
              }}
            />
            <span style={{ color: '#6B5D52' }}>Story</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#A39686',
                borderRadius: '3px',
              }}
            />
            <span style={{ color: '#6B5D52' }}>Task</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                backgroundColor: '#C0392B',
                borderRadius: '3px',
              }}
            />
            <span style={{ color: '#6B5D52' }}>Bug</span>
          </div>
        </div>
      </div>

      {/* Warning if no tasks with dates */}
      {issuesWithDates.length === 0 && (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#FDF5F3',
            borderBottom: '1px solid #E8E0D5',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
          <div style={{ fontSize: '0.875rem', color: '#6B5D52', marginBottom: '0.25rem' }}>
            No tasks with dates found
          </div>
          <div style={{ fontSize: '0.75rem', color: '#A39686' }}>
            Add start_date or due_date to issues to display them in the Gantt chart
          </div>
        </div>
      )}

      {/* Info Banner */}
      {issuesWithDates.length > 0 && Object.values(issues).length > issuesWithDates.length && (
        <div
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#FBF1D9',
            borderBottom: '1px solid #E8E0D5',
            fontSize: '0.875rem',
            color: '#8F6B2C',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg
            style={{ width: '1rem', height: '1rem', flexShrink: 0 }}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Showing {issuesWithDates.length} of {Object.values(issues).length} issues (issues
            without dates are hidden)
          </span>
        </div>
      )}

      {/* Gantt Chart */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GanttChart
          tasks={ganttTasks}
          onTaskClick={handleTaskClick}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  );
}
