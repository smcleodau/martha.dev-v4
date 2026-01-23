/**
 * Dependencies Panel Component - Manages issue dependencies (blocks, blocked by, related)
 */

import { type Issue } from '../../../api/tracker';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface DependenciesPanelProps {
  issue: Issue;
  worktreeId: string;
  boardId: string;
  allIssues: Record<string, Issue>;
}

type DependencyType = 'blocks' | 'blocked_by' | 'related';

export function DependenciesPanel({ issue, worktreeId, boardId, allIssues }: DependenciesPanelProps) {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<DependencyType>('blocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current dependencies from issue
  const dependencies = issue.dependencies || {
    blocks: [],
    blocked_by: [],
    related: []
  };

  // Check for circular dependencies
  const detectCircularDependency = (targetId: string, type: DependencyType): boolean => {
    if (type === 'related') return false; // Related links don't create cycles

    const visited = new Set<string>();
    const checkCycle = (currentId: string): boolean => {
      if (currentId === issue.id) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const current = allIssues[currentId];
      if (!current || !current.dependencies) return false;

      // If we're adding a "blocks" link, check if target blocks us transitively
      if (type === 'blocks') {
        const blockedBy = current.dependencies.blocked_by || [];
        for (const depId of blockedBy) {
          if (checkCycle(depId)) return true;
        }
      }

      // If we're adding a "blocked_by" link, check if target is blocked by us transitively
      if (type === 'blocked_by') {
        const blocks = current.dependencies.blocks || [];
        for (const depId of blocks) {
          if (checkCycle(depId)) return true;
        }
      }

      return false;
    };

    return checkCycle(targetId);
  };

  // Filter issues for autocomplete
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return Object.values(allIssues)
      .filter(i =>
        i.id !== issue.id && // Don't show current issue
        (i.id.toLowerCase().includes(query) || i.title.toLowerCase().includes(query))
      )
      .slice(0, 10);
  }, [searchQuery, allIssues, issue.id]);

  const handleAddDependency = async (targetId: string) => {
    setError(null);

    // Check for circular dependency
    if (detectCircularDependency(targetId, selectedType)) {
      setError('Circular dependency detected! This would create a dependency cycle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/dependencies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: selectedType,
            target_issue_id: targetId
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to add dependency');
      }

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to add dependency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDependency = async (targetId: string, type: DependencyType) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/tracker/worktrees/${worktreeId}/boards/${boardId}/issues/${issue.id}/dependencies/${targetId}?type=${type}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to remove dependency');
      }

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to remove dependency');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueClick = (issueId: string) => {
    navigate(`/tracker/${worktreeId}/${boardId}/${issueId}`);
  };

  const renderDependencyList = (issueIds: string[], type: DependencyType, title: string) => {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold" style={{ color: '#6B5D52' }}>
            {title}
          </label>
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#F5F1EC', color: '#A39686' }}>
            {issueIds.length}
          </span>
        </div>

        {issueIds.length > 0 ? (
          <div className="space-y-2">
            {issueIds.map(depId => {
              const depIssue = allIssues[depId];
              if (!depIssue) return null;

              return (
                <div
                  key={depId}
                  className="flex items-center justify-between p-2 rounded-lg border transition-all hover:shadow-sm group"
                  style={{
                    borderColor: '#E8E0D5',
                    backgroundColor: 'white'
                  }}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleIssueClick(depId)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold" style={{ color: '#A39686' }}>
                        {depId}
                      </span>
                      <span className="text-sm font-medium hover:underline" style={{ color: '#2F241B' }}>
                        {depIssue.title}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveDependency(depId, type)}
                    disabled={isSubmitting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
                    style={{ color: '#C0392B' }}
                    title="Remove dependency"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: '#A39686' }}>
            No dependencies
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="bg-white rounded-lg p-6 shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
        Dependencies
      </h3>

      {/* Error message */}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg border"
          style={{
            backgroundColor: '#FCEEEB',
            borderColor: '#F5B1A4',
            color: '#C0392B'
          }}
        >
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Blocks */}
      {renderDependencyList(dependencies.blocks || [], 'blocks', 'Blocks')}

      {/* Blocked By */}
      {renderDependencyList(dependencies.blocked_by || [], 'blocked_by', 'Blocked By')}

      {/* Related */}
      {renderDependencyList(dependencies.related || [], 'related', 'Related')}

      {/* Add dependency section */}
      {!isAdding ? (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-2 border border-dashed rounded-lg text-sm font-medium transition-colors hover:bg-orange-50"
          style={{
            borderColor: '#E8E0D5',
            color: '#D97F6F'
          }}
        >
          + Add Dependency
        </button>
      ) : (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: '#FDFCFA',
            borderColor: '#E8E0D5'
          }}
        >
          <div className="mb-3">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Dependency Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DependencyType)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
              style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
            >
              <option value="blocks">Blocks</option>
              <option value="blocked_by">Blocked By</option>
              <option value="related">Related</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Search Issue
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type issue ID or title..."
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral"
              style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
            />
          </div>

          {/* Autocomplete results */}
          {searchQuery && filteredIssues.length > 0 && (
            <div
              className="mb-3 max-h-48 overflow-y-auto rounded-lg border"
              style={{ borderColor: '#E8E0D5' }}
            >
              {filteredIssues.map(filterIssue => (
                <button
                  key={filterIssue.id}
                  onClick={() => {
                    handleAddDependency(filterIssue.id);
                    setSearchQuery('');
                    setIsAdding(false);
                  }}
                  disabled={isSubmitting}
                  className="w-full text-left p-3 hover:bg-orange-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: '#F5F1EC' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#A39686' }}>
                      {filterIssue.id}
                    </span>
                    <span className="text-sm font-medium flex-1 truncate" style={{ color: '#2F241B' }}>
                      {filterIssue.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: '#F5F1EC',
                        color: '#6B5D52'
                      }}
                    >
                      {filterIssue.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setSearchQuery('');
                setError(null);
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-md text-sm font-medium"
              style={{ backgroundColor: '#F5F1EC', color: '#6B5D52' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
