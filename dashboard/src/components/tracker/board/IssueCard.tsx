/**
 * Issue Card Component - Individual issue card for kanban board
 */

import { type Issue } from '../../../api/tracker';
import { type DragEvent } from 'react';

interface IssueCardProps {
  issue: Issue;
  parentIssue?: Issue | null;
  onClick: () => void;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  isDragging?: boolean;
}

export function IssueCard({
  issue,
  parentIssue,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging
}: IssueCardProps) {
  return (
    <div
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group ${
        isDragging ? 'opacity-50' : ''
      }`}
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
}
