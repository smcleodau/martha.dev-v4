/**
 * MobileMenu Component - Hamburger menu button for mobile navigation
 */

interface MobileMenuProps {
  isOpen: boolean;
  onClick: () => void;
}

export function MobileMenu({ isOpen, onClick }: MobileMenuProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg transition-colors touch-manipulation"
      style={{
        backgroundColor: isOpen ? '#F5F1EC' : 'transparent',
        color: '#2F241B',
        minWidth: '44px',
        minHeight: '44px',
      }}
      aria-label="Toggle menu"
      aria-expanded={isOpen}
    >
      <svg
        className="w-6 h-6 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  );
}
