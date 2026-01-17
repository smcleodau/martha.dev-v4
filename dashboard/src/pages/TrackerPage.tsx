/**
 * Tracker Page - Multi-Board Kanban UI
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  boardsApi,
  worktreesApi,
  hierarchicalIssuesApi,
  type Issue,
  type Board,
  type WorktreeConfig,
} from '../api/tracker';
import { KanbanBoard } from '../components/tracker/board/KanbanBoard';
import { IssueDetailPanel } from '../components/tracker/detail/IssueDetailPanel';
import { FilterBar, type FilterState } from '../components/tracker/shared/FilterBar';

export function TrackerPage() {
  // URL params
  const params = useParams<{ worktreeId?: string; boardId?: string; issueId?: string }>();
  const navigate = useNavigate();

  // Multi-board state
  const [worktrees, setWorktrees] = useState<WorktreeConfig[]>([]);
  const [selectedWorktreeId, setSelectedWorktreeId] = useState<string>(params.worktreeId || 'martha-dev-v4');
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(params.boardId || 'phase1-temporal-foundation');

  // Current board data
  const [board, setBoard] = useState<Board | null>(null);
  const [issues, setIssues] = useState<Record<string, Issue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(params.issueId || null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    types: [],
    priorities: [],
    assignees: [],
    labels: [],
    showMyIssues: false,
    showUnassigned: false
  });

  // Load worktrees on mount
  useEffect(() => {
    loadWorktrees();
  }, []);

  // Sync URL params to state
  useEffect(() => {
    if (params.worktreeId && params.worktreeId !== selectedWorktreeId) {
      setSelectedWorktreeId(params.worktreeId);
    }
    if (params.boardId && params.boardId !== selectedBoardId) {
      setSelectedBoardId(params.boardId);
    }
    if (params.issueId !== selectedIssue) {
      setSelectedIssue(params.issueId || null);
    }
  }, [params.worktreeId, params.boardId, params.issueId]);

  // Load boards when worktree changes
  useEffect(() => {
    if (selectedWorktreeId) {
      loadBoards(selectedWorktreeId);
    }
  }, [selectedWorktreeId]);

  // Load board and issues when board changes
  useEffect(() => {
    if (selectedWorktreeId && selectedBoardId) {
      loadBoardData(selectedWorktreeId, selectedBoardId);
    }
  }, [selectedWorktreeId, selectedBoardId]);

  async function loadWorktrees() {
    try {
      const worktreesList = await worktreesApi.list();

      // Filter to only valid tracker worktrees (with id field and boards array)
      const validWorktrees = worktreesList.filter(w =>
        w.id &&
        w.boards &&
        Array.isArray(w.boards) &&
        w.boards.length > 0
      );
      setWorktrees(validWorktrees);

      // If current selection is not in list, select first
      if (validWorktrees.length > 0 && !validWorktrees.find(w => w.id === selectedWorktreeId)) {
        setSelectedWorktreeId(validWorktrees[0].id);
      }
    } catch (err) {
      console.error('Failed to load worktrees:', err);
      setError('Failed to load worktrees');
    }
  }

  async function loadBoards(worktreeId: string) {
    try {
      const boardsList = await boardsApi.list(worktreeId);
      setBoards(boardsList);

      // If current selection is not in list, select first
      if (boardsList.length > 0 && !boardsList.find(b => b.id === selectedBoardId)) {
        setSelectedBoardId(boardsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
      setError('Failed to load boards');
    }
  }

  async function loadBoardData(worktreeId: string, boardId: string) {
    try {
      setLoading(true);
      setError(null);

      // Load board state
      const boardData = await boardsApi.get(worktreeId, boardId);
      setBoard(boardData);

      // Load all issues for this board
      const issuesList = await hierarchicalIssuesApi.list(worktreeId, boardId);
      const issuesMap: Record<string, Issue> = {};
      issuesList.forEach((issue) => {
        issuesMap[issue.id] = issue;
      });
      setIssues(issuesMap);
    } catch (err) {
      console.error('Failed to load board data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }

  // Handle issue creation
  async function handleCreateIssue(title: string, type: 'task' | 'bug' | 'story' | 'epic') {
    if (!selectedWorktreeId || !selectedBoardId) return;

    try {
      const newIssue = await hierarchicalIssuesApi.create(selectedWorktreeId, selectedBoardId, {
        title,
        type,
        status: 'backlog',
        priority: 'medium',
      });

      // Update local state
      setIssues((prev) => ({ ...prev, [newIssue.id]: newIssue }));

      // Reload board to update column
      await loadBoardData(selectedWorktreeId, selectedBoardId);
    } catch (err) {
      console.error('Failed to create issue:', err);
      alert('Failed to create issue');
    }
  }

  // Handle issue status change (drag-drop)
  async function handleMoveIssue(issueId: string, newStatus: string) {
    if (!selectedWorktreeId || !selectedBoardId) return;

    try {
      const updatedIssue = await hierarchicalIssuesApi.move(
        selectedWorktreeId,
        selectedBoardId,
        issueId,
        newStatus
      );

      // Update local state
      setIssues((prev) => ({ ...prev, [updatedIssue.id]: updatedIssue }));

      // Reload board
      await loadBoardData(selectedWorktreeId, selectedBoardId);
    } catch (err) {
      console.error('Failed to move issue:', err);
      alert('Failed to move issue');
    }
  }

  // Filter issues based on filter state
  function filterIssues(allIssues: Record<string, Issue>): Record<string, Issue> {
    let filtered = { ...allIssues };

    // Text search
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => {
          // Search in title and description
          const matchesText = issue.title.toLowerCase().includes(searchLower) ||
            issue.description?.toLowerCase().includes(searchLower);

          // Check for special syntax (type:, priority:, status:)
          if (searchLower.includes(':')) {
            const [key, value] = searchLower.split(':', 2);
            if (key === 'type' && value) return issue.type === value.trim();
            if (key === 'priority' && value) return issue.priority === value.trim();
            if (key === 'status' && value) return issue.status === value.trim();
          }

          return matchesText;
        })
      );
    }

    // Type filter
    if (filters.types.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => filters.types.includes(issue.type))
      );
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => filters.priorities.includes(issue.priority))
      );
    }

    // My issues filter (would need current user info)
    if (filters.showMyIssues) {
      // TODO: Filter by current user
      // For now, just show assigned issues
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => issue.assignee !== null)
      );
    }

    // Unassigned filter
    if (filters.showUnassigned) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => issue.assignee === null)
      );
    }

    return filtered;
  }

  const filteredIssues = filterIssues(issues);

  if (loading || worktrees.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Tracker</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadBoardData(selectedWorktreeId, selectedBoardId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">No board data available</p>
      </div>
    );
  }

  const currentWorktree = worktrees.find(w => w.id === selectedWorktreeId);
  const currentBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#F5F1ED' }}>
      {/* Header with Worktree Selector and Board Tabs */}
      <div className="bg-white border-b border-gray-200">
        {/* Worktree Selector */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Worktree:</label>
              <select
                value={selectedWorktreeId}
                onChange={(e) => {
                  const newWorktreeId = e.target.value;
                  setSelectedWorktreeId(newWorktreeId);
                  navigate(`/tracker/${newWorktreeId}`);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {worktrees.map((worktree) => (
                  <option key={worktree.id} value={worktree.id}>
                    {worktree.display_name} ({(worktree.boards || []).length} boards)
                  </option>
                ))}
              </select>
              {currentWorktree && (
                <span className="text-sm text-gray-500">{currentWorktree.description}</span>
              )}
            </div>
          </div>
        </div>

        {/* Board Tabs */}
        <div className="px-6">
          <div className="flex items-center space-x-1 overflow-x-auto">
            {boards.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBoardId(b.id);
                  navigate(`/tracker/${selectedWorktreeId}/${b.id}`);
                }}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  b.id === selectedBoardId
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Board Info and Actions */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentBoard?.name || 'Board'}
              </h1>
              {currentBoard?.description && (
                <p className="text-sm text-gray-600 mt-1">{currentBoard.description}</p>
              )}
              {board.sprint && (
                <p className="text-xs text-gray-500 mt-1">
                  Sprint: {board.sprint.name} ({new Date(board.sprint.start_date).toLocaleDateString()} - {new Date(board.sprint.end_date).toLocaleDateString()})
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const title = prompt('Issue title:');
                  if (title) {
                    const type = prompt('Type (task/bug/story/epic):', 'task') as any;
                    handleCreateIssue(title, type || 'task');
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm"
              >
                + New Issue
              </button>
              <button
                onClick={() => loadBoardData(selectedWorktreeId, selectedBoardId)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Filters and Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Total: <span className="font-semibold text-gray-900">{Object.keys(issues).length}</span> issues
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-purple-600">
                Epics: <span className="font-semibold">{Object.values(issues).filter(i => i.type === 'epic').length}</span>
              </span>
              <span className="text-blue-600">
                Stories: <span className="font-semibold">{Object.values(issues).filter(i => i.type === 'story').length}</span>
              </span>
              <span className="text-gray-600">
                Tasks: <span className="font-semibold">{Object.values(issues).filter(i => i.type === 'task').length}</span>
              </span>
              <span className="text-red-600">
                Bugs: <span className="font-semibold">{Object.values(issues).filter(i => i.type === 'bug').length}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xs">View:</span>
              <button className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs border border-blue-200">
                Board
              </button>
              <button className="px-3 py-1 bg-white text-gray-600 rounded-md font-medium text-xs border border-gray-200 hover:bg-gray-50">
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Board */}
      <KanbanBoard
        board={board}
        issues={filteredIssues}
        onIssueClick={(issueId) => {
          setSelectedIssue(issueId);
          navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${issueId}`);
        }}
        onIssueMove={handleMoveIssue}
      />

      {/* Issue Detail Panel */}
      {selectedIssue && issues[selectedIssue] && (
        <IssueDetailPanel
          issue={issues[selectedIssue]}
          board={board}
          onClose={() => {
            setSelectedIssue(null);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}`);
          }}
          onStatusChange={handleMoveIssue}
        />
      )}
    </div>
  );
}
