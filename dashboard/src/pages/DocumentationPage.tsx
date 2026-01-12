import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface DocItem {
  id: string;
  title: string;
  path: string;
}

const documentList: DocItem[] = [
  { id: 'plan', title: 'Migration Plan', path: '/docs/migration-plan.md' },
  { id: 'requirements', title: 'Requirements', path: '/docs/requirements.md' },
  { id: 'architecture', title: 'Architecture', path: '/docs/architecture.md' },
  { id: 'phase1', title: 'Phase 1 - Foundation', path: '/docs/phase1.md' },
  { id: 'phase2', title: 'Phase 2 - Server & WebSocket', path: '/docs/phase2.md' },
  { id: 'phase3', title: 'Phase 3 - Worktree Agent', path: '/docs/phase3.md' },
  { id: 'api', title: 'API Reference', path: '/docs/api.md' },
];

const DocumentationPage = () => {
  const { docId } = useParams<{ docId?: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDoc = docId ? documentList.find(d => d.id === docId) : null;

  useEffect(() => {
    if (currentDoc) {
      fetchDocument(currentDoc.path);
    }
  }, [currentDoc]);

  const fetchDocument = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      // In production, this would fetch from the actual file or API
      // For now, we'll show a placeholder
      setContent(`# ${currentDoc?.title}\n\nDocumentation content will be loaded from:\n\`${path}\`\n\nThis is a placeholder. The actual markdown content will be loaded dynamically.`);
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  if (!docId) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Documentation</h1>
          <p className="mt-2 text-neutral-600">
            Browse Martha's documentation and guides
          </p>
        </div>

        <div className="grid gap-4">
          {documentList.map((doc) => (
            <Link
              key={doc.id}
              to={`/docs/${doc.id}`}
              className="card hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1">{doc.path}</p>
                </div>
                <svg
                  className="w-6 h-6 text-neutral-400 group-hover:text-primary-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Current Phase Info */}
        <div className="card bg-primary-50 border-primary-200">
          <h2 className="text-xl font-semibold text-primary-900 mb-2">
            🚀 Current Phase: Phase 3
          </h2>
          <p className="text-primary-800">
            Worktree agent implementation complete. Agent is monitoring the typescript-rewrite
            worktree and streaming events to the service.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="badge badge-success">✓ Phase 1 Complete</span>
            <span className="badge badge-success">✓ Phase 2 Complete</span>
            <span className="badge badge-success">✓ Phase 3 Complete</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Link to="/docs" className="hover:text-primary-600">
          Documentation
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{currentDoc?.title}</span>
      </div>

      {/* Document Content */}
      <div className="card">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="prose prose-neutral max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-neutral-200">
        <Link
          to="/docs"
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Documentation
        </Link>
      </div>
    </div>
  );
};

export default DocumentationPage;
