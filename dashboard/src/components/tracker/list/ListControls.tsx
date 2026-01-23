/**
 * List Controls Component
 * View-specific filter controls for List view
 * Includes: Column visibility menu, Density selector, Export button
 */

import { useState, useRef, useEffect } from 'react';
import { type Issue } from '../../../api/tracker';

export type DensityOption = 'compact' | 'normal' | 'comfortable';

export interface ColumnVisibility {
  id: boolean;
  title: boolean;
  type: boolean;
  status: boolean;
  priority: boolean;
  assignee: boolean;
  storyPoints: boolean;
  labels: boolean;
  dueDate: boolean;
}

export interface ListControlsProps {
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
  density: DensityOption;
  onDensityChange: (density: DensityOption) => void;
  onExport?: () => void;
  issues: Issue[];
  className?: string;
}

export function ListControls({
  columnVisibility,
  onColumnVisibilityChange,
  density,
  onDensityChange,
  onExport,
  issues,
  className = '',
}: ListControlsProps) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDensityMenu, setShowDensityMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const densityMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
        setShowColumnMenu(false);
      }
      if (densityMenuRef.current && !densityMenuRef.current.contains(event.target as Node)) {
        setShowDensityMenu(false);
      }
    }

    if (showColumnMenu || showDensityMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColumnMenu, showDensityMenu]);

  const toggleColumn = (column: keyof ColumnVisibility) => {
    onColumnVisibilityChange({
      ...columnVisibility,
      [column]: !columnVisibility[column],
    });
  };

  const handleExportCSV = () => {
    if (!onExport) {
      // Default CSV export implementation
      const visibleColumns = Object.entries(columnVisibility)
        .filter(([_, visible]) => visible)
        .map(([key]) => key);

      const headers = visibleColumns.join(',');
      const rows = issues.map(issue => {
        return visibleColumns
          .map(col => {
            const value = issue[col as keyof Issue];
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value).replace(/"/g, '""');
            }
            return String(value || '').replace(/"/g, '""');
          })
          .join(',');
      });

      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `issues-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      onExport();
    }
  };

  const visibleColumnCount = Object.values(columnVisibility).filter(Boolean).length;

  const densityLabels: Record<DensityOption, string> = {
    compact: 'Compact',
    normal: 'Normal',
    comfortable: 'Comfortable',
  };

  return (
    <div className={`list-controls flex items-center gap-3 ${className}`}>
      {/* Column Visibility Menu */}
      <div className="relative" ref={columnMenuRef}>
        <button
          onClick={() => setShowColumnMenu(!showColumnMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
          style={{
            backgroundColor: '#FDFBF8',
            borderColor: '#E8E0D5',
            color: '#2F241B',
          }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: '#6B5D52' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2m0 0h-2"
            />
          </svg>
          <span className="text-sm font-medium">Columns</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#E8E0D5', color: '#6B5D52' }}
          >
            {visibleColumnCount}
          </span>
        </button>

        {/* Column Menu Dropdown */}
        {showColumnMenu && (
          <div
            className="absolute top-full left-0 mt-2 w-56 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E0D5',
              borderWidth: '1px',
              boxShadow: '0 10px 25px rgba(47, 36, 27, 0.15)',
            }}
          >
            <div
              className="px-3 py-2"
              style={{ backgroundColor: '#F5F4F2', borderBottom: '1px solid #E8E0D5' }}
            >
              <div className="text-xs font-semibold" style={{ color: '#2F241B' }}>
                Show/Hide Columns
              </div>
            </div>

            <div className="py-1">
              {Object.entries(columnVisibility).map(([column, visible]) => (
                <button
                  key={column}
                  onClick={() => toggleColumn(column as keyof ColumnVisibility)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-opacity-50 transition-colors"
                  style={{
                    backgroundColor: visible ? '#F5F4F2' : 'transparent',
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      visible ? 'border-transparent' : ''
                    }`}
                    style={{
                      backgroundColor: visible ? '#D97F6F' : 'transparent',
                      borderColor: visible ? '#D97F6F' : '#A39686',
                    }}
                  >
                    {visible && (
                      <svg className="w-3 h-3" style={{ color: '#FFFFFF' }} fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: '#2F241B' }}>
                    {column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Density Selector */}
      <div className="relative" ref={densityMenuRef}>
        <button
          onClick={() => setShowDensityMenu(!showDensityMenu)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
          style={{
            backgroundColor: '#FDFBF8',
            borderColor: '#E8E0D5',
            color: '#2F241B',
          }}
        >
          <svg
            className="w-4 h-4"
            style={{ color: '#6B5D52' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <span className="text-sm font-medium">{densityLabels[density]}</span>
        </button>

        {/* Density Menu Dropdown */}
        {showDensityMenu && (
          <div
            className="absolute top-full left-0 mt-2 w-48 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E0D5',
              borderWidth: '1px',
              boxShadow: '0 10px 25px rgba(47, 36, 27, 0.15)',
            }}
          >
            <div
              className="px-3 py-2"
              style={{ backgroundColor: '#F5F4F2', borderBottom: '1px solid #E8E0D5' }}
            >
              <div className="text-xs font-semibold" style={{ color: '#2F241B' }}>
                Row Density
              </div>
            </div>

            <div className="py-1">
              {(['compact', 'normal', 'comfortable'] as DensityOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onDensityChange(option);
                    setShowDensityMenu(false);
                  }}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                  style={{
                    backgroundColor: density === option ? '#F5F4F2' : 'transparent',
                  }}
                >
                  <span className="text-sm" style={{ color: '#2F241B' }}>
                    {densityLabels[option]}
                  </span>
                  {density === option && (
                    <svg
                      className="w-4 h-4"
                      style={{ color: '#D97F6F' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExportCSV}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors hover:bg-opacity-50"
        style={{
          backgroundColor: '#FDFBF8',
          borderColor: '#E8E0D5',
          color: '#2F241B',
        }}
      >
        <svg
          className="w-4 h-4"
          style={{ color: '#6B5D52' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span className="text-sm font-medium">Export CSV</span>
      </button>
    </div>
  );
}
