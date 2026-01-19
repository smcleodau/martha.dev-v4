import { useState } from 'react';

interface TemporalUIEmbedProps {
  compact?: boolean;
}

export default function TemporalUIEmbed({ compact = false }: TemporalUIEmbedProps) {
  const [iframeError, setIframeError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Temporal Cloud UI URL
  const temporalUrl = 'https://cloud.temporal.io/namespaces/martha-dev-v4.mnjo7';

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-4' : 'space-y-4'}`}>
      {!compact && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-100 mb-2">Temporal Cloud UI</h2>
              <p className="text-sm text-gray-400">
                Real-time workflow monitoring and management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
              >
                {showHelp ? 'Hide Help' : 'Show Help'}
              </button>
              <a
                href={temporalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                Open in New Tab
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {showHelp && (
            <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Quick Guide</h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  <strong>Namespace:</strong> martha-dev-v4.mnjo7
                </p>
                <p>
                  <strong>Region:</strong> ap-northeast-1 (AWS Asia Pacific)
                </p>
                <p className="mt-3 text-gray-400">
                  Use the Temporal UI to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 ml-2">
                  <li>Monitor running and completed workflows</li>
                  <li>View workflow execution history</li>
                  <li>Inspect workflow inputs and outputs</li>
                  <li>Debug workflow failures and retries</li>
                  <li>Manage workflow schedules</li>
                </ul>
              </div>
            </div>
          )}

          {/* Connection Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Namespace</div>
              <div className="font-mono text-sm text-blue-400">martha-dev-v4.mnjo7</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Endpoint</div>
              <div className="font-mono text-sm text-gray-300">ap-northeast-1.aws.api.temporal.io:7233</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-1">Web UI</div>
              <a
                href={temporalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-blue-400 hover:text-blue-300 underline truncate block"
              >
                cloud.temporal.io
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Iframe Container */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex-1 min-h-[600px]">
        {iframeError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
            <div className="text-4xl mb-2">⚠️</div>
            <div className="text-lg font-semibold text-gray-300">Unable to Load Temporal UI</div>
            <div className="text-sm text-gray-400 text-center max-w-md">
              The Temporal Cloud UI cannot be embedded due to security restrictions (X-Frame-Options).
              Please use the "Open in New Tab" button above to access the full Temporal interface.
            </div>
            <a
              href={temporalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mt-4"
            >
              Open Temporal Cloud UI
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Alternative: Use Temporal CLI</div>
              <code className="text-xs font-mono text-gray-300 block bg-gray-900 p-2 rounded">
                temporal workflow list --namespace martha-dev-v4.mnjo7
              </code>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <iframe
              src={temporalUrl}
              className="w-full h-full border-0"
              title="Temporal Cloud UI"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onError={() => setIframeError(true)}
              style={{ minHeight: compact ? '300px' : '600px' }}
            />
            {/* Loading overlay */}
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center pointer-events-none">
              <div className="text-gray-400 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Loading Temporal UI...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!compact && !iframeError && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              Connected to Temporal Cloud
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400">Live</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
