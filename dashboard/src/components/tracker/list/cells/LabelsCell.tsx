/**
 * Labels Cell Component
 * Editable labels cell with multi-select for list view
 */

import { EditableCell } from '../EditableCell';
import { type Issue } from '../../../../api/tracker';
import { type DropdownOption } from '../InlineEditor';

interface LabelsCellProps {
  issue: Issue;
  availableLabels: string[];
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
}

export function LabelsCell({ issue, availableLabels, onUpdate }: LabelsCellProps) {
  const labelOptions: DropdownOption[] = availableLabels.map(label => ({
    value: label,
    label: label,
    color: '#D97F6F' // Could be customized per label
  }));

  return (
    <EditableCell
      value={issue.labels || []}
      issue={issue}
      field="labels"
      fieldType="multi-select"
      options={labelOptions}
      onUpdate={onUpdate}
      formatValue={(value) => {
        const labels = Array.isArray(value) ? value : [];
        if (labels.length === 0) {
          return (
            <span className="text-sm" style={{ color: '#A39686' }}>
              No labels
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {labels.slice(0, 3).map((label, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: '#F5F4F2',
                  color: '#6B5D52'
                }}
              >
                {label}
              </span>
            ))}
            {labels.length > 3 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: '#F5F4F2',
                  color: '#A39686'
                }}
              >
                +{labels.length - 3}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}
