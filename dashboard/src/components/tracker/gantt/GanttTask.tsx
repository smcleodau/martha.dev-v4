/**
 * GanttTask Component - Custom task bar renderer
 * Provides custom styling for different issue types and priorities
 */

import type { Issue } from '../../../api/tracker';

interface GanttTaskProps {
  issue: Issue;
  progress: number;
  width: number;
  x: number;
  y: number;
  height?: number;
  indentLevel?: number;
}

// Type colors matching tracker design system
const TYPE_COLORS = {
  epic: '#8B7AA8', // purple
  story: '#D97F6F', // coral
  task: '#A39686', // gray
  bug: '#C0392B', // red
};

// Priority border widths
const PRIORITY_BORDER = {
  critical: 4,
  high: 4,
  medium: 2,
  low: 2,
};

export function GanttTask({
  issue,
  progress,
  width,
  x,
  y,
  height = 36,
  indentLevel = 0,
}: GanttTaskProps) {
  const backgroundColor = TYPE_COLORS[issue.type] || TYPE_COLORS.task;
  const borderWidth = PRIORITY_BORDER[issue.priority] || 2;
  const indent = indentLevel * 20; // 20px per level

  // Darker shade for progress fill
  const progressColor = shadeColor(backgroundColor, -20);

  return (
    <g className="gantt-task-custom">
      {/* Main task bar */}
      <rect
        x={x + indent}
        y={y}
        width={Math.max(width - indent, 0)}
        height={height}
        rx={4}
        ry={4}
        fill={backgroundColor}
        stroke={shadeColor(backgroundColor, -30)}
        strokeWidth={1}
        opacity={0.9}
        style={{
          transition: 'all 0.2s ease',
        }}
      />

      {/* Progress fill */}
      {progress > 0 && (
        <rect
          x={x + indent}
          y={y}
          width={Math.max(((width - indent) * progress) / 100, 0)}
          height={height}
          rx={4}
          ry={4}
          fill={progressColor}
          opacity={0.7}
        />
      )}

      {/* Priority border indicator */}
      <rect
        x={x + indent}
        y={y}
        width={borderWidth}
        height={height}
        rx={4}
        ry={4}
        fill={getPriorityColor(issue.priority)}
      />

      {/* Task label */}
      <text
        x={x + indent + 8}
        y={y + height / 2}
        dominantBaseline="middle"
        fill="white"
        fontSize="12"
        fontWeight="500"
        style={{
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {truncateText(`${issue.id}: ${issue.title}`, Math.floor(width / 8))}
      </text>
    </g>
  );
}

/**
 * Utility: Shade a color by a percentage
 * Positive percentage = lighter, negative = darker
 */
function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/**
 * Get priority color for border indicator
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return '#C0392B'; // red
    case 'high':
      return '#E8A93A'; // orange
    case 'medium':
      return '#E0B666'; // gold
    case 'low':
      return '#A39686'; // gray
    default:
      return '#A39686';
  }
}

/**
 * Truncate text to fit within width
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
