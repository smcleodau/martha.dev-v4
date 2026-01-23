/**
 * FilterDropdown Component - Reusable multi-select dropdown base component
 * Used for building specialized filter dropdowns (initiatives, teams, etc.)
 */

import { useState, useRef, useEffect } from 'react';

export interface FilterItem {
  id: string;
  label: string;
  color?: string;
  metadata?: Record<string, any>;
}

interface FilterDropdownProps {
  label: string;
  items: FilterItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  loading?: boolean;
  renderItem?: (item: FilterItem, selected: boolean) => React.ReactNode;
}

export function FilterDropdown({
  label,
  items,
  selectedIds,
  onSelectionChange,
  placeholder = 'Search...',
  icon,
  searchable = true,
  loading = false,
  renderItem,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchText('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleItem = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const filteredItems = searchText
    ? items.filter(item =>
        item.label.toLowerCase().includes(searchText.toLowerCase())
      )
    : items;

  const selectedCount = selectedIds.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
          selectedCount > 0
            ? 'bg-coral-50 border-coral-300 text-coral-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {icon}
        <span>{label}</span>
        {selectedCount > 0 && (
          <span className="bg-coral-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {selectedCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-coral-500"
                autoFocus
              />
            </div>
          )}

          {/* Items List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No items found</div>
            ) : (
              <div className="py-1">
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.id)}
                        className="rounded border-gray-300 text-coral-600 focus:ring-coral-500"
                      />
                      {renderItem ? (
                        renderItem(item, isSelected)
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          {item.color && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                          )}
                          <span className="text-sm text-gray-700 truncate">{item.label}</span>
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedCount > 0 && (
            <div className="p-2 border-t border-gray-200">
              <button
                onClick={clearSelection}
                className="w-full px-3 py-1.5 text-sm font-medium text-coral-700 hover:bg-coral-50 rounded transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
