import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DocItem {
  id: string;
  title: string;
  description: string;
  category: 'start' | 'reference' | 'technical';
  emoji: string;
}

const documentList: DocItem[] = [
  // START HERE - Most important
  {
    id: 'readme',
    title: 'Start Here',
    description: "What is Martha? Does it take over everything? (Spoiler: No.)",
    category: 'start',
    emoji: '👋'
  },
  {
    id: 'capabilities',
    title: 'What Can Martha Do?',
    description: "Complete list of features - worktrees, monitoring, logs, etc.",
    category: 'start',
    emoji: '🎯'
  },

  // REFERENCE - When you need specifics
  {
    id: 'api',
    title: 'API Reference',
    description: "REST endpoints, WebSocket events, curl examples",
    category: 'reference',
    emoji: '📡'
  },
  {
    id: 'installation',
    title: 'Installation',
    description: "How to set up Martha (database, Redis, env vars)",
    category: 'reference',
    emoji: '⚙️'
  },

  // TECHNICAL - Deep dives
  {
    id: 'architecture',
    title: 'System Architecture',
    description: "How Martha works under the hood",
    category: 'technical',
    emoji: '🏗️'
  },
  {
    id: 'port_allocation',
    title: 'Port Strategy',
    description: "How ports are allocated across worktrees",
    category: 'technical',
    emoji: '🔌'
  },
  {
    id: 'branching_strategy',
    title: 'Git Workflow',
    description: "Branch strategy and PR process",
    category: 'technical',
    emoji: '🌿'
  },
];

const DocumentationPage = () => {
  const { docId } = useParams<{ docId?: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDoc = docId ? documentList.find(d => d.id === docId) : null;

  useEffect(() => {
    if (currentDoc) {
      fetchDocument(currentDoc.id);
    }
  }, [currentDoc]);

  const fetchDocument = async (docId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/docs/${docId}`);
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`);
      }
      const data = await response.json();
      setContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  // Group docs by category
  const docsByCategory = {
    start: documentList.filter(d => d.category === 'start'),
    reference: documentList.filter(d => d.category === 'reference'),
    technical: documentList.filter(d => d.category === 'technical'),
  };

  if (!docId) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Martha Documentation</h1>
          <p className="mt-2 text-neutral-600">
            Everything you need to know about managing parallel development with Martha
          </p>
        </div>

        {/* Quick Start Card */}
        <div className="bg-gradient-to-r from-primary-50 to-accent-50 border-2 border-primary-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🚀</div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                New to Martha?
              </h3>
              <p className="text-neutral-700 mb-3">
                Martha is a background service that helps you manage multiple git worktrees.
                It doesn't take over your terminal or commands - you're always in control.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/docs/readme"
                  className="btn btn-primary"
                >
                  Read the Overview
                </Link>
                <a
                  href="/"
                  className="btn btn-secondary"
                >
                  View Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Start Here Section */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Start Here</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {docsByCategory.start.map((doc) => (
              <Link
                key={doc.id}
                to={`/docs/${doc.id}`}
                className="card hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{doc.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">{doc.description}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors flex-shrink-0"
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
        </div>

        {/* Reference Section */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Reference</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {docsByCategory.reference.map((doc) => (
              <Link
                key={doc.id}
                to={`/docs/${doc.id}`}
                className="card hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{doc.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">{doc.description}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors flex-shrink-0"
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
        </div>

        {/* Technical Section */}
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-4">Technical Deep Dives</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {docsByCategory.technical.map((doc) => (
              <Link
                key={doc.id}
                to={`/docs/${doc.id}`}
                className="card hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{doc.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">{doc.description}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400 group-hover:text-primary-600 transition-colors flex-shrink-0"
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
            <ReactMarkdown
              components={{
                // Syntax highlighting for code blocks
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
                // Make links open in new tab
                a(props: any) {
                  const { node, ...rest } = props;
                  return <a {...rest} target="_blank" rel="noopener noreferrer" />;
                },
              }}
            >
              {content}
            </ReactMarkdown>
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
