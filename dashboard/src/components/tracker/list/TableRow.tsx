/**
 * Table Row Component - Individual row with hover and selection states
 * Phase 4: MTH-049 - List View Implementation
 */

import { type Row } from '@tanstack/react-table';
import { type Issue } from '../../../api/tracker';
import { flexRender } from '@tanstack/react-table';

interface TableRowProps {
  row: Row<Issue>;
  onIssueClick: (issueId: string) => void;
}

export function TableRow({ row, onIssueClick }: TableRowProps) {
  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on checkbox, buttons, or links
    const target = e.target as HTMLElement;
    if (
      target.closest('input[type="checkbox"]') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }

    onIssueClick(row.original.id);
  };

  return (
    <tr
      className="table-row-hover cursor-pointer"
      onClick={handleRowClick}
      style={{
        backgroundColor: row.getIsSelected() ? '#FDF5F3' : '#FFFFFF',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#F5F1EC',
        transition: 'background-color 0.15s ease-in-out',
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          style={{
            paddingTop: '12px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}
