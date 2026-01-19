/**
 * Issue Detail Panel Component - Single-scroll comprehensive detail panel with warm design
 * Responsive: Side panel on desktop/tablet, full-screen overlay on mobile
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
import { IssueDetailHeader } from './IssueDetailHeader';
import { QualityMetricsPanel } from './QualityMetricsPanel';
import { WorkflowProgressVisualizer } from './WorkflowProgressVisualizer';
import { LinkedImplementations } from './LinkedImplementations';
import { StoryPointsField } from './StoryPointsField';
import { EpicSelector } from './EpicSelector';
import { TimeTracking } from './TimeTracking';
import { ReleaseTracking } from './ReleaseTracking';
import { PolicyCompliance } from './PolicyCompliance';
import { DependenciesPanel } from './DependenciesPanel';
import { WatchersPanel } from './WatchersPanel';
import { EngagementPanel } from './EngagementPanel';
import { useIsMobile } from '../../../hooks/useMediaQuery';
import { useFocusTrap } from '../../../hooks/useFocusTrap';

interface IssueDetailPanelProps {
  issue: Issue;
  board: Board;
  allIssues: Record<string, Issue>;  // NEW: For parent issue lookup
  onClose: () => void;
  onStatusChange: (issueId: string, newStatus: string) => void;
}

export function IssueDetailPanel({ issue, board, allIssues, onClose, onStatusChange }: IssueDetailPanelProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(issue.description || '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Get parent issue if exists
  const parentIssue = issue.parent_id ? allIssues[issue.parent_id] : null;

  // Focus trap for accessibility
  const panelRef = useFocusTrap<HTMLDivElement>({
    enabled: true,
    onEscape: onClose,
    restoreFocus: true,
    initialFocus: true
  });

  const handleDescriptionSave = () => {
    // TODO: Call API to update issue description
    setIsEditingDescription(false);
  };

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [issue.id]);

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

  return (
    <>
      {/* Mobile: Full-screen overlay with backdrop */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel - Full screen on mobile, side panel on desktop/tablet */}
      <div
        ref={panelRef}
        className={`fixed z-50 border-l shadow-2xl overflow-hidden flex flex-col ${
          isMobile
            ? 'inset-0'
            : 'inset-y-0 right-0 w-full md:w-[900px]'
        }`}
        style={{ backgroundColor: '#F5F1ED' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="issue-detail-title"
        aria-describedby="issue-detail-description"
      >
        {/* Header with action buttons - Mobile includes back button */}
        {isMobile ? (
          <div
            className="flex items-center gap-3 px-4 py-4 border-b"
            style={{
              backgroundColor: 'white',
              borderBottomColor: '#E8E0D5',
            }}
          >
            {/* Back button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors touch-manipulation"
              style={{
                color: '#6B5D52',
                minWidth: '44px',
                minHeight: '44px',
              }}
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Issue ID and Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: '#A39686' }}>
                  {issue.id}
                </span>
                {parentIssue && (
                  <>
                    <span style={{ color: '#D4C4B0' }}>•</span>
                    <span className="text-xs" style={{ color: '#6B5D52' }}>
                      {parentIssue.id}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-base font-semibold truncate" style={{ color: '#2F241B' }}>
                {issue.title}
              </h2>
            </div>
          </div>
        ) : (
          <IssueDetailHeader
            issue={issue}
            parentIssue={parentIssue}
            onClose={onClose}
            onStatusChange={onStatusChange}
          />
        )}

        {/* Single scrolling content - Mobile responsive */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Core Details Section */}
        <div
          className="bg-white rounded-lg p-6 shadow-warm-md"
          style={{
            borderColor: '#E8E0D5',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
            Details
          </h3>

          {/* Status */}
          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Status
            </label>
            <select
              value={issue.status}
              onChange={(e) => onStatusChange(issue.id, e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral bg-white"
              style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
            >
              {board.columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Assignee
            </label>
            <div className="flex items-center gap-2">
              {issue.assignee ? (
                <>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #D97F6F 0%, #E0B666 100%)'
                    }}
                  >
                    {issue.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium" style={{ color: '#2F241B' }}>
                    {issue.assignee.name}
                  </span>
                </>
              ) : (
                <span className="text-sm" style={{ color: '#A39686' }}>
                  Unassigned
                </span>
              )}
              <button
                className="ml-auto text-sm font-medium"
                style={{ color: '#D97F6F' }}
              >
                Change
              </button>
            </div>
          </div>

          {/* Story Points */}
          <StoryPointsField
            issue={issue}
            worktreeId={issue.worktree_id}
            boardId={issue.board_id}
          />

          {/* Priority */}
          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Priority
            </label>
            <select
              value={issue.priority}
              onChange={async (e) => {
                try {
                  await hierarchicalIssuesApi.update(
                    issue.worktree_id,
                    issue.board_id,
                    issue.id,
                    { priority: e.target.value as Issue['priority'] }
                  );
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to update priority:', err);
                  alert('Failed to update priority');
                }
              }}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral bg-white"
              style={{ borderColor: '#E8E0D5', color: '#2F241B' }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Epic */}
          <EpicSelector
            issue={issue}
            worktreeId={issue.worktree_id}
            boardId={issue.board_id}
          />

          {/* Description */}
          <div className="mb-4">
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Description
            </label>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus-coral font-mono text-sm"
                  style={{ borderColor: '#D97F6F', color: '#2F241B' }}
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDescriptionSave}
                    className="px-4 py-2 rounded-md text-white text-sm font-medium"
                    style={{ backgroundColor: '#D97F6F' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingDescription(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{ backgroundColor: '#F5F1EC', color: '#6B5D52' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="min-h-[100px] p-3 border rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor: '#E8E0D5',
                  backgroundColor: 'white'
                }}
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
                          if (href && href.startsWith('/tracker/')) {
                            return (
                              <a
                                href={href}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(href);
                                }}
                                className="hover:underline cursor-pointer"
                                style={{ color: '#6B9BD1' }}
                                {...rest}
                              />
                            );
                          }
                          return <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} {...rest} />;
                        },
                      }}
                    >
                      {issue.description}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: '#A39686' }}>
                    Click to add description
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          <div>
            <label className="text-sm font-semibold block mb-2" style={{ color: '#6B5D52' }}>
              Labels
            </label>
            <div className="flex flex-wrap gap-2">
              {issue.labels && issue.labels.length > 0 ? (
                issue.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-md text-sm font-medium"
                    style={{
                      backgroundColor: '#F5F1EC',
                      color: '#6B5D52'
                    }}
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-sm" style={{ color: '#A39686' }}>
                  No labels
                </span>
              )}
              <button
                className="px-3 py-1 border border-dashed rounded-md text-sm font-medium"
                style={{
                  borderColor: '#E8E0D5',
                  color: '#6B5D52'
                }}
              >
                + Add label
              </button>
            </div>
          </div>
        </div>

        {/* Quality Metrics Panel */}
        <QualityMetricsPanel issue={issue} />

        {/* Release Tracking - Conditional rendering based on release_id */}
        <ReleaseTracking issue={issue} />

        {/* Policy Compliance */}
        <PolicyCompliance issue={issue} />

        {/* Workflow Progress */}
        <WorkflowProgressVisualizer issue={issue} />

        {/* Acceptance Criteria */}
        {issue.quality?.checklist && issue.quality.checklist.length > 0 && (
          <div
            className="bg-white rounded-lg p-6 shadow-warm-md"
            style={{
              borderColor: '#E8E0D5',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
              Acceptance Criteria
            </h3>
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
                          window.location.reload();
                        } catch (err) {
                          console.error('Failed to update checklist:', err);
                          alert('Failed to update checklist');
                        }
                      }}
                      className="mt-1 rounded focus-coral"
                      style={{
                        borderColor: '#E8E0D5',
                        color: '#D97F6F'
                      }}
                    />
                    <span className="text-sm group-hover:font-medium" style={{ color: '#6B5D52' }}>
                      {itemText}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 text-xs font-medium" style={{ color: '#A39686' }}>
              {(issue.quality.checklist || []).filter(i => i.startsWith('[x]') || i.startsWith('[X]')).length} / {(issue.quality.checklist || []).length} completed
            </div>
          </div>
        )}

        {/* Time Tracking */}
        <TimeTracking
          issue={issue}
          worktreeId={issue.worktree_id}
          boardId={issue.board_id}
        />

        {/* Dependencies Panel */}
        <DependenciesPanel
          issue={issue}
          worktreeId={issue.worktree_id}
          boardId={issue.board_id}
          allIssues={allIssues}
        />

        {/* Watchers Panel */}
        <WatchersPanel
          issue={issue}
          worktreeId={issue.worktree_id}
          boardId={issue.board_id}
          currentUser={{
            id: 'user-1',
            name: 'Stuart Chen',
            avatar: ''
          }}
        />

        {/* Activity Timeline */}
        <div
          className="bg-white rounded-lg p-6 shadow-warm-md"
          style={{
            borderColor: '#E8E0D5',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
            Activity
          </h3>
          <ActivityTimeline
            worktreeId={issue.worktree_id}
            issueId={issue.id}
          />
        </div>

        {/* Comments */}
        <div
          className="bg-white rounded-lg p-6 shadow-warm-md"
          style={{
            borderColor: '#E8E0D5',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
            Comments
          </h3>

          {/* Add new comment section */}
          <div className="mb-6">
            <CommentForm
              onSubmit={handleAddComment}
              placeholder="Share your thoughts... (Markdown supported)"
              submitLabel="Add Comment"
            />
          </div>

          {/* Comments list section */}
          <div>
            <div className="text-sm font-medium mb-3" style={{ color: '#6B5D52' }}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </div>
            {commentsLoading ? (
              <div className="text-center py-8" style={{ color: '#A39686' }}>
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

        {/* Linked Implementations */}
        <LinkedImplementations issue={issue} />

        {/* Engagement Analytics */}
        <EngagementPanel
          worktreeId={issue.worktree_id}
          boardId={issue.board_id}
          issueId={issue.id}
        />

        {/* Documentation */}
        {issue.documentation && (
          <div
            className="bg-white rounded-lg p-6 shadow-warm-md"
            style={{
              borderColor: '#E8E0D5',
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
              Documentation
            </h3>
            <DocumentationPanel
              worktreeId={issue.worktree_id}
              issueId={issue.id}
            />
          </div>
        )}

        {/* Metadata */}
        <div
          className="bg-white rounded-lg p-6 shadow-warm-md"
          style={{
            borderColor: '#E8E0D5',
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
            Metadata
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                Created
              </label>
              <p style={{ color: '#2F241B' }}>
                {new Date(issue.metadata?.created_at || (issue as any).created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                Updated
              </label>
              <p style={{ color: '#2F241B' }}>
                {new Date(issue.metadata?.updated_at || (issue as any).updated_at).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                Board
              </label>
              <p style={{ color: '#2F241B' }}>{issue.board_id}</p>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: '#A39686' }}>
                Worktree
              </label>
              <p style={{ color: '#2F241B' }}>{issue.worktree_id}</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
