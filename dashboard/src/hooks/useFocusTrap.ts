/**
 * Focus Trap Hook
 *
 * Traps keyboard focus within a modal or dialog for accessibility.
 * Ensures users can't tab outside the modal while it's open.
 *
 * WCAG 2.1 AA Compliance:
 * - 2.1.2 No Keyboard Trap (Level A) - Provides escape mechanism
 * - 2.4.3 Focus Order (Level A) - Maintains logical focus order
 * - 2.4.7 Focus Visible (Level AA) - Ensures focus is always visible
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  enabled?: boolean;

  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;

  /**
   * Whether to restore focus to the previously focused element on unmount
   * @default true
   */
  restoreFocus?: boolean;

  /**
   * Whether to focus the first focusable element on mount
   * @default true
   */
  initialFocus?: boolean;
}

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );

  return elements.filter((element) => {
    // Filter out hidden elements
    return (
      element.offsetParent !== null &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  });
}

/**
 * Custom hook for trapping focus within a container (modal/dialog)
 *
 * @example
 * const modalRef = useFocusTrap({
 *   enabled: isOpen,
 *   onEscape: () => setIsOpen(false)
 * });
 *
 * return (
 *   <div ref={modalRef} role="dialog">
 *     ...
 *   </div>
 * );
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: UseFocusTrapOptions = {}
): React.RefObject<T> {
  const {
    enabled = true,
    onEscape,
    restoreFocus = true,
    initialFocus = true,
  } = options;

  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Handle keyboard events (Tab, Shift+Tab, Escape)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current || !enabled) return;

      const focusableElements = getFocusableElements(containerRef.current);

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onEscape) {
          onEscape();
        }
        return;
      }

      // Handle Tab key
      if (event.key === 'Tab') {
        // Shift + Tab (backwards)
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        }
        // Tab (forwards)
        else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [enabled, onEscape]
  );

  // Setup focus trap
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Save currently focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus first element if requested
    if (initialFocus) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        // Small delay to ensure modal is rendered
        setTimeout(() => {
          focusableElements[0].focus();
        }, 50);
      }
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (restoreFocus && previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [enabled, handleKeyDown, initialFocus, restoreFocus]);

  return containerRef;
}

/**
 * Hook for managing modal accessibility features
 * Combines focus trap with ARIA attributes and body scroll lock
 *
 * @example
 * const modalProps = useModalA11y({
 *   isOpen: isOpen,
 *   onClose: () => setIsOpen(false),
 *   title: 'Issue Details'
 * });
 *
 * return (
 *   <div {...modalProps.containerProps}>
 *     <h2 {...modalProps.titleProps}>Issue Details</h2>
 *     ...
 *   </div>
 * );
 */
export function useModalA11y(options: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
}) {
  const { isOpen, onClose, title, description } = options;

  const titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description
    ? `modal-desc-${Math.random().toString(36).substr(2, 9)}`
    : undefined;

  const containerRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    onEscape: onClose,
    restoreFocus: true,
    initialFocus: true,
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  return {
    containerRef,
    containerProps: {
      role: 'dialog',
      'aria-modal': 'true' as const,
      'aria-labelledby': titleId,
      'aria-describedby': descriptionId,
      tabIndex: -1,
    },
    titleProps: {
      id: titleId,
    },
    descriptionProps: descriptionId
      ? {
          id: descriptionId,
        }
      : undefined,
  };
}

/**
 * Hook for dropdown/menu focus management
 * Handles arrow key navigation and Escape key
 *
 * @example
 * const menuProps = useMenuA11y({
 *   isOpen: isMenuOpen,
 *   onClose: () => setIsMenuOpen(false),
 *   orientation: 'vertical'
 * });
 *
 * return (
 *   <div {...menuProps.containerProps}>
 *     <button {...menuProps.itemProps(0)}>Option 1</button>
 *     <button {...menuProps.itemProps(1)}>Option 2</button>
 *   </div>
 * );
 */
export function useMenuA11y(options: {
  isOpen: boolean;
  onClose: () => void;
  orientation?: 'vertical' | 'horizontal';
}) {
  const { isOpen, onClose, orientation = 'vertical' } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || !containerRef.current) return;

      const items = Array.from(itemRefs.current.values());
      const currentIndex = items.findIndex((item) => item === document.activeElement);

      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onClose();
          break;

        case nextKey:
          event.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1].focus();
          } else {
            items[0].focus();
          }
          break;

        case prevKey:
          event.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1].focus();
          } else {
            items[items.length - 1].focus();
          }
          break;

        case 'Home':
          event.preventDefault();
          items[0]?.focus();
          break;

        case 'End':
          event.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    },
    [isOpen, onClose, orientation]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  return {
    containerRef,
    containerProps: {
      role: 'menu',
      'aria-orientation': orientation,
    },
    itemProps: (index: number) => ({
      role: 'menuitem',
      tabIndex: index === 0 ? 0 : -1,
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
  };
}
