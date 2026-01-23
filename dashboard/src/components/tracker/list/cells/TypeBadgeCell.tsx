/**
 * Type Badge Cell - Display issue type with warm color palette
 */

interface TypeBadgeCellProps {
  type: 'epic' | 'story' | 'task' | 'bug';
}

export function TypeBadgeCell({ type }: TypeBadgeCellProps) {
  const typeStyles = {
    epic: {
      bg: '#F3F1F7',
      text: '#8B7AA8',
      border: '#D4CEE0',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
        </svg>
      ),
    },
    story: {
      bg: '#FDF5F3',
      text: '#D97F6F',
      border: '#F9D0C8',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd"/>
        </svg>
      ),
    },
    task: {
      bg: '#F5F4F2',
      text: '#A39686',
      border: '#D4CBBD',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
        </svg>
      ),
    },
    bug: {
      bg: '#FCEEEB',
      text: '#C0392B',
      border: '#F5B1A4',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
        </svg>
      ),
    },
  };

  const style = typeStyles[type];

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium"
        style={{
          backgroundColor: style.bg,
          color: style.text,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: style.border,
        }}
      >
        {style.icon}
        <span className="capitalize">{type}</span>
      </span>
    </div>
  );
}
