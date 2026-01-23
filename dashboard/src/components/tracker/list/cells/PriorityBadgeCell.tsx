/**
 * Priority Badge Cell - Display priority with warm color palette
 */

interface PriorityBadgeCellProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export function PriorityBadgeCell({ priority }: PriorityBadgeCellProps) {
  const priorityStyles = {
    critical: {
      bg: '#FCEEEB',
      text: '#C0392B',
      icon: '!!!',
    },
    high: {
      bg: '#FDF6EC',
      text: '#E8A93A',
      icon: '!!',
    },
    medium: {
      bg: '#FDF9EF',
      text: '#E0B666',
      icon: '!',
    },
    low: {
      bg: '#F5F4F2',
      text: '#A39686',
      icon: '·',
    },
  };

  const style = priorityStyles[priority];

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold"
      style={{
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      <span className="text-xs">{style.icon}</span>
      <span className="capitalize">{priority}</span>
    </span>
  );
}
