/**
 * CommentsList Component - Display list of comments with inline edit/delete
 */

import { useState } from 'react';
import { type Comment } from '../../../api/tracker';
import { CommentForm } from './CommentForm';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CommentsListProps {
  comments: Comment[];
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentsList({ comments, onUpdate, onDelete }: CommentsListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleUpdate = async (commentId: string, content: string) => {
    await onUpdate(commentId, content);
    setEditingId(null);
  };

  const handleDelete = async (commentId: string, authorName: string) => {
    if (confirm(`Delete comment by ${authorName}?`)) {
      await onDelete(commentId);
    }
  };

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-sm">No comments yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
          {/* Comment header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                {comment.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-gray-900 text-sm">
                  {comment.author.name}
                </span>
                <span
                  className="text-xs text-gray-500 ml-2"
                  title={new Date(comment.created_at).toLocaleString()}
                >
                  {formatRelativeTime(comment.created_at)}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-gray-400 ml-1">(edited)</span>
                )}
              </div>
            </div>

            {/* Actions */}
            {editingId !== comment.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(comment.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(comment.id, comment.author.name)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Comment content */}
          {editingId === comment.id ? (
            <CommentForm
              initialContent={comment.content}
              onSubmit={(content) => handleUpdate(comment.id, content)}
              onCancel={() => setEditingId(null)}
              placeholder="Update your comment..."
              submitLabel="Update Comment"
            />
          ) : (
            <div className="prose prose-sm max-w-none pl-10">
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
                }}
              >
                {comment.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
