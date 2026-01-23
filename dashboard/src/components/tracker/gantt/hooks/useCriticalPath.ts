/**
 * useCriticalPath Hook - Critical Path Analysis for Gantt Chart
 * Implements forward/backward pass algorithm to identify critical path tasks
 */

import { useState, useEffect, useMemo } from 'react';

export interface GanttTask {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string; // Comma-separated dependency IDs
  custom_class?: string;
}

export interface TaskTiming {
  earliestStart: Date;
  earliestFinish: Date;
  latestStart: Date;
  latestFinish: Date;
  slack: number; // days
  isCritical: boolean;
}

export interface CriticalPathResult {
  criticalPath: string[];
  taskTimings: Record<string, TaskTiming>;
  hasCircularDependency: boolean;
  circularTasks: string[];
}

/**
 * Detect circular dependencies in task graph
 */
function detectCircularDependencies(tasks: GanttTask[]): string[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const circular: string[] = [];

  function dfs(taskId: string): boolean {
    if (recursionStack.has(taskId)) {
      circular.push(taskId);
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = taskMap.get(taskId);
    if (task?.dependencies) {
      const deps = task.dependencies.split(',').map(d => d.trim()).filter(Boolean);

      for (const depId of deps) {
        if (dfs(depId)) {
          if (!circular.includes(taskId)) {
            circular.push(taskId);
          }
          return true;
        }
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  });

  return circular;
}

/**
 * Get duration in days between two dates
 */
function getDurationInDays(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate critical path using forward and backward pass algorithm
 */
function calculateCriticalPath(tasks: GanttTask[]): CriticalPathResult {
  // Check for circular dependencies first
  const circularTasks = detectCircularDependencies(tasks);
  if (circularTasks.length > 0) {
    return {
      criticalPath: [],
      taskTimings: {},
      hasCircularDependency: true,
      circularTasks
    };
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const timings: Record<string, TaskTiming> = {};

  // Build dependency graph
  const dependents = new Map<string, string[]>(); // task -> tasks that depend on it
  const dependencies = new Map<string, string[]>(); // task -> tasks it depends on

  tasks.forEach(task => {
    dependencies.set(task.id, []);
    dependents.set(task.id, []);
  });

  tasks.forEach(task => {
    if (task.dependencies) {
      const deps = task.dependencies.split(',').map(d => d.trim()).filter(Boolean);
      dependencies.set(task.id, deps);

      deps.forEach(depId => {
        if (!dependents.has(depId)) {
          dependents.set(depId, []);
        }
        dependents.get(depId)!.push(task.id);
      });
    }
  });

  // FORWARD PASS: Calculate earliest start and finish times
  const calculateEarliest = (taskId: string, visited = new Set<string>()): void => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const deps = dependencies.get(taskId) || [];

    // Calculate earliest start based on dependencies
    let earliestStart = task.start;

    if (deps.length > 0) {
      // First ensure all dependencies are calculated
      deps.forEach(depId => calculateEarliest(depId, visited));

      // Earliest start is the maximum of all dependency earliest finishes
      const depFinishes = deps
        .map(depId => timings[depId]?.earliestFinish)
        .filter(Boolean) as Date[];

      if (depFinishes.length > 0) {
        const maxDepFinish = new Date(Math.max(...depFinishes.map(d => d.getTime())));
        earliestStart = maxDepFinish > task.start ? maxDepFinish : task.start;
      }
    }

    const duration = getDurationInDays(task.start, task.end);
    const earliestFinish = addDays(earliestStart, duration);

    timings[taskId] = {
      earliestStart,
      earliestFinish,
      latestStart: earliestStart,
      latestFinish: earliestFinish,
      slack: 0,
      isCritical: false
    };
  };

  // Calculate earliest times for all tasks
  tasks.forEach(task => calculateEarliest(task.id));

  // Find project end date (maximum earliest finish)
  const projectEnd = new Date(
    Math.max(...Object.values(timings).map(t => t.earliestFinish.getTime()))
  );

  // BACKWARD PASS: Calculate latest start and finish times
  const calculateLatest = (taskId: string, visited = new Set<string>()): void => {
    if (visited.has(taskId)) return;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return;

    const deps = dependents.get(taskId) || [];

    // Calculate latest finish based on dependent tasks
    let latestFinish = projectEnd;

    if (deps.length > 0) {
      // First ensure all dependents are calculated
      deps.forEach(depId => calculateLatest(depId, visited));

      // Latest finish is the minimum of all dependent latest starts
      const depStarts = deps
        .map(depId => timings[depId]?.latestStart)
        .filter(Boolean) as Date[];

      if (depStarts.length > 0) {
        const minDepStart = new Date(Math.min(...depStarts.map(d => d.getTime())));
        latestFinish = minDepStart < projectEnd ? minDepStart : projectEnd;
      }
    }

    const duration = getDurationInDays(task.start, task.end);
    const latestStart = addDays(latestFinish, -duration);

    const timing = timings[taskId];
    timing.latestStart = latestStart;
    timing.latestFinish = latestFinish;

    // Calculate slack (in days)
    timing.slack = getDurationInDays(timing.earliestStart, timing.latestStart);

    // Task is critical if slack is zero or near-zero
    timing.isCritical = timing.slack <= 0.5; // Allow for floating point errors
  };

  // Calculate latest times for all tasks (start from tasks with no dependents)
  const endTasks = tasks.filter(task => {
    const deps = dependents.get(task.id) || [];
    return deps.length === 0;
  });

  endTasks.forEach(task => calculateLatest(task.id));

  // Make sure all tasks are calculated
  tasks.forEach(task => {
    if (!timings[task.id] || timings[task.id].latestStart === timings[task.id].earliestStart) {
      calculateLatest(task.id);
    }
  });

  // Extract critical path (all tasks with zero slack)
  const criticalPath = tasks
    .filter(task => timings[task.id]?.isCritical)
    .map(task => task.id);

  return {
    criticalPath,
    taskTimings: timings,
    hasCircularDependency: false,
    circularTasks: []
  };
}

/**
 * Custom hook for critical path analysis
 */
export function useCriticalPath(tasks: GanttTask[]) {
  const [result, setResult] = useState<CriticalPathResult>({
    criticalPath: [],
    taskTimings: {},
    hasCircularDependency: false,
    circularTasks: []
  });

  // Memoize the calculation to avoid recalculating on every render
  const memoizedResult = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        criticalPath: [],
        taskTimings: {},
        hasCircularDependency: false,
        circularTasks: []
      };
    }

    return calculateCriticalPath(tasks);
  }, [tasks]);

  useEffect(() => {
    setResult(memoizedResult);
  }, [memoizedResult]);

  return {
    criticalPath: result.criticalPath,
    taskTimings: result.taskTimings,
    hasCircularDependency: result.hasCircularDependency,
    circularTasks: result.circularTasks,
    calculatePath: () => {
      const newResult = calculateCriticalPath(tasks);
      setResult(newResult);
      return newResult;
    }
  };
}
