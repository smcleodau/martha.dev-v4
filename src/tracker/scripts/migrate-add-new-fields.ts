#!/usr/bin/env tsx
/**
 * Phase 1.4: Data Migration Script
 * Adds new Phase 1.1 fields to all existing issues
 *
 * This script:
 * 1. Creates a backup of the entire .martha directory
 * 2. Reads all issues from all worktrees and boards
 * 3. Adds new fields with default values
 * 4. Updates issue files
 * 5. Updates indexes with new groupings
 * 6. Logs all changes
 *
 * Run with: npx tsx src/tracker/scripts/migrate-add-new-fields.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { Issue, IssueIndex } from '../types.js';
import {
  readJsonSync,
  writeJsonSync,
  getTrackerPath,
  getWorktreePath,
  getBoardPath,
  getIssuePath,
  fileExists,
  ensureDir,
  listFiles,
} from '../services/file-storage.js';
import {
  loadIndex,
  saveIndex,
  addToIndex,
} from '../services/index-manager.js';
import { listWorktrees } from '../services/worktree-manager.js';

// Migration statistics
interface MigrationStats {
  totalIssues: number;
  migratedIssues: number;
  skippedIssues: number;
  errors: string[];
  worktrees: Map<string, { boards: number; issues: number }>;
}

const stats: MigrationStats = {
  totalIssues: 0,
  migratedIssues: 0,
  skippedIssues: 0,
  errors: [],
  worktrees: new Map(),
};

/**
 * Create a timestamped backup of the .martha directory
 */
function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = getTrackerPath(`../backup-${timestamp}`);
  const marthaDir = getTrackerPath();

  console.log('\n📦 Creating backup...');
  console.log(`  Source: ${marthaDir}`);
  console.log(`  Target: ${backupDir}`);

  try {
    // Use cp -r for recursive copy
    execSync(`cp -r "${marthaDir}" "${backupDir}"`, { stdio: 'inherit' });
    console.log('✅ Backup created successfully\n');
    return backupDir;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw new Error('Failed to create backup. Aborting migration.');
  }
}

/**
 * Check if an issue already has the new fields
 */
function hasNewFields(issue: any): boolean {
  return (
    'initiative_id' in issue &&
    'team_ids' in issue &&
    'story_points' in issue &&
    'epic_id' in issue &&
    'release_id' in issue &&
    'start_date' in issue &&
    'due_date' in issue &&
    'estimated_duration' in issue &&
    'dependencies' in issue &&
    'watchers' in issue &&
    'policy_compliance' in issue &&
    'engagement' in issue
  );
}

/**
 * Migrate a single issue by adding new fields
 */
function migrateIssue(issue: any): Issue {
  // If already migrated, return as-is
  if (hasNewFields(issue)) {
    stats.skippedIssues++;
    return issue as Issue;
  }

  // Infer epic_id from parent_id if parent is an epic
  let epicId: string | null = null;
  if (issue.parent_id) {
    // Check if parent exists and is an epic
    const parentIdUpper = issue.parent_id.toUpperCase();
    if (parentIdUpper.startsWith('EPIC-')) {
      epicId = issue.parent_id;
    }
  }

  // Add new fields with default values
  const migratedIssue: Issue = {
    ...issue,

    // Phase 1.1: Data Model Extensions
    initiative_id: issue.initiative_id ?? null,
    team_ids: issue.team_ids ?? [],
    story_points: issue.story_points ?? null,
    epic_id: issue.epic_id ?? epicId,
    release_id: issue.release_id ?? null,
    start_date: issue.start_date ?? null,
    due_date: issue.due_date ?? null,
    estimated_duration: issue.estimated_duration ?? null,
    dependencies: issue.dependencies ?? {
      blocks: [],
      blocked_by: [],
      related: [],
    },
    watchers: issue.watchers ?? [],
    policy_compliance: issue.policy_compliance ?? null,
    engagement: issue.engagement ?? {
      views: 0,
      total_read_time: 0,
      view_history: [],
    },
  };

  stats.migratedIssues++;
  return migratedIssue;
}

/**
 * Migrate all issues in a board
 */
function migrateBoardIssues(worktreeId: string, boardId: string): number {
  const issuesDir = getBoardPath(worktreeId, boardId, 'issues');

  if (!fileExists(issuesDir)) {
    console.log(`    ⚠️  No issues directory found: ${issuesDir}`);
    return 0;
  }

  const issueFiles = listFiles(issuesDir, '.json');
  console.log(`    📄 Found ${issueFiles.length} issue files`);

  let migrated = 0;
  for (const filename of issueFiles) {
    try {
      const issuePath = path.join(issuesDir, filename);
      const issue = readJsonSync<any>(issuePath);

      stats.totalIssues++;

      const migratedIssue = migrateIssue(issue);

      // Update the issue file
      writeJsonSync(issuePath, migratedIssue);
      migrated++;

      if (migrated % 10 === 0) {
        process.stdout.write(`\r    ✓ Migrated ${migrated}/${issueFiles.length} issues...`);
      }
    } catch (error) {
      const errorMsg = `Failed to migrate ${filename}: ${error}`;
      stats.errors.push(errorMsg);
      console.error(`\n    ❌ ${errorMsg}`);
    }
  }

  if (migrated > 0) {
    console.log(`\r    ✅ Migrated ${migrated}/${issueFiles.length} issues`);
  }

  return migrated;
}

/**
 * Rebuild index with new groupings
 */
function rebuildIndex(worktreeId: string): void {
  console.log(`  🔄 Rebuilding index for ${worktreeId}...`);

  try {
    // Try to load existing index, or create a new one if it doesn't exist
    let index: IssueIndex;
    try {
      index = loadIndex(worktreeId);
    } catch (error) {
      console.log(`  ℹ️  Creating new index for ${worktreeId}...`);
      index = {
        $schema: 'https://martha.dev/schemas/tracker/index.json',
        worktree_id: worktreeId,
        version: 1,
        count: 0,
        next_id: 1,
        issues: {},
        by_status: {},
        by_parent: {},
        by_type: {},
        by_board: {},
        by_initiative: {},
        by_team: {},
        by_epic: {},
        by_release: {},
        by_start_date: {},
        by_due_date: {},
        by_assignee: {},
        updated_at: new Date().toISOString(),
      };
    }

    // Initialize new index groupings if they don't exist
    if (!index.by_initiative) index.by_initiative = {};
    if (!index.by_team) index.by_team = {};
    if (!index.by_epic) index.by_epic = {};
    if (!index.by_release) index.by_release = {};
    if (!index.by_start_date) index.by_start_date = {};
    if (!index.by_due_date) index.by_due_date = {};
    if (!index.by_assignee) index.by_assignee = {};

    // Clear all groupings and rebuild from scratch
    index.by_initiative = {};
    index.by_team = {};
    index.by_epic = {};
    index.by_release = {};
    index.by_start_date = {};
    index.by_due_date = {};
    index.by_assignee = {};
    index.by_status = {};
    index.by_type = {};
    index.by_parent = {};
    index.by_board = {};

    // Rebuild from all boards
    const worktreeConfig = readJsonSync<any>(getWorktreePath(worktreeId, 'config.json'));
    const boards = worktreeConfig.boards || [];

    for (const boardId of boards) {
      const issuesDir = getBoardPath(worktreeId, boardId, 'issues');
      if (!fileExists(issuesDir)) continue;

      const issueFiles = listFiles(issuesDir, '.json');
      for (const filename of issueFiles) {
        try {
          const issuePath = path.join(issuesDir, filename);
          const issue = readJsonSync<Issue>(issuePath);

          // Use addToIndex to rebuild all groupings
          addToIndex(index, issue);
        } catch (error) {
          console.error(`    ⚠️  Failed to index ${filename}:`, error);
        }
      }
    }

    // Save the rebuilt index
    saveIndex(worktreeId, index);
    console.log(`  ✅ Index rebuilt with ${index.count} issues`);
  } catch (error) {
    const errorMsg = `Failed to rebuild index for ${worktreeId}: ${error}`;
    stats.errors.push(errorMsg);
    console.error(`  ❌ ${errorMsg}`);
  }
}

/**
 * Migrate a single worktree
 */
function migrateWorktree(worktreeId: string): void {
  console.log(`\n📂 Migrating worktree: ${worktreeId}`);

  try {
    const configPath = getWorktreePath(worktreeId, 'config.json');
    if (!fileExists(configPath)) {
      console.log(`  ⚠️  No config found, skipping`);
      return;
    }

    const config = readJsonSync<any>(configPath);
    const boards = config.boards || [];

    console.log(`  📋 Found ${boards.length} boards`);

    let totalBoardIssues = 0;
    for (const boardId of boards) {
      console.log(`\n  📊 Board: ${boardId}`);
      const issuesCount = migrateBoardIssues(worktreeId, boardId);
      totalBoardIssues += issuesCount;
    }

    // Record stats
    stats.worktrees.set(worktreeId, {
      boards: boards.length,
      issues: totalBoardIssues,
    });

    // Rebuild index with new groupings
    rebuildIndex(worktreeId);

    console.log(`\n  ✅ Worktree complete: ${totalBoardIssues} issues migrated`);
  } catch (error) {
    const errorMsg = `Failed to migrate worktree ${worktreeId}: ${error}`;
    stats.errors.push(errorMsg);
    console.error(`  ❌ ${errorMsg}`);
  }
}

/**
 * Validate migration results
 */
function validateMigration(): boolean {
  console.log('\n🔍 Validating migration...\n');

  let valid = true;
  const worktrees = listWorktrees();

  for (const worktree of worktrees) {
    const config = readJsonSync<any>(getWorktreePath(worktree.id, 'config.json'));
    const boards = config.boards || [];

    for (const boardId of boards) {
      const issuesDir = getBoardPath(worktree.id, boardId, 'issues');
      if (!fileExists(issuesDir)) continue;

      const issueFiles = listFiles(issuesDir, '.json');
      for (const filename of issueFiles) {
        try {
          const issuePath = path.join(issuesDir, filename);
          const issue = readJsonSync<any>(issuePath);

          if (!hasNewFields(issue)) {
            console.error(`  ❌ Issue ${issue.id} is missing new fields`);
            valid = false;
          }
        } catch (error) {
          console.error(`  ❌ Failed to validate ${filename}:`, error);
          valid = false;
        }
      }
    }
  }

  if (valid) {
    console.log('  ✅ All issues have been migrated successfully');
  } else {
    console.log('  ❌ Some issues are missing new fields');
  }

  return valid;
}

/**
 * Print migration summary
 */
function printSummary(backupDir: string): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📦 Backup location: ${backupDir}`);
  console.log(`\n📈 Statistics:`);
  console.log(`  Total issues found:     ${stats.totalIssues}`);
  console.log(`  Issues migrated:        ${stats.migratedIssues}`);
  console.log(`  Issues already current: ${stats.skippedIssues}`);
  console.log(`  Errors:                 ${stats.errors.length}`);

  console.log(`\n🗂️  Worktrees processed: ${stats.worktrees.size}`);
  for (const [worktreeId, data] of stats.worktrees.entries()) {
    console.log(`  - ${worktreeId}: ${data.boards} boards, ${data.issues} issues`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered:`);
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Phase 1.4: Data Migration Script                        ║');
  console.log('║   Adding Phase 1.1 fields to all existing issues          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Step 1: Create backup
  const backupDir = createBackup();

  // Step 2: Get all worktrees
  console.log('🔍 Discovering worktrees...\n');
  const worktrees = listWorktrees();
  console.log(`Found ${worktrees.length} worktrees:\n`);
  for (const wt of worktrees) {
    console.log(`  - ${wt.id} (${wt.display_name})`);
  }

  // Step 3: Migrate each worktree
  for (const worktree of worktrees) {
    migrateWorktree(worktree.id);
  }

  // Step 4: Validate migration
  const isValid = validateMigration();

  // Step 5: Print summary
  printSummary(backupDir);

  if (!isValid || stats.errors.length > 0) {
    console.log('\n⚠️  Migration completed with errors. Review the summary above.');
    console.log(`💾 Backup available at: ${backupDir}`);
    console.log('🔄 To rollback, run: npx tsx src/tracker/scripts/rollback-migration.ts');
    process.exit(1);
  } else {
    console.log('\n✅ Migration completed successfully!');
    console.log(`💾 Backup available at: ${backupDir}`);
    process.exit(0);
  }
}

// Run migration
main().catch((error) => {
  console.error('\n❌ Fatal error during migration:', error);
  console.error('\n🔄 Check your backup and run rollback if needed.');
  process.exit(1);
});
