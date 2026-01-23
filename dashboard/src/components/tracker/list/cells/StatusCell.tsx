/**
 * Status Cell Component
 * Editable status cell with dropdown for list view
 */

import { EditableCell } from '../EditableCell';
import { type Issue } from '../../../../api/tracker';
import { type DropdownOption } from '../InlineEditor';

interface StatusCellProps {
  issue: Issue;
  availableStatuses: string[];
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
}

export function StatusCell({ issue, availableStatuses, onUpdate }: StatusCellProps) {
  const statusOptions: DropdownOption[] = availableStatuses.map(status => ({
    value: status,
    label: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  }));

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('completed')) {
      return { bg: '#E8F5EA', text: '#52A560' };
    }
    if (statusLower.includes('progress')) {
      return { bg: '#FDF5F3', text: '#D97F6F' };
    }
    if (statusLower.includes('review')) {
      return { bg: '#EEF4FB', text: '#6B9BD1' };
    }
    if (statusLower.includes('todo')) {
      return { bg: '#FDF9EF', text: '#E0B666' };
    }
    return { bg: '#F5F4F2', text: '#6B5D52' };
  };

  return (
    <EditableCell
      value={issue.status}
      issue={issue}
      field="status"
      fieldType="dropdown"
      options={statusOptions}
      onUpdate={onUpdate}
      formatValue={(value) => {
        const colors = getStatusColor(value as string);
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium"
            style={{
              backgroundColor: colors.bg,
              color: colors.text
            }}
          >
            {(value as string).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </span>
        );
      }}
    />
  );
}
