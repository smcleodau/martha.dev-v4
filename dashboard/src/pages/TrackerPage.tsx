/**
 * Tracker Page - Multi-Board Kanban UI
 */

import { useState, useEffect } from 'react';
import {
  boardsApi,
  worktreesApi,
  hierarchicalIssuesApi,
  type Issue,
  type Board,
  type WorktreeConfig,
} from '../api/tracker';

export function TrackerPage() {
  // Multi-board state
  const [worktrees, setWorktrees] = useState<WorktreeConfig[]>([]);
  const [selectedWorktreeId, setSelectedWorktreeId] = useState<string>('martha-dev-v4');
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('temporal-foundation');

  // Current board data
  const [board, setBoard] = useState<Board | null>(null);
  const [issues, setIssues] = useState<Record<string, Issue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  // Load worktrees on mount
  useEffect(() => {
    loadWorktrees();
  }, []);

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
      setWorktrees(worktreesList);

      // If current selection is not in list, select first
      if (worktreesList.length > 0 && !worktreesList.find(w => w.id === selectedWorktreeId)) {
        setSelectedWorktreeId(worktreesList[0].id);
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

  if (loading) {
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Worktree Selector and Board Tabs */}
      <div className="bg-white border-b border-gray-200">
        {/* Worktree Selector */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Worktree:</label>
              <select
                value={selectedWorktreeId}
                onChange={(e) => setSelectedWorktreeId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {worktrees.map((worktree) => (
                  <option key={worktree.id} value={worktree.id}>
                    {worktree.display_name} ({worktree.boards.length} boards)
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
                onClick={() => setSelectedBoardId(b.id)}
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
          <div className="flex items-center justify-between">
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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                + New Issue
              </button>
              <button
                onClick={() => loadBoardData(selectedWorktreeId, selectedBoardId)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full p-6 space-x-4">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 bg-white rounded-lg border border-gray-200 flex flex-col"
            >
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-semibold text-gray-900">{column.name}</h3>
                    <span className="text-sm text-gray-500">
                      {column.issue_ids.length}
                      {column.wip_limit && ` / ${column.wip_limit}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {column.issue_ids.map((issueId) => {
                  const issue = issues[issueId];
                  if (!issue) return null;

                  return (
                    <div
                      key={issueId}
                      onClick={() => setSelectedIssue(issueId)}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-mono text-gray-500">{issue.id}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            issue.type === 'bug'
                              ? 'bg-red-100 text-red-700'
                              : issue.type === 'epic'
                              ? 'bg-purple-100 text-purple-700'
                              : issue.type === 'story'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {issue.type}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">{issue.title}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            issue.priority === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : issue.priority === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : issue.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {issue.priority}
                        </span>
                        {issue.assignee && issue.assignee.name && (
                          <span className="flex items-center space-x-1">
                            <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                              {issue.assignee.name.charAt(0)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issue Detail Panel */}
      {selectedIssue && issues[selectedIssue] && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{issues[selectedIssue].title}</h2>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">ID</label>
                <p className="text-sm text-gray-900">{issues[selectedIssue].id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900">{issues[selectedIssue].type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <select
                  value={issues[selectedIssue].status}
                  onChange={(e) => handleMoveIssue(selectedIssue, e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {board.columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <p className="text-sm text-gray-900">{issues[selectedIssue].priority}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Board</label>
                <p className="text-sm text-gray-600">{issues[selectedIssue].board_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Worktree</label>
                <p className="text-sm text-gray-600">{issues[selectedIssue].worktree_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {issues[selectedIssue].description || 'No description'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-sm text-gray-600">
                  {new Date(
                    issues[selectedIssue].metadata?.created_at ||
                    (issues[selectedIssue] as any).created_at
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Updated</label>
                <p className="text-sm text-gray-600">
                  {new Date(
                    issues[selectedIssue].metadata?.updated_at ||
                    (issues[selectedIssue] as any).updated_at
                  ).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
