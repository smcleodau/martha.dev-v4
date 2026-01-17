/**
 * DocumentationBrowser Component - Modal for browsing and linking documentation
 */

import { useState, useEffect } from 'react';
import { type Documentation, documentationApi } from '../../../api/tracker';

interface DocumentationBrowserProps {
  worktreeId: string;
  issueId: string;
  onClose: () => void;
  onLinked: () => void;
}

export function DocumentationBrowser({
  worktreeId,
  issueId,
  onClose,
  onLinked
}: DocumentationBrowserProps) {
  const [allDocs, setAllDocs] = useState<Documentation[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Documentation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    loadDocumentation();
  }, [worktreeId]);

  useEffect(() => {
    filterDocumentation();
  }, [searchQuery, selectedType, allDocs]);

  const loadDocumentation = async () => {
    setLoading(true);
    try {
      const docs = await documentationApi.list(worktreeId);
      setAllDocs(docs);
    } catch (error) {
      console.error('Failed to load documentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocumentation = () => {
    let filtered = allDocs;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(doc => doc.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.title.toLowerCase().includes(query) ||
          doc.content.toLowerCase().includes(query) ||
          doc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredDocs(filtered);
  };

  const handleLink = async (docId: string) => {
    setLinking(docId);
    try {
      await documentationApi.linkToIssue(worktreeId, docId, issueId);
      onLinked();
    } catch (error) {
      console.error('Failed to link documentation:', error);
      alert('Failed to link documentation. Please try again.');
      setLinking(null);
    }
  };

  const handleCreateNew = async () => {
    const title = prompt('Enter documentation title:');
    if (!title) return;

    const content = prompt('Enter documentation content (Markdown supported):');
    if (!content) return;

    try {
      await documentationApi.createForIssue(worktreeId, issueId, {
        type: 'guide',
        title,
        content,
        author: 'Current User',
        tags: []
      });
      onLinked();
    } catch (error) {
      console.error('Failed to create documentation:', error);
      alert('Failed to create documentation. Please try again.');
    }
  };

  const typeLabel = {
    overview: '📄 Overview',
    technical_spec: '⚙️ Technical Spec',
    api_reference: '📚 API Reference',
    guide: '📖 Guide',
    troubleshooting: '🔧 Troubleshooting'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Link Documentation</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={linking !== null}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and filters */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="overview">Overview</option>
              <option value="technical_spec">Technical Spec</option>
              <option value="api_reference">API Reference</option>
              <option value="guide">Guide</option>
              <option value="troubleshooting">Troubleshooting</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Loading documentation...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No documentation found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? 'Try adjusting your search' : 'Create new documentation to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{typeLabel[doc.type]}</span>
                        <h4 className="font-medium text-gray-900">{doc.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {doc.content.substring(0, 150)}...
                      </p>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>By {doc.metadata.author}</span>
                        {doc.tags.length > 0 && (
                          <span>
                            Tags: {doc.tags.slice(0, 3).join(', ')}
                            {doc.tags.length > 3 && ` +${doc.tags.length - 3}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLink(doc.id)}
                      disabled={linking !== null || doc.issue_id === issueId}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {linking === doc.id ? 'Linking...' : doc.issue_id === issueId ? 'Linked' : 'Link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={linking !== null}
          >
            + Create New Documentation
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              disabled={linking !== null}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
