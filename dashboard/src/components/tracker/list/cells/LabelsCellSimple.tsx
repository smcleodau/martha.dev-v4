/**
 * Labels Cell - Display labels as chips (read-only)
 */

interface LabelsCellSimpleProps {
  labels: string[];
}

export function LabelsCellSimple({ labels }: LabelsCellSimpleProps) {
  if (!labels || labels.length === 0) {
    return (
      <span className="text-sm" style={{ color: '#A39686' }}>
        -
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.slice(0, 3).map((label, idx) => (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            backgroundColor: '#F5F4F2',
            color: '#6B5D52',
          }}
        >
          {label}
        </span>
      ))}
      {labels.length > 3 && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            backgroundColor: '#F5F4F2',
            color: '#A39686',
          }}
        >
          +{labels.length - 3}
        </span>
      )}
    </div>
  );
}
