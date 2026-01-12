/**
 * Repository configuration for worktree management
 *
 * Defines the configuration for different git repositories that Martha can manage.
 */

export interface WorktreeConfig {
  repositoryPath: string;   // Path to the main repository (e.g., '/mnt/data/archie-platform-v2')
  worktreesPath: string;    // Path where worktrees are created (e.g., '/mnt/data/archie-platform-v2-worktrees')
  repositoryName: string;   // Identifier for the repository (e.g., 'archie-platform-v2')
}

/**
 * Available repository configurations
 */
export const REPOSITORIES: Record<string, WorktreeConfig> = {
  martha: {
    repositoryPath: '/mnt/data/martha.dev-v4',
    worktreesPath: '/mnt/data/martha.dev-v4-worktrees',
    repositoryName: 'martha.dev-v4',
  },
  archie: {
    repositoryPath: '/mnt/data/archie-platform-v2',
    worktreesPath: '/mnt/data/archie-platform-v2-worktrees',
    repositoryName: 'archie-platform-v2',
  },
};

/**
 * Default repository configuration (Martha)
 */
export const DEFAULT_CONFIG: WorktreeConfig = REPOSITORIES.martha;

/**
 * Get repository configuration by name
 */
export function getRepositoryConfig(name: string): WorktreeConfig {
  const config = REPOSITORIES[name];
  if (!config) {
    throw new Error(
      `Unknown repository: ${name}. Available repositories: ${Object.keys(REPOSITORIES).join(', ')}`
    );
  }
  return config;
}
