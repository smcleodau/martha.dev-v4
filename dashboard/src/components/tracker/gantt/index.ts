/**
 * Gantt View Components
 * Progress Tracking & Resource Allocation for Martha Tracker (MTH-049)
 * Dependency Visualization & Critical Path for Martha Tracker (MTH-048)
 */

// Core components
export { GanttChart, convertIssueToGanttTask, buildHierarchicalTasks } from './GanttChart';
export { GanttTaskBar } from './GanttTaskBar';
export { ResourcePanel } from './ResourcePanel';
export { ResourceAllocationBar } from './ResourceAllocationBar';
export { ResourceFilterControls } from './ResourceFilterControls';

// MTH-048: Dependency visualization and critical path
export { CriticalPath, CriticalPathBadge, SlackTooltip } from './CriticalPath';
export { DependencyLines, DependencyDetailsModal } from './DependencyLines';
export { DependencyControls, DependencyLegend, GanttToolbar } from './DependencyControls';

// Hooks
export { useResourceAllocation, getUtilizationColor, formatHours } from './hooks/useResourceAllocation';
export type { ResourceAllocation } from './hooks/useResourceAllocation';

// MTH-048: Critical path hooks
export { useCriticalPath } from './hooks/useCriticalPath';
export type { GanttTask, TaskTiming, CriticalPathResult } from './hooks/useCriticalPath';
