/**
 * Gantt Task Bar Component
 * Individual task bar for Gantt chart with progress visualization
 */

import { useMemo } from 'react';
import { type Issue } from '../../../api/tracker';
import { calculateTaskProgress, getProgressColor } from '../shared/utils';

interface GanttTaskBarProps {
  issue: Issue;
  allIssues: Issue[];
  startDate: Date;
  endDate: Date;
  ganttStartDate: Date;
  ganttEndDate: Date;
  rowHeight: number;
  onClick?: () => void;
  isSelected?: boolean;
  isOverAllocated?: boolean;
}

// Type colors (warm palette)
const TYPE_COLORS = {
  epic: '#8B7AA8',    // Purple
  story: '#D97F6F',   // Coral
  task: '#6B9BD1',    // Blue
  bug: '#C0392B',     // Red
};

export function GanttTaskBar({
  issue,
  allIssues,
  startDate,
  endDate,
  ganttStartDate,
  ganttEndDate,
  rowHeight,
  onClick,
  isSelected = false,
  isOverAllocated = false,
}: GanttTaskBarProps) {
  // Calculate progress
  const progress = useMemo(
    () => calculateTaskProgress(issue, allIssues),
    [issue, allIssues]
  );

  // Calculate position and width
  const { left, width } = useMemo(() => {
    const totalDuration = ganttEndDate.getTime() - ganttStartDate.getTime();
    const taskStart = Math.max(startDate.getTime(), ganttStartDate.getTime());
    const taskEnd = Math.min(endDate.getTime(), ganttEndDate.getTime());

    const leftOffset = ((taskStart - ganttStartDate.getTime()) / totalDuration) * 100;
    const barWidth = ((taskEnd - taskStart) / totalDuration) * 100;

    return {
      left: `${leftOffset}%`,
      width: `${barWidth}%`,
    };
  }, [startDate, endDate, ganttStartDate, ganttEndDate]);

  const baseColor = TYPE_COLORS[issue.type];
  const progressColor = getProgressColor(progress, baseColor);

  // Determine bar height based on type
  const barHeight = issue.type === 'epic' ? rowHeight * 0.7 : rowHeight * 0.6;

  return (
    <div
      className="gantt-task-bar absolute cursor-pointer group"
      style={{
        left,
        width,
        height: `${barHeight}px`,
        top: `${(rowHeight - barHeight) / 2}px`,
      }}
      onClick={onClick}
    >
      {/* Main task bar */}
      <div
        className="relative h-full rounded-md overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: isOverAllocated
            ? 'rgba(232, 169, 58, 0.15)' // Orange tint for over-allocated
            : 'rgba(0, 0, 0, 0.05)',
          borderWidth: isSelected ? '2px' : '1px',
          borderStyle: 'solid',
          borderColor: isSelected ? progressColor : baseColor,
          boxShadow: isSelected
            ? `0 2px 8px rgba(0, 0, 0, 0.15)`
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Background base color */}
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: baseColor }}
        />

        {/* Progress fill - Gradient from left to right */}
        {progress > 0 && (
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${progressColor} 0%, ${baseColor} 100%)`,
              opacity: 0.8,
            }}
          />
        )}

        {/* Over-allocation warning overlay */}
        {isOverAllocated && (
          <div
            className="absolute inset-0"
            style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(232, 169, 58, 0.1) 10px, rgba(232, 169, 58, 0.1) 20px)',
            }}
          />
        )}

        {/* Content */}
        <div className="relative h-full flex items-center px-2 gap-2">
          {/* Issue ID badge */}
          <span
            className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: baseColor,
            }}
          >
            {issue.id}
          </span>

          {/* Title (truncate if too long) */}
          <span
            className="text-xs font-medium truncate flex-1"
            style={{ color: '#2F241B' }}
          >
            {issue.title}
          </span>

          {/* Progress percentage (if space available) */}
          {progress > 0 && progress < 100 && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: progressColor,
              }}
            >
              {progress}%
            </span>
          )}

          {/* Completion checkmark */}
          {progress === 100 && (
            <svg
              className="w-4 h-4 flex-shrink-0"
              style={{ color: progressColor }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}

          {/* Over-allocation warning icon */}
          {isOverAllocated && (
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
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
          )}
        </div>

        {/* Milestone markers for parent tasks (epics/stories) */}
        {(issue.type === 'epic' || issue.type === 'story') && progress > 0 && progress < 100 && (
          <>
            {/* 50% milestone marker */}
            {progress >= 50 && (
              <div
                className="absolute top-0 bottom-0 w-px"
                style={{
                  left: '50%',
                  backgroundColor: 'rgba(47, 36, 27, 0.2)',
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div
          className="px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap"
          style={{
            backgroundColor: '#2F241B',
            color: '#F5F1EC',
          }}
        >
          <div className="font-semibold mb-1">{issue.title}</div>
          <div className="opacity-80">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </div>
          {progress > 0 && (
            <div className="opacity-80 mt-1">
              Progress: {progress}%
            </div>
          )}
          {issue.estimated_duration && (
            <div className="opacity-80">
              Estimated: {issue.estimated_duration}h
            </div>
          )}
          {isOverAllocated && (
            <div className="text-orange-300 font-semibold mt-1">
              ⚠️ Over-allocated
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
