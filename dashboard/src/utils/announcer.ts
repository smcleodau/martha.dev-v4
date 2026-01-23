/**
 * Screen Reader Announcer Utility
 *
 * Provides accessible, non-intrusive announcements to screen readers
 * using ARIA live regions for dynamic content changes.
 *
 * WCAG 2.1 AA Compliance:
 * - 4.1.3 Status Messages (Level AA)
 */

type PolitenessLevel = 'polite' | 'assertive';

class ScreenReaderAnnouncer {
  private liveRegion: HTMLDivElement | null = null;
  private timeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeLiveRegion();
    }
  }

  /**
   * Initialize the ARIA live region for announcements
   */
  private initializeLiveRegion(): void {
    // Create live region if it doesn't exist
    if (!this.liveRegion) {
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('role', 'status');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';

      // Style to hide visually but keep accessible to screen readers
      Object.assign(this.liveRegion.style, {
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
      });

      document.body.appendChild(this.liveRegion);
    }
  }

  /**
   * Announce a message to screen readers
   *
   * @param message - The message to announce
   * @param politeness - How assertive the announcement should be
   */
  announce(message: string, politeness: PolitenessLevel = 'polite'): void {
    if (!this.liveRegion) {
      this.initializeLiveRegion();
    }

    if (!this.liveRegion) return;

    // Clear any pending announcements
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Update politeness level
    this.liveRegion.setAttribute('aria-live', politeness);

    // Clear and set new message
    this.liveRegion.textContent = '';

    // Use setTimeout to ensure screen readers pick up the change
    this.timeout = setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }, 100);
  }

  /**
   * Clear the current announcement
   */
  clear(): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = '';
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  /**
   * Remove the live region from DOM (cleanup)
   */
  destroy(): void {
    this.clear();
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

// Singleton instance
const announcer = new ScreenReaderAnnouncer();

/**
 * Announce a message to screen readers
 *
 * @example
 * announce('Issue moved to In Progress');
 * announce('Error: Failed to save changes', 'assertive');
 */
export function announce(message: string, politeness: PolitenessLevel = 'polite'): void {
  announcer.announce(message, politeness);
}

/**
 * Clear the current announcement
 */
export function clearAnnouncement(): void {
  announcer.clear();
}

/**
 * Announce issue status changes
 */
export function announceIssueStatusChange(issueId: string, oldStatus: string, newStatus: string): void {
  announce(`Issue ${issueId} moved from ${oldStatus} to ${newStatus}`);
}

/**
 * Announce issue creation
 */
export function announceIssueCreated(issueId: string, type: string): void {
  announce(`New ${type} created: ${issueId}`);
}

/**
 * Announce issue update
 */
export function announceIssueUpdated(issueId: string, field: string): void {
  announce(`Issue ${issueId} ${field} updated`);
}

/**
 * Announce filter changes
 */
export function announceFilterApplied(filterType: string, value: string): void {
  announce(`Filter applied: ${filterType} - ${value}`);
}

/**
 * Announce filter cleared
 */
export function announceFiltersCleared(): void {
  announce('All filters cleared');
}

/**
 * Announce search results
 */
export function announceSearchResults(count: number): void {
  if (count === 0) {
    announce('No results found');
  } else if (count === 1) {
    announce('1 result found');
  } else {
    announce(`${count} results found`);
  }
}

/**
 * Announce loading state
 */
export function announceLoading(itemType: string): void {
  announce(`Loading ${itemType}`, 'polite');
}

/**
 * Announce loaded state
 */
export function announceLoaded(itemType: string): void {
  announce(`${itemType} loaded`, 'polite');
}

/**
 * Announce error
 */
export function announceError(message: string): void {
  announce(`Error: ${message}`, 'assertive');
}

/**
 * Announce success
 */
export function announceSuccess(message: string): void {
  announce(message, 'polite');
}

/**
 * Announce navigation
 */
export function announceNavigation(destination: string): void {
  announce(`Navigated to ${destination}`);
}

/**
 * Announce modal/dialog opened
 */
export function announceModalOpened(title: string): void {
  announce(`${title} dialog opened`);
}

/**
 * Announce modal/dialog closed
 */
export function announceModalClosed(title: string): void {
  announce(`${title} dialog closed`);
}

export default announcer;
