/**
 * Tracker Page - Kanban Board UI
 */

import { useState, useEffect } from 'react';
import { boardApi, issuesApi, type Issue, type Board } from '../api/tracker';

export function TrackerPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [issues, setIssues] = useState<Record<string, Issue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  // Load board and issues
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load board state
      const boardData = await boardApi.get();
      setBoard(boardData);

      // Load all issues
      const issuesList = await issuesApi.list();
      const issuesMap: Record<string, Issue> = {};
      issuesList.forEach((issue) => {
        issuesMap[issue.id] = issue;
      });
      setIssues(issuesMap);
    } catch (err) {
      console.error('Failed to load tracker data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tracker');
    } finally {
      setLoading(false);
    }
  }

  // Handle issue creation
  async function handleCreateIssue(title: string, type: 'task' | 'bug' | 'story' | 'epic') {
    try {
      const newIssue = await issuesApi.create({
        title,
        type,
        status: 'backlog',
        priority: 'medium',
      });

      // Update local state
      setIssues((prev) => ({ ...prev, [newIssue.id]: newIssue }));

      // Reload board to update column
      await loadData();
    } catch (err) {
      console.error('Failed to create issue:', err);
      alert('Failed to create issue');
    }
  }

  // Handle issue status change (drag-drop)
  async function handleMoveIssue(issueId: string, newStatus: string) {
    try {
      const updatedIssue = await issuesApi.move(issueId, newStatus);

      // Update local state
      setIssues((prev) => ({ ...prev, [updatedIssue.id]: updatedIssue }));

      // Reload board
      await loadData();
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
            onClick={loadData}
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issue Tracker</h1>
            {board.sprint && (
              <p className="text-sm text-gray-600 mt-1">
                Sprint: {board.sprint.name} ({new Date(board.sprint.start_date).toLocaleDateString()} - {new Date(board.sprint.end_date).toLocaleDateString()})
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const title = prompt('Issue title:');
                if (title) {
                  handleCreateIssue(title, 'task');
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              + New Issue
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ↻ Refresh
            </button>
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

      {/* Issue Detail Panel (Simplified) */}
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
