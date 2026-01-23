/**
 * Assignee Cell Component
 * Editable assignee cell with dropdown for list view
 */

import { EditableCell } from '../EditableCell';
import { type Issue } from '../../../../api/tracker';
import { type DropdownOption } from '../InlineEditor';
import { Avatar } from '../../shared/Avatar';

interface AssigneeCellProps {
  issue: Issue;
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
}

export function AssigneeCell({ issue, onUpdate }: AssigneeCellProps) {
  // Mock assignee options - in production, this would come from the API
  const assigneeOptions: DropdownOption[] = [
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'user-1', label: 'John Doe' },
    { value: 'user-2', label: 'Jane Smith' },
    { value: 'user-3', label: 'Bob Johnson' },
  ];

  // Helper to handle assignee field which has a complex structure
  const handleUpdate = async (issueId: string, field: keyof Issue, value: string | string[]) => {
    if (field === 'assignee') {
      // Transform the value into the proper assignee object format
      const assigneeValue = value as string;
      let assigneeData: Issue['assignee'] = null;

      if (assigneeValue !== 'unassigned') {
        const option = assigneeOptions.find(opt => opt.value === assigneeValue);
        if (option) {
          assigneeData = {
            id: assigneeValue,
            name: option.label,
            avatar: '' // Would be populated in production
          };
        }
      }

      // Make the API call with the transformed data
      await onUpdate(issueId, field, assigneeData as any);
    }
  };

  const assigneeValue = issue.assignee?.id || 'unassigned';

  return (
    <EditableCell
      value={assigneeValue}
      issue={issue}
      field="assignee"
      fieldType="dropdown"
      options={assigneeOptions}
      onUpdate={handleUpdate}
      formatValue={(value) => {
        if (value === 'unassigned' || !issue.assignee) {
          return (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#F5F1EC' }}
              >
                <svg className="w-3 h-3" style={{ color: '#A39686' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                </svg>
              </div>
              <span className="text-sm" style={{ color: '#A39686' }}>
                Unassigned
              </span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Avatar
              name={issue.assignee.name}
              avatar={issue.assignee.avatar}
              size="sm"
            />
            <span className="text-sm font-medium" style={{ color: '#2F241B' }}>
              {issue.assignee.name}
            </span>
          </div>
        );
      }}
    />
  );
}
