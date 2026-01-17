/**
 * CommentForm Component - Form for adding or editing comments with markdown support
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CommentFormProps {
  initialContent?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
}

export function CommentForm({
  initialContent = '',
  onSubmit,
  onCancel,
  placeholder = 'Write a comment... (Markdown supported)',
  submitLabel = 'Add Comment'
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      if (!initialContent) {
        // Reset form only for new comments, not edits
        setContent('');
        setShowPreview(false);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('Failed to save comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      setContent('');
      setShowPreview(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Toggle bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          Markdown supported (code blocks, **bold**, *italic*, etc.)
        </span>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          disabled={!content.trim()}
        >
          {showPreview ? '✏️ Edit' : '👁️ Preview'}
        </button>
      </div>

      {/* Content area */}
      {showPreview ? (
        <div className="prose prose-sm max-w-none border rounded-lg p-3 bg-gray-50 min-h-[100px]">
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
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] resize-y font-mono text-sm"
          placeholder={placeholder}
          disabled={isSubmitting}
        />
      )}

      {/* Action bar */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">
          {content.length} characters
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
