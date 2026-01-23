/**
 * Title Cell Component - Editable
 * Editable title cell for list view with inline editing
 */

import { EditableCell } from '../EditableCell';
import { type Issue } from '../../../../api/tracker';

interface TitleCellProps {
  issue: Issue;
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
}

export function TitleCell({ issue, onUpdate }: TitleCellProps) {
  return (
    <EditableCell
      value={issue.title}
      issue={issue}
      field="title"
      fieldType="text"
      onUpdate={onUpdate}
      formatValue={(value) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium" style={{ color: '#2F241B' }}>
            {value as string}
          </span>
          {issue.parent_id && (
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: '#8B7AA8' }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
              Parent: {issue.parent_id}
            </span>
          )}
        </div>
      )}
    />
  );
}
