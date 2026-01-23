/**
 * Status Badge Cell - Display status with color coding
 */

interface StatusBadgeCellProps {
  status: string;
}

export function StatusBadgeCell({ status }: StatusBadgeCellProps) {
  // Map status to warm colors - matching existing kanban column colors
  const getStatusStyle = (status: string) => {
    const lowerStatus = status.toLowerCase();

    // Done/Complete states
    if (['done', 'closed', 'completed'].includes(lowerStatus)) {
      return {
        bg: '#EDF7F0',
        text: '#52A560',
        border: '#C1E6CA',
      };
    }

    // In Progress states
    if (['in progress', 'in_progress', 'doing'].includes(lowerStatus)) {
      return {
        bg: '#FDF5F3',
        text: '#D97F6F',
        border: '#F9D0C8',
      };
    }

    // Review states
    if (['review', 'in review', 'testing'].includes(lowerStatus)) {
      return {
        bg: '#F0F4FB',
        text: '#6B9BD1',
        border: '#CCDCEF',
      };
    }

    // Blocked/Issues states
    if (['blocked', 'on hold'].includes(lowerStatus)) {
      return {
        bg: '#FDF6EC',
        text: '#E8A93A',
        border: '#F9E6BF',
      };
    }

    // Default (Backlog, To Do, etc)
    return {
      bg: '#F5F4F2',
      text: '#6B5D52',
      border: '#D4CBBD',
    };
  };

  const style = getStatusStyle(status);

  return (
    <span
      className="inline-flex items-center text-xs px-2.5 py-1 rounded-md font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: style.border,
      }}
    >
      {status}
    </span>
  );
}
