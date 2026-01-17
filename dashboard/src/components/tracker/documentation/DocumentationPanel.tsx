/**
 * DocumentationPanel Component - Manage issue documentation with linking capabilities
 */

import { useState, useEffect } from 'react';
import { type Documentation, documentationApi } from '../../../api/tracker';
import { DocumentationBrowser } from './DocumentationBrowser';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocumentationPanelProps {
  worktreeId: string;
  issueId: string;
}

export function DocumentationPanel({ worktreeId, issueId }: DocumentationPanelProps) {
  const [linkedDocs, setLinkedDocs] = useState<Documentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  useEffect(() => {
    loadLinkedDocs();
  }, [worktreeId, issueId]);

  const loadLinkedDocs = async () => {
    setLoading(true);
    try {
      const docs = await documentationApi.getForIssue(worktreeId, issueId);
      setLinkedDocs(docs);
    } catch (error) {
      console.error('Failed to load documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async (_docId: string) => {
    if (!confirm('Unlink this documentation from this issue?')) {
      return;
    }

    try {
      // To unlink, we'd need to update the doc to remove issue_id
      // or have a dedicated unlink endpoint. For now, we'll just reload
      // This is a placeholder - the actual backend might need an unlink endpoint
      console.warn('Unlink not yet implemented in backend');
      await loadLinkedDocs();
    } catch (error) {
      console.error('Failed to unlink documentation:', error);
      alert('Failed to unlink documentation');
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

  const typeLabel = {
    overview: '📄 Overview',
    technical_spec: '⚙️ Technical Spec',
    api_reference: '📚 API Reference',
    guide: '📖 Guide',
    troubleshooting: '🔧 Troubleshooting'
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Loading documentation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with link button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900">
          Linked Documentation ({linkedDocs.length})
        </h3>
        <button
          onClick={() => setShowBrowser(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          + Link Documentation
        </button>
      </div>

      {/* Linked documentation list */}
      {linkedDocs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">No documentation linked yet</p>
          <p className="text-xs text-gray-400 mt-1">Link existing docs or create new ones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedDocs.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Doc header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{typeLabel[doc.type]}</span>
                      <h4 className="font-medium text-gray-900">{doc.title}</h4>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>By {doc.metadata.author}</span>
                      <span>{formatRelativeTime(doc.metadata.created_at)}</span>
                      {doc.tags.length > 0 && (
                        <span>Tags: {doc.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {expandedDocId === doc.id ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                      onClick={() => handleUnlink(doc.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Unlink
                    </button>
                  </div>
                </div>
              </div>

              {/* Doc content (expandable) */}
              {expandedDocId === doc.id && (
                <div className="p-4">
                  <div className="prose prose-sm max-w-none">
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
                      {doc.content}
                    </ReactMarkdown>
                  </div>

                  {/* Related links */}
                  {(doc.links.related_issues.length > 0 ||
                    doc.links.related_docs.length > 0 ||
                    doc.links.external_links.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="text-xs font-semibold text-gray-700 mb-2">Related Links</h5>
                      <div className="space-y-1 text-xs">
                        {doc.links.related_issues.length > 0 && (
                          <div>
                            <span className="text-gray-600">Issues:</span>{' '}
                            {doc.links.related_issues.join(', ')}
                          </div>
                        )}
                        {doc.links.related_docs.length > 0 && (
                          <div>
                            <span className="text-gray-600">Docs:</span>{' '}
                            {doc.links.related_docs.length} linked
                          </div>
                        )}
                        {doc.links.external_links.length > 0 && (
                          <div>
                            <span className="text-gray-600">External:</span>{' '}
                            {doc.links.external_links.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 mr-2"
                              >
                                Link {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documentation browser modal */}
      {showBrowser && (
        <DocumentationBrowser
          worktreeId={worktreeId}
          issueId={issueId}
          onClose={() => setShowBrowser(false)}
          onLinked={async () => {
            await loadLinkedDocs();
            setShowBrowser(false);
          }}
        />
      )}
    </div>
  );
}
