/**
 * Checkbox Cell - Selection checkbox for bulk operations
 */

interface CheckboxCellProps {
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckboxCell({ checked, onChange }: CheckboxCellProps) {
  return (
    <div className="flex items-center justify-center">
      <input
        type="checkbox"
        className="w-4 h-4 rounded cursor-pointer"
        style={{
          accentColor: '#D97F6F',
          borderColor: '#E8E0D5',
        }}
        checked={checked}
        onChange={onChange}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
