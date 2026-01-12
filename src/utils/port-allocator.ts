import { getWorktreeRepository } from '../database/repositories/worktree-repository.js';

/**
 * Port configuration for a worktree
 */
export interface PortConfig {
  service: number;
  redis: number;
  mcp: number;
  metrics: number;
  dashboard: number;
}

/**
 * Find the next available port index
 * Port indices follow the formula: BASE_PORT = INDEX × 1000
 *
 * Reserved indices:
 * - Index 1 (1000-1004): main-develop (production)
 * - Index 20 (20000-20004): Martha infrastructure
 *
 * Available range: 2-19, 21-50
 */
export async function findNextAvailableIndex(): Promise<number> {
  // Query database for all allocated indices
  const worktrees = await getWorktreeRepository().findAll();
  const usedIndices = new Set(worktrees.map(wt => wt.index));

  // Reserved indices
  const reserved = new Set([1, 20]);

  // Find first available index in range 2-50
  for (let i = 2; i <= 50; i++) {
    if (!usedIndices.has(i) && !reserved.has(i)) {
      return i;
    }
  }

  throw new Error('No available port indices (range 2-50 exhausted)');
}

/**
 * Calculate port configuration for a given index
 * Formula: BASE_PORT = INDEX × 1000
 *
 * Port offsets:
 * - +0: PostgreSQL/Service (5432)
 * - +1: Redis (6379)
 * - +2: API/MCP (8000)
 * - +3: Metrics (varies)
 * - +4: Dashboard/Frontend (varies)
 */
export function calculatePorts(index: number): PortConfig {
  const basePort = index * 1000;
  return {
    service: basePort,
    redis: basePort + 1,
    mcp: basePort + 2,
    metrics: basePort + 3,
    dashboard: basePort + 4,
  };
}

/**
 * Validate that an index is available
 */
export async function isIndexAvailable(index: number): Promise<boolean> {
  // Check reserved indices
  const reserved = [1, 20];
  if (reserved.includes(index)) {
    return false;
  }

  // Check database
  const worktrees = await getWorktreeRepository().findAll();
  const usedIndices = worktrees.map(wt => wt.index);

  return !usedIndices.includes(index);
}

/**
 * Get all allocated port indices
 */
export async function getAllocatedIndices(): Promise<number[]> {
  const worktrees = await getWorktreeRepository().findAll();
  return worktrees.map(wt => wt.index).sort((a, b) => a - b);
}
