/**
 * InitiativeFilter Component - Initiative multi-select dropdown
 * Fetches initiatives from the API and displays them with colors
 */

import { useState, useEffect } from 'react';
import { FilterDropdown, type FilterItem } from './FilterDropdown';

interface Initiative {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface InitiativeFilterProps {
  worktreeId: string;
  selectedInitiatives: string[];
  onSelectionChange: (initiatives: string[]) => void;
}

export function InitiativeFilter({
  worktreeId,
  selectedInitiatives,
  onSelectionChange,
}: InitiativeFilterProps) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitiatives();
  }, [worktreeId]);

  const loadInitiatives = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/initiatives`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInitiatives(data.initiatives || []);
      } else {
        console.error('Failed to load initiatives:', response.statusText);
        setInitiatives([]);
      }
    } catch (error) {
      console.error('Error loading initiatives:', error);
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems: FilterItem[] = initiatives.map((initiative) => ({
    id: initiative.id,
    label: initiative.name,
    color: initiative.color,
    metadata: { description: initiative.description },
  }));

  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  return (
    <FilterDropdown
      label="Initiative"
      items={filterItems}
      selectedIds={selectedInitiatives}
      onSelectionChange={onSelectionChange}
      placeholder="Search initiatives..."
      icon={icon}
      loading={loading}
      searchable={true}
    />
  );
}
