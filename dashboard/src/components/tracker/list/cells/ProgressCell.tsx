/**
 * Progress Cell - Display progress bar for parent issues
 */

import { useMemo } from 'react';
import { type Issue } from '../../../../api/tracker';
import { calculateProgress } from '../../shared/utils';

interface ProgressCellProps {
  issue: Issue;
  allIssues: Record<string, Issue>;
}

export function ProgressCell({ issue, allIssues }: ProgressCellProps) {
  const progress = useMemo(() => {
    if (issue.type === 'epic' || issue.type === 'story') {
      return calculateProgress(issue, allIssues);
    }
    return null;
  }, [issue, allIssues]);

  // Don't show progress for tasks and bugs
  if (!progress || progress.total === 0) {
    return (
      <span className="text-xs" style={{ color: '#A39686' }}>
        -
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: '#F5F1EC' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300 progress-gradient-coral-gold"
            style={{
              width: `${progress.percentage}%`,
            }}
          />
        </div>
      </div>
      <span
        className="text-xs font-semibold whitespace-nowrap"
        style={{ color: '#6B5D52' }}
      >
        {progress.percentage}%
      </span>
    </div>
  );
}
