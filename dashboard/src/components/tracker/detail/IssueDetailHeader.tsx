/**
 * Issue Detail Header Component - Header with title, badges, and action buttons
 */

import { type Issue } from '../../../api/tracker';

interface IssueDetailHeaderProps {
  issue: Issue;
  parentIssue?: Issue | null;
  onClose: () => void;
  onStatusChange: (issueId: string, newStatus: string) => void;
}

export function IssueDetailHeader({ issue, parentIssue, onClose }: IssueDetailHeaderProps) {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    // TODO: Show toast notification
  };

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
      className="px-6 py-4 border-b"
      style={{
        backgroundColor: 'white',
        borderBottomColor: '#E8E0D5'
      }}
    >
      {/* Parent breadcrumb if exists */}
      {parentIssue && (
        <div className="mb-2 flex items-center gap-1.5">
          <svg className="w-3 h-3" style={{ color: '#8B7AA8' }} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
          </svg>
          <span className="text-sm font-medium" style={{ color: '#8B7AA8' }}>
            {parentIssue.title}
          </span>
        </div>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono font-semibold" style={{ color: '#A39686' }}>
              {issue.id}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: typeStyle.bg,
                color: typeStyle.text,
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: typeStyle.border
              }}
            >
              {issue.type}
            </span>
            <span
              className="text-xs px-2 py-1 rounded-md font-semibold"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.text
              }}
            >
              {issue.priority}
            </span>
            <span
              className="text-xs px-2 py-1 rounded-md font-medium"
              style={{
                backgroundColor: '#F5F1EC',
                color: '#6B5D52'
              }}
            >
              {issue.status}
            </span>
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#2F241B' }}>
            {issue.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: '#6B5D52' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-lg border text-sm font-medium hover:shadow-md transition-all"
          style={{
            borderColor: '#E8E0D5',
            color: '#2F241B',
            backgroundColor: 'white'
          }}
        >
          <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Log Time
        </button>
        <button
          className="px-3 py-2 rounded-lg border text-sm font-medium hover:shadow-md transition-all"
          style={{
            borderColor: '#E8E0D5',
            color: '#2F241B',
            backgroundColor: 'white'
          }}
        >
          <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Story
        </button>
        <button
          onClick={handleShare}
          className="px-3 py-2 rounded-lg border text-sm font-medium hover:shadow-md transition-all"
          style={{
            borderColor: '#E8E0D5',
            color: '#2F241B',
            backgroundColor: 'white'
          }}
        >
          <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      </div>
    </div>
  );
}
