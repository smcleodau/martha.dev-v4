import { useState } from 'react';
import TelemetryExplorer from '../components/dashboard/TelemetryExplorer';
import AgentPerformanceMetrics from '../components/dashboard/AgentPerformanceMetrics';
import ExceptionDashboard from '../components/dashboard/ExceptionDashboard';
import WorkflowVisualization from '../components/dashboard/WorkflowVisualization';
import LearningInsights from '../components/dashboard/LearningInsights';
import TemporalUIEmbed from '../components/dashboard/TemporalUIEmbed';

type DashboardView = 'overview' | 'telemetry' | 'performance' | 'exceptions' | 'workflows' | 'learning' | 'temporal';

export default function Dashboard() {
  const [activeView, setActiveView] = useState<DashboardView>('overview');

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Unified Dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Martha.dev v4 - Monitoring, Telemetry & Analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-400 font-medium">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="container mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'telemetry', label: 'Telemetry', icon: '📡' },
              { id: 'performance', label: 'Performance', icon: '⚡' },
              { id: 'exceptions', label: 'Exceptions', icon: '⚠️' },
              { id: 'workflows', label: 'Workflows', icon: '🔄' },
              { id: 'learning', label: 'Learning', icon: '🧠' },
              { id: 'temporal', label: 'Temporal UI', icon: '⏱️' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as DashboardView)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2
                  ${
                    activeView === view.id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }
                `}
              >
                <span>{view.icon}</span>
                <span className="whitespace-nowrap">{view.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {activeView === 'overview' && <DashboardOverview />}
        {activeView === 'telemetry' && <TelemetryExplorer />}
        {activeView === 'performance' && <AgentPerformanceMetrics />}
        {activeView === 'exceptions' && <ExceptionDashboard />}
        {activeView === 'workflows' && <WorkflowVisualization />}
        {activeView === 'learning' && <LearningInsights />}
        {activeView === 'temporal' && <TemporalUIEmbed />}
      </main>
    </div>
  );
}

// Overview component that shows all views in a grid
function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Workflows"
          value="12"
          change="+3"
          icon="🔄"
          trend="up"
        />
        <StatCard
          title="Events/min"
          value="847"
          change="+12%"
          icon="📡"
          trend="up"
        />
        <StatCard
          title="Active Exceptions"
          value="3"
          change="-2"
          icon="⚠️"
          trend="down"
        />
        <StatCard
          title="Learning Models"
          value="5"
          change="0"
          icon="🧠"
          trend="neutral"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telemetry Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Recent Telemetry</h3>
            <span className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">View All →</span>
          </div>
          <div className="h-64">
            <TelemetryExplorer compact />
          </div>
        </div>

        {/* Performance Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Agent Performance</h3>
            <span className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">View All →</span>
          </div>
          <div className="h-64">
            <AgentPerformanceMetrics compact />
          </div>
        </div>

        {/* Exceptions Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Active Exceptions</h3>
            <span className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">View All →</span>
          </div>
          <div className="h-64">
            <ExceptionDashboard compact />
          </div>
        </div>

        {/* Workflows Preview */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-100">Active Workflows</h3>
            <span className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">View All →</span>
          </div>
          <div className="h-64">
            <WorkflowVisualization compact />
          </div>
        </div>
      </div>

      {/* Full Width Learning Insights */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Learning Insights</h3>
          <span className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">View All →</span>
        </div>
        <div className="h-80">
          <LearningInsights compact />
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        <span className={`text-sm font-medium ${trendColors[trend]}`}>
          {change}
        </span>
      </div>
      <div className="text-3xl font-bold text-gray-100 mb-1">{value}</div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}
