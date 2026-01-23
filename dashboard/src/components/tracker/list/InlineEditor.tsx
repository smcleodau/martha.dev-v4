/**
 * Inline Editor Component
 * Generic inline editor that handles double-click to edit with support for different field types
 */

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { type Issue } from '../../../api/tracker';

export type EditorFieldType = 'text' | 'dropdown' | 'multi-select';

export interface DropdownOption {
  value: string;
  label: string;
  color?: string;
}

interface InlineEditorProps {
  value: string | string[];
  fieldType: EditorFieldType;
  options?: DropdownOption[]; // For dropdown and multi-select
  onSave: (newValue: string | string[]) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

export function InlineEditor({
  value,
  fieldType,
  options = [],
  onSave,
  onCancel,
  placeholder = '',
  className = ''
}: InlineEditorProps) {
  const [editValue, setEditValue] = useState<string | string[]>(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    // Focus input when editor mounts
    if (fieldType === 'text' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    } else if (fieldType === 'dropdown' && selectRef.current) {
      selectRef.current.focus();
    }
  }, [fieldType]);

  const handleSave = async () => {
    if (isSaving) return;

    // Validate
    if (fieldType === 'text' && typeof editValue === 'string' && !editValue.trim()) {
      setError('Value cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await onSave(editValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleToggleMultiSelect = (optionValue: string) => {
    const currentValues = Array.isArray(editValue) ? editValue : [];
    if (currentValues.includes(optionValue)) {
      setEditValue(currentValues.filter(v => v !== optionValue));
    } else {
      setEditValue([...currentValues, optionValue]);
    }
  };

  return (
    <div className={`inline-editor ${className}`}>
      {/* Text Input */}
      {fieldType === 'text' && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            disabled={isSaving}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border-2 focus:outline-none transition-colors"
            style={{
              borderColor: error ? '#C0392B' : '#D97F6F',
              backgroundColor: '#FFFFFF',
              color: '#2F241B'
            }}
          />
        </div>
      )}

      {/* Dropdown */}
      {fieldType === 'dropdown' && (
        <div className="flex items-center gap-2">
          <select
            ref={selectRef}
            value={editValue as string}
            onChange={(e) => {
              setEditValue(e.target.value);
              // Auto-save on change for dropdowns
              setTimeout(() => {
                onSave(e.target.value).catch(err => {
                  setError(err instanceof Error ? err.message : 'Failed to save');
                });
              }, 0);
            }}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="flex-1 px-3 py-1.5 text-sm rounded-md border-2 focus:outline-none transition-colors"
            style={{
              borderColor: '#D97F6F',
              backgroundColor: '#FFFFFF',
              color: '#2F241B'
            }}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Multi-Select */}
      {fieldType === 'multi-select' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5 p-2 rounded-md border-2" style={{ borderColor: '#D97F6F', backgroundColor: '#FFFFFF' }}>
            {options.map(option => {
              const isSelected = Array.isArray(editValue) && editValue.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleMultiSelect(option.value)}
                  disabled={isSaving}
                  className="px-2.5 py-1 text-xs font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: isSelected ? (option.color || '#D97F6F') : '#F5F4F2',
                    color: isSelected ? '#FFFFFF' : '#6B5D52',
                    opacity: isSaving ? 0.6 : 1
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#F5F4F2',
                color: '#6B5D52'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#D97F6F',
                color: '#FFFFFF',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-1 text-xs font-medium" style={{ color: '#C0392B' }}>
          {error}
        </div>
      )}

      {/* Saving Indicator */}
      {isSaving && fieldType !== 'multi-select' && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D97F6F' }} />
            <span className="text-xs font-medium" style={{ color: '#6B5D52' }}>Saving...</span>
          </div>
        </div>
      )}
    </div>
  );
}
