import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import { TrackerPage } from './pages/TrackerPage';
import LogsPage from './pages/LogsPage';
import DocumentationPage from './pages/DocumentationPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/docs/:docId" element={<DocumentationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
