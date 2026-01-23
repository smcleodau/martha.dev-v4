/**
 * TeamFilter Component - Team multi-select dropdown
 * Shows team colors and member avatars
 */

import { useState, useEffect } from 'react';
import { FilterDropdown, type FilterItem } from './FilterDropdown';
import { Avatar } from './Avatar';

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
  members: TeamMember[];
}

interface TeamFilterProps {
  worktreeId: string;
  selectedTeams: string[];
  onSelectionChange: (teams: string[]) => void;
}

export function TeamFilter({
  worktreeId,
  selectedTeams,
  onSelectionChange,
}: TeamFilterProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, [worktreeId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/teams`,
        {
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      } else {
        console.error('Failed to load teams:', response.statusText);
        setTeams([]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const filterItems: FilterItem[] = teams.map((team) => ({
    id: team.id,
    label: team.name,
    color: team.color,
    metadata: { members: team.members },
  }));

  const renderTeamItem = (item: FilterItem) => {
    const members = (item.metadata?.members || []) as TeamMember[];

    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: item.color }}
        />
        <span className="text-sm text-gray-700 truncate flex-1">{item.label}</span>
        {members.length > 0 && (
          <div className="flex -space-x-1 flex-shrink-0">
            {members.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                avatar={member.avatar}
                size="xs"
                className="ring-2 ring-white"
              />
            ))}
            {members.length > 3 && (
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 ring-2 ring-white">
                +{members.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );

  return (
    <FilterDropdown
      label="Team"
      items={filterItems}
      selectedIds={selectedTeams}
      onSelectionChange={onSelectionChange}
      placeholder="Search teams..."
      icon={icon}
      loading={loading}
      searchable={true}
      renderItem={renderTeamItem}
    />
  );
}
