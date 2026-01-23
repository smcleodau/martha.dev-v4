/**
 * Resource Allocation Bar Component
 * Visual bar showing workload per team member with color-coded utilization
 */

import { type ResourceAllocation, getUtilizationColor, formatHours } from './hooks/useResourceAllocation';

interface ResourceAllocationBarProps {
  allocation: ResourceAllocation;
  onClick?: () => void;
  showDetails?: boolean;
}

export function ResourceAllocationBar({
  allocation,
  onClick,
  showDetails = true,
}: ResourceAllocationBarProps) {
  const colors = getUtilizationColor(allocation.severityLevel);
  const utilizationWidth = Math.min(allocation.utilizationPercent, 100);
  const overflowWidth = Math.max(0, allocation.utilizationPercent - 100);

  return (
    <div
      className={`resource-allocation-bar ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Allocation Bar */}
      <div
        className="relative w-full h-8 rounded-lg overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: colors.border,
        }}
      >
        {/* Main utilization fill */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: `${utilizationWidth}%`,
            backgroundColor: colors.fill,
            opacity: 0.7,
          }}
        />

        {/* Overflow indicator (over 100%) */}
        {overflowWidth > 0 && (
          <div
            className="absolute inset-y-0 left-0 transition-all duration-300"
            style={{
              width: '100%',
              background: `repeating-linear-gradient(
                45deg,
                ${colors.fill},
                ${colors.fill} 10px,
                ${colors.bg} 10px,
                ${colors.bg} 20px
              )`,
              opacity: 0.5,
            }}
          />
        )}

        {/* Hours text overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: colors.text,
            }}
          >
            {formatHours(allocation.totalHours)} / {formatHours(allocation.availableHours)}
          </span>
        </div>

        {/* Utilization percentage badge (right side) */}
        <div className="absolute inset-y-0 right-2 flex items-center">
          <span
            className="text-xs font-bold"
            style={{ color: colors.text }}
          >
            {Math.round(allocation.utilizationPercent)}%
          </span>
        </div>
      </div>

      {/* Details section */}
      {showDetails && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span style={{ color: '#6B5D52' }}>
            {allocation.taskCount} {allocation.taskCount === 1 ? 'task' : 'tasks'}
          </span>

          {allocation.isOverAllocated && (
            <div className="flex items-center gap-1" style={{ color: colors.text }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">
                {allocation.severityLevel === 'severely-over-allocated'
                  ? 'Severely over-allocated'
                  : 'Over-allocated'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Task breakdown tooltip (on hover) */}
      {showDetails && allocation.tasks.length > 0 && (
        <div className="resource-allocation-tooltip hidden group-hover:block absolute z-50 mt-2 p-3 rounded-lg shadow-lg max-w-xs" style={{ backgroundColor: '#2F241B', color: '#F5F1EC' }}>
          <div className="text-xs font-semibold mb-2">Task Breakdown</div>
          <div className="space-y-1">
            {allocation.tasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-start gap-2 text-xs">
                <span className="font-mono opacity-70">{task.id}</span>
                <div className="flex-1">
                  <div className="truncate">{task.title}</div>
                  {task.estimated_duration && (
                    <div className="opacity-70">{formatHours(task.estimated_duration)}</div>
                  )}
                </div>
              </div>
            ))}
            {allocation.tasks.length > 5 && (
              <div className="text-xs opacity-70 mt-1">
                +{allocation.tasks.length - 5} more tasks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
