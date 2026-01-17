/**
 * ID Generator Service
 * Generates random, URL-safe IDs for boards
 */

/**
 * Generate a random alphanumeric ID
 * @param length Length of the ID (default: 6)
 * @param uppercase Whether to use uppercase letters (default: true)
 * @returns Random ID string
 */
export function generateRandomId(length: number = 6, uppercase: boolean = true): string {
  const chars = uppercase
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    : 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    id += chars[randomIndex];
  }

  return id;
}

/**
 * Generate a board ID
 * Format: 6 uppercase alphanumeric characters
 * Example: B3K7M9, XJ2P4Q
 */
export function generateBoardId(): string {
  return generateRandomId(6, true);
}

/**
 * Generate a worktree ID
 * Note: Worktrees should use human-readable names (e.g., 'communications-service')
 * This function is kept for backward compatibility but not recommended for use
 */
export function generateWorktreeId(): string {
  return generateRandomId(8, false);
}

/**
 * Generate an issue ID with prefix
 * Format: MTH- + 3 digit number
 * Example: MTH-001, MTH-002, etc.
 *
 * Note: This maintains compatibility with existing issue ID format
 */
export function generateIssueId(nextNumber: number): string {
  return `MTH-${String(nextNumber).padStart(3, '0')}`;
}
