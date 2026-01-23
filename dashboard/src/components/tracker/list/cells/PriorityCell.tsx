/**
 * Priority Cell Component
 * Editable priority cell with dropdown for list view
 */

import { EditableCell } from '../EditableCell';
import { type Issue } from '../../../../api/tracker';
import { type DropdownOption } from '../InlineEditor';

interface PriorityCellProps {
  issue: Issue;
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
}

export function PriorityCell({ issue, onUpdate }: PriorityCellProps) {
  const priorityOptions: DropdownOption[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return { bg: '#FCEEEB', text: '#C0392B' };
      case 'high':
        return { bg: '#FDF6EC', text: '#E8A93A' };
      case 'medium':
        return { bg: '#FDF9EF', text: '#E0B666' };
      case 'low':
        return { bg: '#F5F4F2', text: '#A39686' };
      default:
        return { bg: '#F5F4F2', text: '#6B5D52' };
    }
  };

  return (
    <EditableCell
      value={issue.priority}
      issue={issue}
      field="priority"
      fieldType="dropdown"
      options={priorityOptions}
      onUpdate={onUpdate}
      formatValue={(value) => {
        const colors = getPriorityColor(value as string);
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold"
            style={{
              backgroundColor: colors.bg,
              color: colors.text
            }}
          >
            {(value as string).charAt(0).toUpperCase() + (value as string).slice(1)}
          </span>
        );
      }}
    />
  );
}
