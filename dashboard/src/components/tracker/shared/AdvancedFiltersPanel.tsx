/**
 * AdvancedFiltersPanel Component - Additional filters panel
 * Date range pickers and custom field filters
 */

import type { FilterState } from './FilterBar';

interface AdvancedFiltersPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function AdvancedFiltersPanel({
  filters,
  onFiltersChange,
}: AdvancedFiltersPanelProps) {
  const handleStartDateChange = (type: 'from' | 'to', value: string) => {
    const newRange = {
      from: type === 'from' ? new Date(value) : filters.startDateRange?.from || new Date(),
      to: type === 'to' ? new Date(value) : filters.startDateRange?.to || new Date(),
    };
    onFiltersChange({ ...filters, startDateRange: newRange });
  };

  const handleDueDateChange = (type: 'from' | 'to', value: string) => {
    const newRange = {
      from: type === 'from' ? new Date(value) : filters.dueDateRange?.from || new Date(),
      to: type === 'to' ? new Date(value) : filters.dueDateRange?.to || new Date(),
    };
    onFiltersChange({ ...filters, dueDateRange: newRange });
  };

  const clearStartDateRange = () => {
    onFiltersChange({ ...filters, startDateRange: undefined });
  };

  const clearDueDateRange = () => {
    onFiltersChange({ ...filters, dueDateRange: undefined });
  };

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Start Date Range</label>
            {filters.startDateRange && (
              <button
                onClick={clearStartDateRange}
                className="text-xs text-coral-600 hover:text-coral-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">From</label>
              <input
                type="date"
                value={formatDateForInput(filters.startDateRange?.from)}
                onChange={(e) => handleStartDateChange('from', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">To</label>
              <input
                type="date"
                value={formatDateForInput(filters.startDateRange?.to)}
                onChange={(e) => handleStartDateChange('to', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>
        </div>

        {/* Due Date Range */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-gray-700">Due Date Range</label>
            {filters.dueDateRange && (
              <button
                onClick={clearDueDateRange}
                className="text-xs text-coral-600 hover:text-coral-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">From</label>
              <input
                type="date"
                value={formatDateForInput(filters.dueDateRange?.from)}
                onChange={(e) => handleDueDateChange('from', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">To</label>
              <input
                type="date"
                value={formatDateForInput(filters.dueDateRange?.to)}
                onChange={(e) => handleDueDateChange('to', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Fields Section - Placeholder for future enhancement */}
      <div className="pt-2 border-t border-gray-200">
        <label className="text-xs font-semibold text-gray-700 block mb-2">Custom Fields</label>
        <div className="text-sm text-gray-500 italic">
          Custom field filters will be available in a future update
        </div>
      </div>
    </div>
  );
}
