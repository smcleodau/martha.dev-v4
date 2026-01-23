/**
 * Workflow Progress Visualizer Component - Shows workflow stages and progress
 */

import { type Issue } from '../../../api/tracker';

interface WorkflowProgressVisualizerProps {
  issue: Issue;
}

function getCurrentStageIndex(issue: Issue): number {
  const status = issue.status.toLowerCase();
  if (status === 'todo' || status === 'backlog') return 0;
  if (status === 'in progress' || status === 'in_progress') return 1;
  if (status === 'testing' || status === 'review') return 2;
  if (status === 'done' || status === 'completed') return 3;
  return 0;
}

export function WorkflowProgressVisualizer({ issue }: WorkflowProgressVisualizerProps) {
  const stages = ['Planning', 'Implementation', 'Testing', 'Complete'];
  const currentStageIndex = getCurrentStageIndex(issue);
  const percentage = Math.round(((currentStageIndex + 1) / stages.length) * 100);

  return (
    <div
      className="bg-white rounded-lg p-6 shadow-warm-md"
      style={{
        borderColor: '#E8E0D5',
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#2F241B' }}>
        Workflow Progress
      </h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: '#6B5D52' }}>Implementation Complete</span>
          <span className="font-semibold" style={{ color: '#2F241B' }}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full" style={{ backgroundColor: '#F5F1EC' }}>
          <div
            className="h-full rounded-full progress-gradient-coral-gold transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between">
        {stages.map((stage, idx) => (
          <div key={stage} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-all duration-300 ${
                idx <= currentStageIndex ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: idx <= currentStageIndex ? '#D97F6F' : '#F5F1EC',
                color: idx <= currentStageIndex ? 'white' : '#A39686'
              }}
            >
              {idx + 1}
            </div>
            <span
              className="text-xs mt-1 text-center"
              style={{
                color: idx <= currentStageIndex ? '#2F241B' : '#A39686',
                fontWeight: idx <= currentStageIndex ? '600' : '400'
              }}
            >
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
