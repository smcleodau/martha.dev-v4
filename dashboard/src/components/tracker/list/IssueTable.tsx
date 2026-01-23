/**
 * Issue Table Component - TanStack Table implementation
 * Phase 4: MTH-049 - List View with sortable columns
 */

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table';
import { type Issue } from '../../../api/tracker';
import { TableRow } from './TableRow';
import {
  CheckboxCell,
  IdCell,
  TypeBadgeCell,
  TitleCell,
  PriorityBadgeCell,
  StatusBadgeCell,
  AssigneeCell,
  LabelsCell,
  ProgressCell,
  ActionsCell,
} from './cells';

interface IssueTableProps {
  issues: Issue[];
  onIssueClick: (issueId: string) => void;
  onIssueUpdate?: (issueId: string, updates: Partial<Issue>) => Promise<void>;
  onIssueDelete?: (issueId: string) => Promise<void>;
}

export function IssueTable({
  issues,
  onIssueClick,
  onIssueUpdate,
  onIssueDelete,
}: IssueTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  // Create issues lookup map for progress calculation
  const issuesMap = useMemo(() => {
    return issues.reduce((acc, issue) => {
      acc[issue.id] = issue;
      return acc;
    }, {} as Record<string, Issue>);
  }, [issues]);

  // Column definitions
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="w-4 h-4 rounded cursor-pointer"
              style={{
                accentColor: '#D97F6F',
                borderColor: '#E8E0D5',
              }}
              checked={table.getIsAllRowsSelected()}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          </div>
        ),
        cell: ({ row }) => (
          <CheckboxCell
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: 'id',
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }) => <IdCell issue={row.original} />,
        size: 100,
        enableSorting: true,
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <TypeBadgeCell type={row.original.type} />,
        size: 100,
        enableSorting: true,
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <TitleCell issue={row.original} />,
        size: 400,
        enableSorting: true,
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => <PriorityBadgeCell priority={row.original.priority} />,
        size: 100,
        enableSorting: true,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadgeCell status={row.original.status} />,
        size: 120,
        enableSorting: true,
      },
      {
        id: 'assignee',
        accessorKey: 'assignee',
        header: 'Assignee',
        cell: ({ row }) => <AssigneeCell assignee={row.original.assignee} />,
        size: 150,
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const nameA = rowA.original.assignee?.name || '';
          const nameB = rowB.original.assignee?.name || '';
          return nameA.localeCompare(nameB);
        },
      },
      {
        id: 'labels',
        accessorKey: 'labels',
        header: 'Labels',
        cell: ({ row }) => <LabelsCell labels={row.original.labels} />,
        size: 200,
        enableSorting: false,
      },
      {
        id: 'progress',
        header: 'Progress',
        cell: ({ row }) => <ProgressCell issue={row.original} allIssues={issuesMap} />,
        size: 100,
        enableSorting: false,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <ActionsCell
            issue={row.original}
            onEdit={() => onIssueClick(row.original.id)}
            onDelete={
              onIssueDelete
                ? async () => await onIssueDelete(row.original.id)
                : undefined
            }
          />
        ),
        size: 60,
        enableSorting: false,
      },
    ],
    [issuesMap, onIssueClick, onIssueDelete]
  );

  const table = useReactTable({
    data: issues,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#E8E0D5',
        boxShadow: '0 2px 4px rgba(47, 36, 27, 0.08)',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={{ minWidth: '1200px' }}>
          <thead
            style={{
              backgroundColor: '#FAF8F5',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: '#E8E0D5',
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      paddingTop: '12px',
                      paddingBottom: '12px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      textAlign: 'left',
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-2 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span
                          className="text-xs font-semibold uppercase tracking-wide"
                          style={{ color: '#6B5D52' }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {header.column.getCanSort() && (
                          <span style={{ color: '#A39686' }}>
                            {{
                              asc: '↑',
                              desc: '↓',
                            }[header.column.getIsSorted() as string] ?? '↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                onIssueClick={onIssueClick}
              />
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-12"
                  style={{ color: '#A39686' }}
                >
                  No issues found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with row count */}
      <div
        className="px-4 py-3 text-sm"
        style={{
          backgroundColor: '#FAF8F5',
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopColor: '#E8E0D5',
          color: '#6B5D52',
        }}
      >
        <div className="flex items-center justify-between">
          <span>
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="font-medium" style={{ color: '#D97F6F' }}>
                {table.getFilteredSelectedRowModel().rows.length} selected
              </span>
            )}
          </span>
          <span>
            Showing {table.getRowModel().rows.length} of {issues.length} issues
          </span>
        </div>
      </div>
    </div>
  );
}
