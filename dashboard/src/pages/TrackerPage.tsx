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

      // Filter to only valid tracker worktrees (with id field)
      const validWorktrees = worktreesList.filter(w => w.id && w.boards);
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

      {/* Board */}
      <div className="flex-1 overflow-x-auto" style={{ backgroundColor: '#F5F1ED' }}>
        <div className="flex h-full p-6 space-x-4">
          {board.columns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-80 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col"
            >
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shadow-sm"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-bold text-gray-800 text-sm">{column.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                      {column.issue_ids.length}
                    </span>
                    {column.wip_limit && column.issue_ids.length > column.wip_limit && (
                      <span className="text-xs text-red-600 font-semibold">⚠</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {column.issue_ids.map((issueId) => {
                  const issue = issues[issueId];
                  if (!issue) return null;

                  const parentIssue = issue.parent_id ? issues[issue.parent_id] : null;

                  return (
                    <div
                      key={issueId}
                      onClick={() => {
                        setSelectedIssue(issueId);
                        navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${issueId}`);
                      }}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
                    >
                      {/* Parent Issue Badge */}
                      {parentIssue && (
                        <div className="mb-2 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                          </svg>
                          <span className="text-xs text-purple-600 font-medium truncate">
                            {parentIssue.title}
                          </span>
                        </div>
                      )}

                      {/* Issue Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 font-semibold">{issue.id}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              issue.type === 'bug'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : issue.type === 'epic'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : issue.type === 'story'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            {issue.type}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-md font-semibold ${
                            issue.priority === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : issue.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : issue.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {issue.priority}
                        </span>
                      </div>

                      {/* Issue Title */}
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-gray-700">
                        {issue.title}
                      </h4>

                      {/* Labels */}
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {issue.labels.slice(0, 3).map((label, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium"
                            >
                              {label}
                            </span>
                          ))}
                          {issue.labels.length > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                              +{issue.labels.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        {/* Assignee */}
                        {issue.assignee && issue.assignee.name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                              {issue.assignee.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{issue.assignee.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                              </svg>
                            </div>
                            <span className="text-xs text-gray-400">Unassigned</span>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {issue.links?.pr && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                              </svg>
                              PR
                            </span>
                          )}
                        </div>
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
                onClick={() => {
                  setSelectedIssue(null);
                  navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}`);
                }}
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
