/**
 * Statistics Bar Component
 * Displays board statistics in a horizontal bar with tooltips
 * Fetches from /api/tracker/worktrees/:worktreeId/boards/:boardId/stats
 */

import { useState, useEffect } from 'react';

// Statistics API response types
interface BoardStatistics {
  board: {
    id: string;
    name: string;
    description: string;
  };
  contributors: {
    total: number;
    list: string[];
  };
  active_users: {
    total: number;
    last_7_days: string[];
  };
  issues: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_initiative: Record<string, number>;
    by_team: Record<string, number>;
    by_epic: Record<string, number>;
    by_release: Record<string, number>;
  };
  time_tracking: {
    total_estimated_hours: number;
    total_logged_hours: number;
    issues_with_estimates: number;
    issues_with_time_logged: number;
    completion_percentage: number;
  };
  story_points: {
    total: number;
    issues_with_points: number;
    average: number;
  };
}

interface StatisticsBarProps {
  worktreeId: string;
  boardId: string;
}

// Custom hook for fetching statistics
function useStatistics(worktreeId: string, boardId: string) {
  const [data, setData] = useState<BoardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/stats`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.statusText}`);
        }

        const stats = await response.json();

        if (isMounted) {
          setData(stats);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load statistics');
          console.error('Failed to fetch board statistics:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [worktreeId, boardId]);

  return { data, loading, error };
}

// Tooltip component
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="absolute z-50 px-3 py-2 text-sm rounded-lg shadow-lg whitespace-nowrap bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none"
          style={{
            backgroundColor: '#2F241B',
            color: 'white',
            maxWidth: '300px',
          }}
        >
          {content}
          {/* Arrow */}
          <div
            className="absolute w-2 h-2 transform rotate-45 top-full left-1/2 -translate-x-1/2 -mt-1"
            style={{ backgroundColor: '#2F241B' }}
          />
        </div>
      )}
    </div>
  );
}

// Skeleton loader for statistics
function StatisticsSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 border-b animate-pulse"
      style={{
        backgroundColor: '#F5F1EC',
        borderBottomColor: '#E8E0D5',
      }}
    >
      <div className="h-4 w-16 rounded" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="w-px h-4" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="h-4 w-20 rounded" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="w-px h-4" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="h-4 w-16 rounded" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="w-px h-4" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="h-4 w-24 rounded" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="w-px h-4" style={{ backgroundColor: '#E8E0D5' }} />
      <div className="h-4 w-20 rounded" style={{ backgroundColor: '#E8E0D5' }} />
    </div>
  );
}

// Metric component with separator
interface MetricProps {
  label: string;
  value: string | number;
  tooltip?: React.ReactNode;
  showSeparator?: boolean;
  icon?: React.ReactNode;
}

function Metric({ label, value, tooltip, showSeparator = true, icon }: MetricProps) {
  const content = (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="font-semibold" style={{ color: '#2F241B' }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: '#6B5D52' }}>
        {label}
      </span>
    </div>
  );

  return (
    <>
      {tooltip ? (
        <Tooltip content={tooltip}>
          <div className="cursor-help">{content}</div>
        </Tooltip>
      ) : (
        content
      )}
      {showSeparator && (
        <div className="w-px h-4" style={{ backgroundColor: '#D4C4B0' }} />
      )}
    </>
  );
}

export function StatisticsBar({ worktreeId, boardId }: StatisticsBarProps) {
  const { data, loading, error } = useStatistics(worktreeId, boardId);

  if (loading) {
    return <StatisticsSkeleton />;
  }

  if (error || !data) {
    return (
      <div
        className="flex items-center justify-center px-4 py-2.5 border-b"
        style={{
          backgroundColor: '#F5F1EC',
          borderBottomColor: '#E8E0D5',
        }}
      >
        <span className="text-xs" style={{ color: '#A39686' }}>
          Failed to load statistics
        </span>
      </div>
    );
  }

  const { issues, contributors, active_users } = data;

  // Extract type counts
  const epicCount = issues.by_type.epic || 0;
  const storyCount = issues.by_type.story || 0;
  const taskCount = issues.by_type.task || 0;
  const bugCount = issues.by_type.bug || 0;

  // Build contributor tooltip
  const contributorTooltip = (
    <div>
      <div className="font-semibold mb-1">Contributors ({contributors.total})</div>
      {contributors.list.length > 0 ? (
        <div className="text-xs opacity-90">
          {contributors.list.slice(0, 10).join(', ')}
          {contributors.list.length > 10 && ` +${contributors.list.length - 10} more`}
        </div>
      ) : (
        <div className="text-xs opacity-90">No contributors yet</div>
      )}
    </div>
  );

  // Build active users tooltip
  const activeUsersTooltip = (
    <div>
      <div className="font-semibold mb-1">Active Users ({active_users.total})</div>
      <div className="text-xs opacity-90">Active in last 7 days</div>
      {active_users.last_7_days.length > 0 && (
        <div className="text-xs opacity-90 mt-1">
          {active_users.last_7_days.slice(0, 10).join(', ')}
          {active_users.last_7_days.length > 10 && ` +${active_users.last_7_days.length - 10} more`}
        </div>
      )}
    </div>
  );

  // Build issue type tooltips with breakdown
  const epicTooltip = (
    <div>
      <div className="font-semibold mb-1">Epics ({epicCount})</div>
      <div className="text-xs opacity-90">
        High-level initiatives and features
      </div>
    </div>
  );

  const storyTooltip = (
    <div>
      <div className="font-semibold mb-1">Stories ({storyCount})</div>
      <div className="text-xs opacity-90">
        User-focused features and requirements
      </div>
    </div>
  );

  const taskTooltip = (
    <div>
      <div className="font-semibold mb-1">Tasks ({taskCount})</div>
      <div className="text-xs opacity-90">
        Technical work items and implementation tasks
      </div>
    </div>
  );

  const bugTooltip = bugCount > 0 ? (
    <div>
      <div className="font-semibold mb-1">Bugs ({bugCount})</div>
      <div className="text-xs opacity-90">
        Issues requiring fixes and corrections
      </div>
    </div>
  ) : undefined;

  return (
    <div
      className="flex items-center gap-4 px-4 py-2.5 border-b text-sm overflow-x-auto md:overflow-x-visible"
      style={{
        backgroundColor: '#F5F1EC',
        borderBottomColor: '#E8E0D5',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <style>{`
        .flex::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Metric
        label="Epics"
        value={epicCount}
        tooltip={epicTooltip}
      />
      <Metric
        label="Stories"
        value={storyCount}
        tooltip={storyTooltip}
      />
      <Metric
        label="Tasks"
        value={taskCount}
        tooltip={taskTooltip}
      />
      {bugCount > 0 && (
        <Metric
          label="Bugs"
          value={bugCount}
          tooltip={bugTooltip}
        />
      )}
      <Metric
        label="Contributors"
        value={contributors.total}
        tooltip={contributorTooltip}
      />
      <Metric
        label="Active"
        value={active_users.total}
        tooltip={activeUsersTooltip}
        showSeparator={false}
        icon={
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: '#10B981' }}
          />
        }
      />
    </div>
  );
}
