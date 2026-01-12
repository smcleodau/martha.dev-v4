import { promises as fs } from 'fs';
import * as path from 'path';
import type { PortConfig } from './port-allocator.js';

/**
 * Options for generating .env.local file
 */
export interface EnvGeneratorOptions {
  worktreePath: string;
  worktreeName: string;
  index: number;
  ports: PortConfig;
}

/**
 * Generate .env.local file for a worktree from template
 *
 * Reads the template from config/.env.worktree.example and replaces
 * all placeholders with actual values for the new worktree.
 *
 * Replacements:
 * - WORKTREE_INDEX
 * - WORKTREE_NAME
 * - COMPOSE_PROJECT_NAME (archie-{worktree_name})
 * - All port numbers (7xxx → actual port range)
 * - Database names and URLs
 * - Redis URLs
 * - Frontend URLs
 * - Temporal task queue names
 */
export async function generateEnvFile(options: EnvGeneratorOptions): Promise<void> {
  const { worktreePath, worktreeName, index, ports } = options;

  // Read template
  const templatePath = '/mnt/data/martha.dev-v4/config/.env.worktree.example';
  const template = await fs.readFile(templatePath, 'utf-8');

  // Calculate database name (replace hyphens with underscores)
  const dbName = `archie_${worktreeName.replace(/-/g, '_')}_dev`;

  // Perform replacements
  let content = template;

  // Header replacements (Index: 7 → Index: N, python-310-work → worktree_name)
  content = content.replace(/# Worktree: python-310-work/, `# Worktree: ${worktreeName}`);
  content = content.replace(/Index: 7/, `Index: ${index}`);
  content = content.replace(/Port Range: 7000-7004/, `Port Range: ${ports.service}-${ports.dashboard}`);

  // Environment variable replacements
  content = content.replace(/WORKTREE_INDEX=7/, `WORKTREE_INDEX=${index}`);
  content = content.replace(/WORKTREE_NAME=python-310-work/, `WORKTREE_NAME=${worktreeName}`);
  content = content.replace(
    /COMPOSE_PROJECT_NAME=archie-python-310-work/,
    `COMPOSE_PROJECT_NAME=archie-${worktreeName}`
  );

  // Port replacements (7xxx → actual port range)
  content = content.replace(/Port Configuration \(7xxx range\)/, `Port Configuration (${index}xxx range)`);
  content = content.replace(/POSTGRES_PORT=7000/, `POSTGRES_PORT=${ports.service}`);
  content = content.replace(/REDIS_PORT=7001/, `REDIS_PORT=${ports.redis}`);
  content = content.replace(/API_PORT=7002/, `API_PORT=${ports.mcp}`);
  content = content.replace(/PGADMIN_PORT=7003/, `PGADMIN_PORT=${ports.metrics}`);
  content = content.replace(/FRONTEND_PORT=7004/, `FRONTEND_PORT=${ports.dashboard}`);

  // Database replacements
  content = content.replace(/POSTGRES_DB=archie_python_310_work_dev/, `POSTGRES_DB=${dbName}`);
  content = content.replace(
    /DATABASE_URL=postgresql:\/\/archie_user:archie_dev_password@localhost:7000\/archie_python_310_work_dev/,
    `DATABASE_URL=postgresql://archie_user:archie_dev_password@localhost:${ports.service}/${dbName}`
  );
  content = content.replace(
    /DATABASE_URL_INTERNAL=postgresql:\/\/archie_user:archie_dev_password@postgres:5432\/archie_python_310_work_dev/,
    `DATABASE_URL_INTERNAL=postgresql://archie_user:archie_dev_password@postgres:5432/${dbName}`
  );

  // Redis replacements
  content = content.replace(
    /REDIS_URL=redis:\/\/:archie_dev_redis_password@localhost:7001/,
    `REDIS_URL=redis://:archie_dev_redis_password@localhost:${ports.redis}`
  );

  // Frontend URL replacement
  content = content.replace(/FRONTEND_URL=http:\/\/localhost:7004/, `FRONTEND_URL=http://localhost:${ports.dashboard}`);

  // Temporal task queue replacement
  content = content.replace(/TEMPORAL_TASK_QUEUE=archie-python-310-work/, `TEMPORAL_TASK_QUEUE=archie-${worktreeName}`);

  // Write to worktree/.env.local
  const envPath = path.join(worktreePath, '.env.local');
  await fs.writeFile(envPath, content, 'utf-8');
}

/**
 * Generate .worktree-config.json file
 *
 * This file is used by the worktree monitoring agent to understand
 * the worktree configuration without relying on .env.local parsing.
 */
export async function generateWorktreeConfig(options: EnvGeneratorOptions & { epicNumber?: number }): Promise<void> {
  const { worktreePath, worktreeName, index, ports, epicNumber } = options;

  const config = {
    name: worktreeName,
    index,
    branch: epicNumber ? `epic-${epicNumber}` : 'develop',
    ports,
    epic_number: epicNumber,
    created_at: new Date().toISOString(),
    monitoring_service_url: 'ws://localhost:20000',
  };

  const configPath = path.join(worktreePath, '.worktree-config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
