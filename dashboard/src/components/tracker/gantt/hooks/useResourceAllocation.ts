/**
 * Resource Allocation Hook
 * Calculates resource allocation, utilization, and identifies over-allocated team members
 */

import { useMemo } from 'react';
import { type Issue } from '../../../../api/tracker';

export interface ResourceAllocation {
  userId: string;
  userName: string;
  userAvatar: string;
  taskCount: number;
  totalHours: number;
  availableHours: number; // Default 40h/week
  utilizationPercent: number;
  isOverAllocated: boolean;
  severityLevel: 'healthy' | 'at-capacity' | 'over-allocated' | 'severely-over-allocated';
  tasks: Issue[];
}

/**
 * Calculate resource allocation for all team members
 * Groups tasks by assignee and calculates utilization metrics
 */
export function useResourceAllocation(issues: Issue[], availableHoursPerWeek: number = 40) {
  const allocations = useMemo(() => {
    // Group issues by assignee
    const byAssignee: Record<string, Issue[]> = {};

    issues.forEach(issue => {
      // Only count leaf tasks (not epics/stories) for resource allocation
      // Epics and stories are tracked through their children
      if (issue.type === 'epic' || issue.type === 'story') {
        return;
      }

      const assigneeId = issue.assignee?.id || 'unassigned';
      if (!byAssignee[assigneeId]) {
        byAssignee[assigneeId] = [];
      }
      byAssignee[assigneeId].push(issue);
    });

    // Calculate allocation metrics for each assignee
    const allocationList: ResourceAllocation[] = Object.entries(byAssignee).map(([userId, tasks]) => {
      const totalHours = tasks.reduce((sum, task) =>
        sum + (task.estimated_duration || 0), 0
      );
      const utilizationPercent = (totalHours / availableHoursPerWeek) * 100;

      // Determine severity level based on utilization
      let severityLevel: ResourceAllocation['severityLevel'];
      if (totalHours <= 30) {
        severityLevel = 'healthy';
      } else if (totalHours <= 40) {
        severityLevel = 'at-capacity';
      } else if (totalHours <= 50) {
        severityLevel = 'over-allocated';
      } else {
        severityLevel = 'severely-over-allocated';
      }

      return {
        userId,
        userName: tasks[0]?.assignee?.name || 'Unassigned',
        userAvatar: tasks[0]?.assignee?.avatar || '',
        taskCount: tasks.length,
        totalHours,
        availableHours: availableHoursPerWeek,
        utilizationPercent,
        isOverAllocated: totalHours > availableHoursPerWeek,
        severityLevel,
        tasks,
      };
    });

    // Sort by utilization (highest first)
    return allocationList.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }, [issues, availableHoursPerWeek]);

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    const overAllocatedCount = allocations.filter(a => a.isOverAllocated).length;
    const totalAllocatedHours = allocations.reduce((sum, a) => sum + a.totalHours, 0);
    const totalAvailableHours = allocations.length * availableHoursPerWeek;
    const averageUtilization = allocations.length > 0
      ? allocations.reduce((sum, a) => sum + a.utilizationPercent, 0) / allocations.length
      : 0;

    return {
      totalTeamMembers: allocations.length,
      overAllocatedCount,
      totalAllocatedHours,
      totalAvailableHours,
      averageUtilization,
      capacityRemaining: totalAvailableHours - totalAllocatedHours,
    };
  }, [allocations, availableHoursPerWeek]);

  return { allocations, metrics };
}

/**
 * Get color for utilization level
 */
export function getUtilizationColor(severityLevel: ResourceAllocation['severityLevel']): {
  bg: string;
  fill: string;
  text: string;
  border: string;
} {
  switch (severityLevel) {
    case 'healthy':
      return {
        bg: '#F0F9F4',
        fill: '#52A560',
        text: '#2F6B3C',
        border: '#A8D4B0',
      };
    case 'at-capacity':
      return {
        bg: '#FDF9EF',
        fill: '#E0B666',
        text: '#9A7B3D',
        border: '#F0DDB3',
      };
    case 'over-allocated':
      return {
        bg: '#FDF6EC',
        fill: '#E8A93A',
        text: '#B97F1E',
        border: '#F4D4A0',
      };
    case 'severely-over-allocated':
      return {
        bg: '#FCEEEB',
        fill: '#C0392B',
        text: '#8B2A20',
        border: '#E89B8E',
      };
  }
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${Math.round(hours)}h`;
}
