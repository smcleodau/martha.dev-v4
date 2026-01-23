/**
 * List View Component - Table view for issues using TanStack Table
 * Phase 4: MTH-049 - List View Implementation
 */

import { type Issue } from '../../../api/tracker';
import { IssueTable } from '../list/IssueTable';

interface ListViewProps {
  issues: Issue[];
  onIssueClick: (issueId: string) => void;
  onIssueUpdate?: (issueId: string, updates: Partial<Issue>) => Promise<void>;
  onIssueDelete?: (issueId: string) => Promise<void>;
}

export function ListView({
  issues,
  onIssueClick,
  onIssueUpdate,
  onIssueDelete
}: ListViewProps) {
  return (
    <div
      className="flex-1 overflow-auto"
      style={{ backgroundColor: '#F5F1EC' }}
    >
      <div className="p-6 min-w-max">
        <IssueTable
          issues={issues}
          onIssueClick={onIssueClick}
          onIssueUpdate={onIssueUpdate}
          onIssueDelete={onIssueDelete}
        />
      </div>
    </div>
  );
}
