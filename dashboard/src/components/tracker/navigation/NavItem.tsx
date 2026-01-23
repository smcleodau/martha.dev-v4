/**
 * NavItem Component - Individual navigation link
 */

interface NavItemProps {
  label: string;
  icon?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  iconOnly?: boolean;
}

export function NavItem({ label, icon, active = false, onClick, href, iconOnly = false }: NavItemProps) {
  const baseClasses = iconOnly
    ? `flex items-center justify-center w-12 h-12 mx-auto rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer`
    : `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer`;

  const activeClasses = active
    ? 'bg-tracker-bg-subtle border-l-4 border-tracker-coral-500 text-tracker-text-DEFAULT shadow-warm-sm'
    : 'text-tracker-text-muted hover:bg-tracker-bg-subtle hover:text-tracker-text-DEFAULT';

  const content = iconOnly ? (
    <span className="text-xl" title={label}>
      {icon}
    </span>
  ) : (
    <>
      {icon && (
        <span className="text-base flex-shrink-0" style={{ width: '20px', textAlign: 'center' }}>
          {icon}
        </span>
      )}
      <span className="flex-1">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`${baseClasses} ${activeClasses}`}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      className={`${baseClasses} ${activeClasses} ${iconOnly ? '' : 'w-full text-left'}`}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
