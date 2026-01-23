/**
 * ID Cell - Display issue ID with monospace font
 */

import { type Issue } from '../../../../api/tracker';

interface IdCellProps {
  issue: Issue;
}

export function IdCell({ issue }: IdCellProps) {
  return (
    <span
      className="text-sm font-mono font-semibold"
      style={{ color: '#6B5D52' }}
    >
      {issue.id}
    </span>
  );
}
