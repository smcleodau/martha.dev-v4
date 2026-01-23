/**
 * List View Component
 * Table-based view with grouping and virtualization for high performance
 */

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { type Issue } from '../../../api/tracker';
import { GroupByControls, type GroupByOption } from './GroupByControls';
import { GroupHeader } from './GroupHeader';
import { VirtualizedTable, useFlattenedRows, type VirtualRow } from './VirtualizedTable';
import { generateAvatarGradient } from '../shared/utils';
import { useListPreferences } from '../../../utils/preferenceHooks';

interface ListViewProps {
  issues: Issue[];
  onIssueClick: (issue: Issue) => void;
  searchQuery?: string;
  worktreeId?: string;
  boardId?: string;
}

interface GroupedData {
  name: string;
  issues: Issue[];
  groupBy: string;
}

export function ListView({
  issues,
  onIssueClick,
  searchQuery = '',
  worktreeId = 'default',
  boardId = 'default'
}: ListViewProps) {
  // Load preferences for this board
  const { groupBy: savedGroupBy, density, visibleColumns, setGroupBy: saveGroupBy, setDensity, setVisibleColumns } =
    useListPreferences(worktreeId, boardId);

  const [groupBy, setGroupBy] = useState<GroupByOption>(savedGroupBy);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Handle groupBy change with persistence
  const handleGroupByChange = useCallback((newGroupBy: GroupByOption) => {
    setGroupBy(newGroupBy);
    saveGroupBy(newGroupBy);
  }, [saveGroupBy]);

  // Filter issues by search query
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;

    const query = searchQuery.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.id.toLowerCase().includes(query) ||
        issue.title.toLowerCase().includes(query) ||
        issue.description.toLowerCase().includes(query) ||
        issue.labels.some((label) => label.toLowerCase().includes(query))
    );
  }, [issues, searchQuery]);

  // Group issues based on selected field
  const groupedIssues = useMemo((): GroupedData[] => {
    if (groupBy === 'none') {
      return [{ name: 'All Issues', issues: filteredIssues, groupBy: 'none' }];
    }

    const groups: Record<string, Issue[]> = {};

    filteredIssues.forEach((issue) => {
      let key: string;

      switch (groupBy) {
        case 'status':
          key = issue.status || 'No Status';
          break;
        case 'type':
          key = issue.type.charAt(0).toUpperCase() + issue.type.slice(1);
          break;
        case 'assignee':
          key = issue.assignee?.name || 'Unassigned';
          break;
        case 'priority':
          key = issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1);
          break;
        default:
          key = 'Unknown';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(issue);
    });

    // Sort groups by priority (if applicable) or alphabetically
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      if (groupBy === 'priority') {
        const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (priorityOrder[a as keyof typeof priorityOrder] || 99) -
               (priorityOrder[b as keyof typeof priorityOrder] || 99);
      }
      if (groupBy === 'type') {
        const typeOrder = { Epic: 0, Story: 1, Task: 2, Bug: 3 };
        return (typeOrder[a as keyof typeof typeOrder] || 99) -
               (typeOrder[b as keyof typeof typeOrder] || 99);
      }
      return a.localeCompare(b);
    });

    return sortedEntries.map(([name, issues]) => ({
      name,
      issues,
      groupBy,
    }));
  }, [filteredIssues, groupBy]);

  // Initialize expanded state for new groups
  useMemo(() => {
    const newExpandedGroups = new Set<string>();
    groupedIssues.forEach((group) => {
      const groupId = `${groupBy}-${group.name}`;
      // Auto-expand all groups or keep previous state
      if (expandedGroups.has(groupId) || groupBy === 'none') {
        newExpandedGroups.add(groupId);
      } else {
        // Auto-expand by default
        newExpandedGroups.add(groupId);
      }
    });
    setExpandedGroups(newExpandedGroups);
  }, [groupedIssues.length, groupBy]); // Only when groups change structure

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // Flatten groups into virtual rows
  const virtualRows = useFlattenedRows(groupedIssues, expandedGroups, groupBy);

  // Render group header
  const renderGroupHeader = useCallback(
    (data: any) => {
      if (groupBy === 'none') return null;

      return (
        <GroupHeader
          name={data.name}
          count={data.issues.length}
          isExpanded={data.isExpanded}
          onToggle={() => toggleGroup(data.groupId)}
          issues={data.issues}
          groupBy={groupBy as any}
        />
      );
    },
    [groupBy, toggleGroup]
  );

  // Render issue row - memoized for performance
  const renderIssueRow = useCallback(
    (issue: Issue, index: number) => {
      return <IssueRow key={issue.id} issue={issue} index={index} />;
    },
    []
  );

  return (
    <div className="list-view flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderBottomColor: '#E8E0D5',
        }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold" style={{ color: '#2F241B' }}>
            List View
          </h2>
          <span className="text-sm font-medium" style={{ color: '#A39686' }}>
            {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <GroupByControls value={groupBy} onChange={handleGroupByChange} />
        </div>
      </div>

      {/* Table Header */}
      {groupBy === 'none' && (
        <div
          className="grid gap-4 px-6 py-3 font-semibold text-xs uppercase tracking-wider"
          style={{
            gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr 1fr 100px',
            backgroundColor: '#F5F4F2',
            color: '#6B5D52',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: '#E8E0D5',
          }}
        >
          <div>ID</div>
          <div>Title</div>
          <div>Type</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Assignee</div>
          <div>Points</div>
        </div>
      )}

      {/* Virtualized Table */}
      <div className="flex-1 overflow-hidden">
        <VirtualizedTable
          rows={virtualRows}
          onRowClick={onIssueClick}
          renderGroupHeader={renderGroupHeader}
          renderIssueRow={renderIssueRow}
          estimatedRowHeight={56}
          overscanCount={10}
        />
      </div>
    </div>
  );
}

/**
 * Memoized Issue Row Component
 */
const IssueRow = memo(({ issue, index }: { issue: Issue; index: number }) => {
  // Type badge colors
  const typeBadgeStyle = {
    epic: { bg: '#F3F1F7', text: '#8B7AA8', border: '#D4CEE0' },
    story: { bg: '#FDF5F3', text: '#D97F6F', border: '#F9D0C8' },
    task: { bg: '#F5F4F2', text: '#A39686', border: '#D4CBBD' },
    bug: { bg: '#FCEEEB', text: '#C0392B', border: '#F5B1A4' },
  };

  // Priority badge colors
  const priorityBadgeStyle = {
    critical: { bg: '#FCEEEB', text: '#C0392B' },
    high: { bg: '#FDF6EC', text: '#E8A93A' },
    medium: { bg: '#FDF9EF', text: '#E0B666' },
    low: { bg: '#F5F4F2', text: '#A39686' },
  };

  const typeStyle = typeBadgeStyle[issue.type];
  const priorityStyle = priorityBadgeStyle[issue.priority];

  return (
    <div
      className="grid gap-4 px-6 py-3 hover:bg-opacity-50 transition-colors border-b"
      style={{
        gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr 1fr 100px',
        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FEFDFB',
        borderBottomColor: '#F5F1EC',
      }}
    >
      {/* ID */}
      <div className="flex items-center">
        <span className="text-xs font-mono font-semibold" style={{ color: '#A39686' }}>
          {issue.id}
        </span>
      </div>

      {/* Title */}
      <div className="flex items-center">
        <span className="text-sm font-medium truncate" style={{ color: '#2F241B' }}>
          {issue.title}
        </span>
      </div>

      {/* Type */}
      <div className="flex items-center">
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: typeStyle.bg,
            color: typeStyle.text,
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: typeStyle.border,
          }}
        >
          {issue.type}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center">
        <span className="text-sm font-medium" style={{ color: '#6B5D52' }}>
          {issue.status}
        </span>
      </div>

      {/* Priority */}
      <div className="flex items-center">
        <span
          className="text-xs px-2 py-1 rounded-md font-semibold"
          style={{
            backgroundColor: priorityStyle.bg,
            color: priorityStyle.text,
          }}
        >
          {issue.priority}
        </span>
      </div>

      {/* Assignee */}
      <div className="flex items-center">
        {issue.assignee ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white"
              style={{
                background: generateAvatarGradient(issue.assignee.name),
              }}
            >
              {issue.assignee.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm truncate" style={{ color: '#2F241B' }}>
              {issue.assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-sm" style={{ color: '#A39686' }}>
            Unassigned
          </span>
        )}
      </div>

      {/* Story Points */}
      <div className="flex items-center justify-end">
        {issue.story_points ? (
          <span className="text-sm font-semibold" style={{ color: '#E0B666' }}>
            {issue.story_points}
          </span>
        ) : (
          <span className="text-sm" style={{ color: '#D4CBBD' }}>
            —
          </span>
        )}
      </div>
    </div>
  );
});

IssueRow.displayName = 'IssueRow';
