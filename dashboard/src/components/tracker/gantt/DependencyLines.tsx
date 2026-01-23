/**
 * DependencyLines Component - Renders dependency arrows between Gantt tasks
 * Supports blocks, blocked_by, and related relationships with visual styling
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { GanttTask } from './hooks/useCriticalPath';

interface DependencyLinesProps {
  tasks: GanttTask[];
  showDependencies: boolean;
  criticalPath: string[];
  onDependencyClick?: (fromTask: string, toTask: string) => void;
}

interface DependencyLine {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: 'blocks' | 'blocked_by' | 'related';
  isCritical: boolean;
  points: { x: number; y: number }[];
}

export function DependencyLines({
  tasks,
  showDependencies,
  criticalPath,
  onDependencyClick
}: DependencyLinesProps) {
  const [dependencies, setDependencies] = useState<DependencyLine[]>([]);
  const [highlightedDep, setHighlightedDep] = useState<string | null>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // Calculate dependency lines based on task positions
  const calculateDependencies = useCallback(() => {
    if (!showDependencies) {
      setDependencies([]);
      return;
    }

    const lines: DependencyLine[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    tasks.forEach(task => {
      if (!task.dependencies) return;

      const deps = task.dependencies.split(',').map(d => d.trim()).filter(Boolean);

      deps.forEach(depId => {
        const fromTask = taskMap.get(depId);
        const toTask = task;

        if (!fromTask) return;

        // Get DOM elements for tasks
        const fromEl = document.querySelector(`.bar-wrapper[data-id="${fromTask.id}"]`);
        const toEl = document.querySelector(`.bar-wrapper[data-id="${toTask.id}"]`);

        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const containerRect = document.querySelector('.gantt-container')?.getBoundingClientRect();

        if (!containerRect) return;

        // Calculate relative positions
        const fromX = fromRect.right - containerRect.left;
        const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
        const toX = toRect.left - containerRect.left;
        const toY = toRect.top + toRect.height / 2 - containerRect.top;

        // Determine if this dependency is on critical path
        const isCritical =
          criticalPath.includes(fromTask.id) && criticalPath.includes(toTask.id);

        lines.push({
          id: `${fromTask.id}-${toTask.id}`,
          fromTaskId: fromTask.id,
          toTaskId: toTask.id,
          type: 'blocks',
          isCritical,
          points: [
            { x: fromX, y: fromY },
            { x: toX, y: toY }
          ]
        });
      });
    });

    setDependencies(lines);
  }, [tasks, showDependencies, criticalPath]);

  // Recalculate on resize or scroll
  useEffect(() => {
    if (!showDependencies) return;

    calculateDependencies();

    const handleUpdate = () => {
      requestAnimationFrame(calculateDependencies);
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    // Update on Gantt scroll
    const ganttContainer = document.querySelector('.gantt-container');
    if (ganttContainer) {
      ganttContainer.addEventListener('scroll', handleUpdate);
    }

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      if (ganttContainer) {
        ganttContainer.removeEventListener('scroll', handleUpdate);
      }
    };
  }, [showDependencies, calculateDependencies]);

  // Handle task hover to highlight related dependencies
  useEffect(() => {
    if (!showDependencies) return;

    const handleTaskHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const barWrapper = target.closest('.bar-wrapper');

      if (barWrapper) {
        const taskId = barWrapper.getAttribute('data-id');
        setHoveredTask(taskId);
      } else {
        setHoveredTask(null);
      }
    };

    document.addEventListener('mouseover', handleTaskHover);
    return () => document.removeEventListener('mouseover', handleTaskHover);
  }, [showDependencies]);

  if (!showDependencies || dependencies.length === 0) {
    return null;
  }

  return (
    <svg
      className="dependency-lines-overlay absolute inset-0 pointer-events-none"
      style={{
        zIndex: 1,
        overflow: 'visible'
      }}
    >
      <defs>
        {/* Arrow markers for different dependency types */}
        <marker
          id="arrow-normal"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#A39686" />
        </marker>
        <marker
          id="arrow-critical"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#C0392B" />
        </marker>
        <marker
          id="arrow-blocked"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#E8A93A" />
        </marker>
      </defs>

      {dependencies.map(dep => {
        const isHighlighted =
          highlightedDep === dep.id ||
          hoveredTask === dep.fromTaskId ||
          hoveredTask === dep.toTaskId;

        const [start, end] = dep.points;

        // Calculate control points for curved line
        const midX = (start.x + end.x) / 2;
        const curveOffset = 20;

        let strokeColor: string;
        let strokeWidth: number;
        let strokeDasharray: string | undefined;
        let markerEnd: string;

        if (dep.isCritical) {
          strokeColor = '#C0392B';
          strokeWidth = 3;
          markerEnd = 'url(#arrow-critical)';
        } else if (dep.type === 'blocked_by') {
          strokeColor = '#E8A93A';
          strokeWidth = 2;
          strokeDasharray = '5,5';
          markerEnd = 'url(#arrow-blocked)';
        } else {
          strokeColor = '#A39686';
          strokeWidth = 2;
          markerEnd = 'url(#arrow-normal)';
        }

        // Increase opacity and width on highlight
        if (isHighlighted) {
          strokeWidth += 1;
        }

        const pathD = `
          M ${start.x} ${start.y}
          C ${midX} ${start.y + curveOffset},
            ${midX} ${end.y - curveOffset},
            ${end.x} ${end.y}
        `;

        return (
          <g key={dep.id} className="dependency-line-group">
            {/* Invisible wider line for easier hovering */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={strokeWidth + 8}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setHighlightedDep(dep.id)}
              onMouseLeave={() => setHighlightedDep(null)}
              onClick={() => {
                onDependencyClick?.(dep.fromTaskId, dep.toTaskId);
              }}
            />

            {/* Actual visible line */}
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              markerEnd={markerEnd}
              opacity={isHighlighted ? 1 : 0.6}
              className="transition-all duration-200"
            />

            {/* Show label on hover */}
            {highlightedDep === dep.id && (
              <g>
                <text
                  x={midX}
                  y={(start.y + end.y) / 2 - 10}
                  textAnchor="middle"
                  className="text-xs font-semibold pointer-events-none"
                  fill="#2F241B"
                  style={{ fontSize: '11px' }}
                >
                  <tspan
                    x={midX}
                    dy="0"
                    fill="white"
                    stroke="white"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {dep.isCritical ? 'CRITICAL' : dep.type.toUpperCase()}
                  </tspan>
                  <tspan x={midX} dy="0">
                    {dep.isCritical ? 'CRITICAL' : dep.type.toUpperCase()}
                  </tspan>
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * DependencyDetailsModal - Shows detailed info when clicking a dependency
 */
interface DependencyDetailsModalProps {
  fromTask: GanttTask | undefined;
  toTask: GanttTask | undefined;
  isOpen: boolean;
  onClose: () => void;
}

export function DependencyDetailsModal({
  fromTask,
  toTask,
  isOpen,
  onClose
}: DependencyDetailsModalProps) {
  if (!isOpen || !fromTask || !toTask) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
        style={{ borderColor: '#E8E0D5', borderWidth: '1px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#2F241B' }}>
            Dependency Details
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: '#A39686' }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#F5F1EC' }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: '#A39686' }}>
              DEPENDS ON
            </div>
            <div className="font-mono text-sm font-bold" style={{ color: '#6B5D52' }}>
              {fromTask.id}
            </div>
            <div className="text-sm mt-1" style={{ color: '#2F241B' }}>
              {fromTask.name}
            </div>
          </div>

          <div className="flex justify-center">
            <svg className="w-6 h-6" style={{ color: '#A39686' }} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#FCEEEB' }}
          >
            <div className="text-xs font-semibold mb-1" style={{ color: '#D97F6F' }}>
              BLOCKS
            </div>
            <div className="font-mono text-sm font-bold" style={{ color: '#6B5D52' }}>
              {toTask.id}
            </div>
            <div className="text-sm mt-1" style={{ color: '#2F241B' }}>
              {toTask.name}
            </div>
          </div>

          <div
            className="text-xs p-3 rounded-lg"
            style={{ backgroundColor: '#FEF3E2', color: '#6B5D52' }}
          >
            <strong>{toTask.name}</strong> cannot start until <strong>{fromTask.name}</strong> is
            completed.
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-lg font-semibold transition-colors"
          style={{ backgroundColor: '#D97F6F', color: 'white' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
