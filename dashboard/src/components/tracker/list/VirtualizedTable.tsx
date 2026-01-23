/**
 * Virtualized Table Component
 * High-performance table with virtual scrolling for large datasets
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type Issue } from '../../../api/tracker';

export interface VirtualRow {
  type: 'group-header' | 'issue';
  data: any;
  groupId?: string;
  issue?: Issue;
}

interface VirtualizedTableProps {
  rows: VirtualRow[];
  onRowClick?: (issue: Issue) => void;
  renderGroupHeader: (data: any) => React.ReactNode;
  renderIssueRow: (issue: Issue, index: number) => React.ReactNode;
  estimatedRowHeight?: number;
  overscanCount?: number;
  className?: string;
}

export function VirtualizedTable({
  rows,
  onRowClick,
  renderGroupHeader,
  renderIssueRow,
  estimatedRowHeight = 56,
  overscanCount = 10,
  className = '',
}: VirtualizedTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      // Group headers are taller
      return row.type === 'group-header' ? 48 : estimatedRowHeight;
    },
    overscan: overscanCount,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`virtualized-table-container ${className}`}
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
      }}
    >
      {/* Total height for scrollbar */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Visible items */}
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.type === 'group-header' ? (
                renderGroupHeader(row.data)
              ) : row.issue ? (
                <div
                  onClick={() => onRowClick?.(row.issue!)}
                  className="cursor-pointer"
                >
                  {renderIssueRow(row.issue, virtualRow.index)}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to flatten grouped issues into virtual rows
 */
export function useFlattenedRows(
  groupedIssues: Array<{ name: string; issues: Issue[]; groupBy: string }>,
  expandedGroups: Set<string>,
  groupBy: string
): VirtualRow[] {
  return useMemo(() => {
    const rows: VirtualRow[] = [];

    groupedIssues.forEach((group, groupIndex) => {
      const groupId = `${groupBy}-${group.name}`;

      // Add group header
      rows.push({
        type: 'group-header',
        data: {
          ...group,
          groupId,
          isExpanded: expandedGroups.has(groupId),
        },
        groupId,
      });

      // Add issues if group is expanded
      if (expandedGroups.has(groupId)) {
        group.issues.forEach((issue) => {
          rows.push({
            type: 'issue',
            data: issue,
            issue,
            groupId,
          });
        });
      }
    });

    return rows;
  }, [groupedIssues, expandedGroups, groupBy]);
}

/**
 * Performance metrics hook for debugging
 */
export function usePerformanceMetrics(enabled: boolean = false) {
  const metricsRef = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    avgRenderTime: 0,
  });

  if (!enabled) return null;

  const startTime = performance.now();

  return {
    recordRender: () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      metricsRef.current.renderCount++;
      metricsRef.current.lastRenderTime = renderTime;
      metricsRef.current.avgRenderTime =
        (metricsRef.current.avgRenderTime * (metricsRef.current.renderCount - 1) + renderTime) /
        metricsRef.current.renderCount;

      if (renderTime > 100) {
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    },
    getMetrics: () => metricsRef.current,
  };
}
