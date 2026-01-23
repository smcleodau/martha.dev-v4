/**
 * Editable Cell Component
 * Base cell component that wraps InlineEditor for TanStack Table
 * Shows display value normally, editor on double-click
 */

import { useState } from 'react';
import { InlineEditor, type EditorFieldType, type DropdownOption } from './InlineEditor';
import { type Issue } from '../../../api/tracker';

interface EditableCellProps {
  value: string | string[];
  issue: Issue;
  field: keyof Issue;
  fieldType: EditorFieldType;
  options?: DropdownOption[];
  onUpdate: (issueId: string, field: keyof Issue, value: string | string[]) => Promise<void>;
  formatValue?: (value: string | string[]) => React.ReactNode;
  className?: string;
}

export function EditableCell({
  value,
  issue,
  field,
  fieldType,
  options = [],
  onUpdate,
  formatValue,
  className = ''
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [optimisticValue, setOptimisticValue] = useState(value);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = async (newValue: string | string[]) => {
    const oldValue = optimisticValue;

    // Optimistic update
    setOptimisticValue(newValue);
    setIsUpdating(true);

    try {
      await onUpdate(issue.id, field, newValue);
      setIsEditing(false);
    } catch (error) {
      // Rollback on failure
      setOptimisticValue(oldValue);
      throw error; // Re-throw for InlineEditor to handle
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  // Default format function
  const defaultFormatValue = (val: string | string[]) => {
    if (Array.isArray(val)) {
      return val.join(', ');
    }
    return val;
  };

  const displayValue = formatValue ? formatValue(optimisticValue) : defaultFormatValue(optimisticValue);

  return (
    <div className={`editable-cell relative ${className}`}>
      {!isEditing ? (
        <div
          onDoubleClick={handleDoubleClick}
          className="px-3 py-2 cursor-pointer rounded transition-colors hover:bg-opacity-50"
          style={{
            backgroundColor: isUpdating ? 'rgba(217, 127, 111, 0.05)' : 'transparent',
            opacity: isUpdating ? 0.7 : 1
          }}
          title="Double-click to edit"
        >
          {displayValue}
          {isUpdating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#D97F6F' }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-1">
          <InlineEditor
            value={optimisticValue}
            fieldType={fieldType}
            options={options}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  );
}
