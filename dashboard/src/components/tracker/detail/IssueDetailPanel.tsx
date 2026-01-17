/**
 * Issue Detail Panel Component - Comprehensive issue detail and edit panel
 */

import { type Issue, type Board, type Comment, hierarchicalIssuesApi, commentsApi } from '../../../api/tracker';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CommentForm } from '../comments/CommentForm';
import { CommentsList } from '../comments/CommentsList';
import { DocumentationPanel } from '../documentation/DocumentationPanel';
import { ActivityTimeline } from '../activity/ActivityTimeline';

interface IssueDetailPanelProps {
  issue: Issue;
  board: Board;
  onClose: () => void;
  onStatusChange: (issueId: string, newStatus: string) => void;
}

type TabType = 'details' | 'activity' | 'comments' | 'documentation';

export function IssueDetailPanel({ issue, board, onClose, onStatusChange }: IssueDetailPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(issue.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(issue.description || '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const handleTitleSave = () => {
    // TODO: Call API to update issue title
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    // TODO: Call API to update issue description
    setIsEditingDescription(false);
  };

  // Load comments when comments tab becomes active
  useEffect(() => {
    if (activeTab === 'comments' && !commentsLoading && comments.length === 0) {
      loadComments();
    }
  }, [activeTab]);

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const fetchedComments = await commentsApi.list(issue.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async (content: string) => {
    await commentsApi.create(issue.id, content, {
      id: 'current-user',
      name: 'Current User',
      avatar: ''
    });
    await loadComments();
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    await commentsApi.update(commentId, issue.id, content);
    await loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await commentsApi.delete(commentId, issue.id);
    await loadComments();
  };

  const typeColor = {
    epic: 'bg-purple-50 text-purple-700 border-purple-200',
    story: 'bg-blue-50 text-blue-700 border-blue-200',
    task: 'bg-gray-50 text-gray-700 border-gray-200',
    bug: 'bg-red-50 text-red-700 border-red-200'
  }[issue.type];

  const priorityColor = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-600'
  }[issue.priority];

  return (
    <div className="fixed inset-y-0 right-0 w-[800px] bg-white border-l border-gray-200 shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500 font-semibold">{issue.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeColor}`}>
              {issue.type}
            </span>
            <span className={`text-xs px-2 py-1 rounded-md font-semibold ${priorityColor}`}>
              {issue.priority}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        {isEditingTitle ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="flex-1 text-xl font-bold text-gray-900 px-2 py-1 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleTitleSave}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
            >
              Save
            </button>
          </div>
        ) : (
          <h2
            onClick={() => setIsEditingTitle(true)}
            className="text-xl font-bold text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors"
          >
            {issue.title}
          </h2>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {(['details', 'activity', 'comments', 'documentation'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-500 bg-white'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            {/* Status */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Status</label>
              <select
                value={issue.status}
                onChange={(e) => onStatusChange(issue.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {board.columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Assignee</label>
              <div className="flex items-center gap-2">
                {issue.assignee ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                      {issue.assignee.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{issue.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Unassigned</span>
                )}
                <button className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Change
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Description</label>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDescriptionSave}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="min-h-[100px] p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {issue.description ? (
                    <div className="prose prose-sm max-w-none" onClick={(e) => e.stopPropagation()}>
                      <ReactMarkdown
                        components={{
                          code(props: any) {
                            const { node, inline, className, children, ...rest } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...rest}>
                                {children}
                              </code>
                            );
                          },
                          a(props: any) {
                            const { node, href, ...rest } = props;
                            // Handle internal tracker links
                            if (href && href.startsWith('/tracker/')) {
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigate(href);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 underline cursor-pointer"
                                  {...rest}
                                />
                              );
                            }
                            // External links
                            return <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...rest} />;
                          },
                        }}
                      >
                        {issue.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Click to add description</p>
                  )}
                </div>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Labels</label>
              <div className="flex flex-wrap gap-2">
                {issue.labels && issue.labels.length > 0 ? (
                  issue.labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No labels</span>
                )}
                <button className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 rounded-md text-sm font-medium hover:bg-gray-50">
                  + Add label
                </button>
              </div>
            </div>

            {/* Quality Checklist */}
            {issue.quality?.checklist && issue.quality.checklist.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Acceptance Criteria</h3>
                <div className="space-y-2">
                  {issue.quality.checklist.map((item, index) => {
                    const isChecked = item.startsWith('[x]') || item.startsWith('[X]');
                    const itemText = item.replace(/^\[[ xX]\] /, '');

                    return (
                      <label key={index} className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={async (e) => {
                            // Update checklist item
                            const updatedChecklist = [...issue.quality.checklist];
                            updatedChecklist[index] = e.target.checked
                              ? `[x] ${itemText}`
                              : `[ ] ${itemText}`;

                            try {
                              await hierarchicalIssuesApi.update(
                                issue.worktree_id,
                                issue.board_id,
                                issue.id,
                                {
                                  quality: {
                                    ...issue.quality,
                                    checklist: updatedChecklist
                                  }
                                }
                              );
                              // Reload issue to update UI
                              window.location.reload();
                            } catch (err) {
                              console.error('Failed to update checklist:', err);
                              alert('Failed to update checklist');
                            }
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          {itemText}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {issue.quality.checklist.filter(i => i.startsWith('[x]') || i.startsWith('[X]')).length} / {issue.quality.checklist.length} completed
                </div>
              </div>
            )}

            {/* Links */}
            {issue.links && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">Links</label>
                <div className="space-y-2">
                  {issue.links.pr && (
                    <a
                      href={issue.links.pr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633z" clipRule="evenodd"/>
                      </svg>
                      Pull Request
                    </a>
                  )}
                  {issue.links.related_issues && issue.links.related_issues.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Related issues:</span>
                      <div className="flex flex-wrap gap-2">
                        {issue.links.related_issues.map((relatedId) => (
                          <button
                            key={relatedId}
                            onClick={() => {
                              navigate(`/tracker/${issue.worktree_id}/${issue.board_id}/${relatedId}`);
                            }}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 hover:text-gray-900 transition-colors"
                          >
                            {relatedId}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {issue.links.external && issue.links.external.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">External links:</span>
                      <div className="space-y-1">
                        {issue.links.external.map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {url.includes('github.com') ? 'View on GitHub' : new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Created</label>
                  <p className="text-gray-900">
                    {new Date(issue.metadata?.created_at || (issue as any).created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Updated</label>
                  <p className="text-gray-900">
                    {new Date(issue.metadata?.updated_at || (issue as any).updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Board</label>
                  <p className="text-gray-900">{issue.board_id}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Worktree</label>
                  <p className="text-gray-900">{issue.worktree_id}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="p-6">
            <ActivityTimeline
              worktreeId={issue.worktree_id}
              issueId={issue.id}
            />
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="p-6 space-y-6">
            {/* Add new comment section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Comment</h3>
              <CommentForm
                onSubmit={handleAddComment}
                placeholder="Share your thoughts... (Markdown supported)"
                submitLabel="Add Comment"
              />
            </div>

            {/* Comments list section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Comments ({comments.length})
              </h3>
              {commentsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Loading comments...</p>
                </div>
              ) : (
                <CommentsList
                  comments={comments}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'documentation' && (
          <div className="p-6">
            <DocumentationPanel
              worktreeId={issue.worktree_id}
              issueId={issue.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
