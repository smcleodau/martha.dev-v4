/**
 * Quality Metrics Panel Component - Displays quality score with circular progress
 */

import { type Issue } from '../../../api/tracker';

interface QualityMetricsPanelProps {
  issue: Issue;
}

export function QualityMetricsPanel({ issue }: QualityMetricsPanelProps) {
  // Only show if there's quality data
  if (!issue.quality) {
    return null;
  }

  // Calculate overall score
  const coverageScore = issue.quality?.coverage || 0;
  const checklistTotal = issue.quality?.checklist?.length || 0;
  const checklistCompleted = (issue.quality?.checklist || []).filter(item =>
    item.startsWith('[x]') || item.startsWith('[X]')
  ).length;
  const checklistScore = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;

  const overallScore = Math.round((coverageScore + checklistScore) / 2);

  // Calculate SVG circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (overallScore / 100) * circumference;

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
        Quality Metrics
      </h3>

      <div className="flex items-center gap-6">
        {/* Circular progress indicator */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="#F5F1EC"
              strokeWidth="8"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D97F6F" />
                <stop offset="100%" stopColor="#E0B666" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: '#2F241B' }}>
              {overallScore}%
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          {coverageScore > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: '#6B5D52' }}>Code Coverage</span>
                <span className="font-semibold" style={{ color: '#2F241B' }}>
                  {coverageScore}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#F5F1EC' }}>
                <div
                  className="h-full rounded-full progress-gradient-coral-gold transition-all duration-300"
                  style={{ width: `${coverageScore}%` }}
                />
              </div>
            </div>
          )}

          {checklistTotal > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: '#6B5D52' }}>Acceptance Criteria</span>
                <span className="font-semibold" style={{ color: '#2F241B' }}>
                  {checklistCompleted}/{checklistTotal}
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#F5F1EC' }}>
                <div
                  className="h-full rounded-full progress-gradient-coral-gold transition-all duration-300"
                  style={{ width: `${checklistScore}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
