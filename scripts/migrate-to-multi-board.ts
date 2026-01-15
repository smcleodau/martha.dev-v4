#!/usr/bin/env tsx

/**
 * Migration Script: Single Board → Multi-Board Structure
 *
 * Migrates existing .martha directory from single-board to multi-board worktree structure:
 * - Creates default worktree and board
 * - Moves issues to worktree/board structure
 * - Updates indices with board_id references
 * - Preserves all existing data
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Configuration
const MARTHA_ROOT = process.env.MARTHA_DIR || '/mnt/data/martha-workflow/.martha';
const DEFAULT_WORKTREE_ID = 'default';
const DEFAULT_BOARD_ID = 'default';
const DRY_RUN = process.argv.includes('--dry-run');

console.log('=== Martha Tracker Migration: Single Board → Multi-Board ===\n');
console.log(`Martha Root: ${MARTHA_ROOT}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}\n`);

// Utility functions
function readJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

function writeJson<T>(filePath: string, data: T): void {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would write: ${filePath}`);
    return;
  }
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function moveFile(oldPath: string, newPath: string): void {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would move: ${oldPath} → ${newPath}`);
    return;
  }
  const dir = path.dirname(newPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(oldPath, newPath);
}

function copyFile(oldPath: string, newPath: string): void {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would copy: ${oldPath} → ${newPath}`);
    return;
  }
  const dir = path.dirname(newPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(oldPath, newPath);
}

// Step 1: Check if migration is needed
console.log('[Step 1] Checking if migration is needed...');
const oldBoardPath = path.join(MARTHA_ROOT, 'board', 'state.json');
const newWorktreePath = path.join(MARTHA_ROOT, 'worktrees', DEFAULT_WORKTREE_ID);
const newBoardPath = path.join(newWorktreePath, 'boards', DEFAULT_BOARD_ID, 'state.json');

if (fs.existsSync(newBoardPath)) {
  console.log('✓ Migration already completed (multi-board structure detected)');
  console.log(`  Found: ${newBoardPath}`);
  process.exit(0);
}

if (!fs.existsSync(oldBoardPath)) {
  console.log('✗ No existing board found at:', oldBoardPath);
  console.log('  Cannot migrate. Please ensure .martha directory exists.');
  process.exit(1);
}

console.log('✓ Found old single-board structure, proceeding with migration...\n');

// Step 2: Create default worktree config
console.log('[Step 2] Creating default worktree configuration...');
const worktreeConfig = {
  id: DEFAULT_WORKTREE_ID,
  name: DEFAULT_WORKTREE_ID,
  display_name: 'Default Worktree',
  description: 'Migrated from single-board structure',
  path: MARTHA_ROOT,
  boards: [DEFAULT_BOARD_ID],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const worktreeConfigPath = path.join(newWorktreePath, 'config.json');
writeJson(worktreeConfigPath, worktreeConfig);
console.log(`✓ Created worktree config: ${worktreeConfigPath}\n`);

// Step 3: Migrate board state
console.log('[Step 3] Migrating board state...');
const oldBoard = readJson<any>(oldBoardPath);

// Enhance board state with new fields
const newBoard = {
  ...oldBoard,
  id: DEFAULT_BOARD_ID,
  worktree_id: DEFAULT_WORKTREE_ID,
  name: 'Default Board',
  description: 'Migrated from single-board structure',
  created_at: oldBoard.updated_at || new Date().toISOString(),
};

writeJson(newBoardPath, newBoard);
console.log(`✓ Migrated board state: ${oldBoardPath} → ${newBoardPath}\n`);

// Step 4: Migrate issues
console.log('[Step 4] Migrating issues...');
const oldIssuesDir = path.join(MARTHA_ROOT, 'issues');
const newIssuesDir = path.join(newWorktreePath, 'boards', DEFAULT_BOARD_ID, 'issues');

if (!fs.existsSync(oldIssuesDir)) {
  console.log('  No issues directory found, skipping issue migration\n');
} else {
  const issueFiles = fs.readdirSync(oldIssuesDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  console.log(`  Found ${issueFiles.length} issue files`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const issueFile of issueFiles) {
    try {
      const oldIssuePath = path.join(oldIssuesDir, issueFile);
      const issue = readJson<any>(oldIssuePath);

      // Add new fields
      issue.worktree_id = DEFAULT_WORKTREE_ID;
      issue.board_id = DEFAULT_BOARD_ID;

      // Add documentation links if not present
      if (!issue.documentation) {
        issue.documentation = {
          overview: null,
          technical_spec: null,
          related_docs: [],
        };
      }

      const newIssuePath = path.join(newIssuesDir, issueFile);
      writeJson(newIssuePath, issue);
      migratedCount++;
    } catch (error) {
      console.error(`  ✗ Error migrating ${issueFile}:`, error);
      errorCount++;
    }
  }

  console.log(`✓ Migrated ${migratedCount} issues (${errorCount} errors)\n`);
}

// Step 5: Migrate issue index
console.log('[Step 5] Migrating issue index...');
const oldIndexPath = path.join(oldIssuesDir, 'index.json');
const newIndexPath = path.join(newWorktreePath, 'index.json');

if (fs.existsSync(oldIndexPath)) {
  const oldIndex = readJson<any>(oldIndexPath);

  // Update index with new fields
  const newIndex = {
    ...oldIndex,
    worktree_id: DEFAULT_WORKTREE_ID,
    by_board: {
      [DEFAULT_BOARD_ID]: Object.keys(oldIndex.issues || {}),
    },
    updated_at: new Date().toISOString(),
  };

  // Update each index entry with board_id
  if (newIndex.issues) {
    Object.keys(newIndex.issues).forEach(issueId => {
      newIndex.issues[issueId].board_id = DEFAULT_BOARD_ID;
    });
  }

  writeJson(newIndexPath, newIndex);
  console.log(`✓ Migrated index: ${oldIndexPath} → ${newIndexPath}\n`);
} else {
  console.log('  No index found, skipping index migration\n');
}

// Step 6: Migrate comments (move to worktree level)
console.log('[Step 6] Migrating comments...');
const oldCommentsDir = path.join(MARTHA_ROOT, 'comments');
const newCommentsDir = path.join(newWorktreePath, 'comments');

if (fs.existsSync(oldCommentsDir)) {
  const commentDirs = fs.readdirSync(oldCommentsDir).filter(f => {
    return fs.statSync(path.join(oldCommentsDir, f)).isDirectory();
  });

  console.log(`  Found ${commentDirs.length} comment directories`);

  for (const issueDir of commentDirs) {
    const oldPath = path.join(oldCommentsDir, issueDir);
    const newPath = path.join(newCommentsDir, issueDir);

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would copy: ${oldPath} → ${newPath}`);
    } else {
      fs.mkdirSync(newPath, { recursive: true });
      const files = fs.readdirSync(oldPath);
      files.forEach(file => {
        fs.copyFileSync(path.join(oldPath, file), path.join(newPath, file));
      });
    }
  }

  console.log(`✓ Migrated ${commentDirs.length} comment directories\n`);
} else {
  console.log('  No comments found, skipping comment migration\n');
}

// Step 7: Migrate agents (move to worktree level)
console.log('[Step 7] Migrating agent sessions...');
const oldAgentsDir = path.join(MARTHA_ROOT, 'agents');
const newAgentsDir = path.join(newWorktreePath, 'agents');

if (fs.existsSync(oldAgentsDir)) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would copy: ${oldAgentsDir} → ${newAgentsDir}`);
  } else {
    fs.mkdirSync(newAgentsDir, { recursive: true });

    // Copy sessions directory
    const sessionsDir = path.join(oldAgentsDir, 'sessions');
    if (fs.existsSync(sessionsDir)) {
      const newSessionsDir = path.join(newAgentsDir, 'sessions');
      fs.mkdirSync(newSessionsDir, { recursive: true });

      const files = fs.readdirSync(sessionsDir);
      files.forEach(file => {
        fs.copyFileSync(path.join(sessionsDir, file), path.join(newSessionsDir, file));
      });
    }
  }

  console.log('✓ Migrated agent sessions\n');
} else {
  console.log('  No agent sessions found, skipping\n');
}

// Step 8: Create backup of old structure
if (!DRY_RUN) {
  console.log('[Step 8] Creating backup of old structure...');
  const backupDir = path.join(MARTHA_ROOT, '_backup_pre_multi_board');
  fs.mkdirSync(backupDir, { recursive: true });

  // Backup old files
  const filesToBackup = [
    { src: oldBoardPath, dest: path.join(backupDir, 'board_state.json') },
    { src: oldIndexPath, dest: path.join(backupDir, 'issues_index.json') },
  ];

  filesToBackup.forEach(({ src, dest }) => {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Backed up: ${path.basename(src)}`);
    }
  });

  console.log(`✓ Backup created at: ${backupDir}\n`);
}

// Summary
console.log('=== Migration Complete ===\n');
console.log('Summary:');
console.log(`  Worktree: ${DEFAULT_WORKTREE_ID}`);
console.log(`  Board: ${DEFAULT_BOARD_ID}`);
console.log(`  Location: ${newWorktreePath}`);
console.log('');
console.log('Next steps:');
console.log('  1. Rebuild the service: npm run build');
console.log('  2. Restart the service: npm start');
console.log('  3. Verify in UI: http://localhost:20000/tracker');
console.log('');

if (DRY_RUN) {
  console.log('This was a DRY RUN. No files were modified.');
  console.log('Run without --dry-run to perform actual migration.');
} else {
  console.log('Migration completed successfully!');
  console.log('Old structure backed up to: ' + path.join(MARTHA_ROOT, '_backup_pre_multi_board'));
}
