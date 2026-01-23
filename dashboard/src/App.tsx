import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import { TrackerPage } from './pages/TrackerPage';
import LogsPage from './pages/LogsPage';
import DocumentationPage from './pages/DocumentationPage';
import TrackerApiPage from './pages/TrackerApiPage';
import SettingsPage from './pages/SettingsPage';
import Dashboard from './pages/Dashboard';
import { PreferencesProvider } from './contexts/PreferencesContext';

// Create React Query client with optimized cache settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds - data is fresh for this period
      gcTime: 300000, // 5 minutes - cache time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry failed requests once
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/tracker/:worktreeId" element={<TrackerPage />} />
              <Route path="/tracker/:worktreeId/:boardId" element={<TrackerPage />} />
              <Route path="/tracker/:worktreeId/:boardId/:view" element={<TrackerPage />} />
              <Route path="/tracker/:worktreeId/:boardId/:view/:issueId" element={<TrackerPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/docs" element={<DocumentationPage />} />
              <Route path="/docs/:docId" element={<DocumentationPage />} />
              <Route path="/docs/tracker-api-explorer" element={<TrackerApiPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Layout>
        </Router>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

export default App;
