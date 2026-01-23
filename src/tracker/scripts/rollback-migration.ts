#!/usr/bin/env tsx
/**
 * Migration Rollback Script
 * Restores the .martha directory from the most recent backup
 *
 * This script:
 * 1. Finds the most recent backup directory
 * 2. Verifies backup integrity
 * 3. Restores the .martha directory from backup
 * 4. Validates restoration
 *
 * Run with: npx tsx src/tracker/scripts/rollback-migration.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import * as readline from 'node:readline';
import { getTrackerPath } from '../services/file-storage.js';

/**
 * Find the most recent backup directory
 */
function findLatestBackup(): string | null {
  const marthaDir = getTrackerPath();
  const parentDir = path.dirname(marthaDir);

  try {
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    const backups = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map((entry) => ({
        name: entry.name,
        path: path.join(parentDir, entry.name),
        // Extract timestamp from backup-YYYY-MM-DDTHH-MM-SS-sssZ format
        timestamp: entry.name.replace('backup-', ''),
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Sort by timestamp descending

    if (backups.length === 0) {
      return null;
    }

    return backups[0].path;
  } catch (error) {
    console.error('Error finding backups:', error);
    return null;
  }
}

/**
 * Verify backup directory structure
 */
function verifyBackup(backupDir: string): boolean {
  console.log('🔍 Verifying backup integrity...\n');

  try {
    // Check for essential directories and files
    const essentialPaths = [
      'worktrees',
      'config.json',
    ];

    for (const essentialPath of essentialPaths) {
      const fullPath = path.join(backupDir, essentialPath);
      if (!fs.existsSync(fullPath)) {
        console.error(`  ❌ Missing essential path: ${essentialPath}`);
        return false;
      }
    }

    // Count worktrees
    const worktreesDir = path.join(backupDir, 'worktrees');
    const worktrees = fs.readdirSync(worktreesDir).filter((name) => {
      const configPath = path.join(worktreesDir, name, 'config.json');
      return fs.existsSync(configPath);
    });

    console.log(`  ✅ Found ${worktrees.length} worktrees in backup`);
    console.log('  ✅ Backup appears valid\n');

    return true;
  } catch (error) {
    console.error('  ❌ Backup verification failed:', error);
    return false;
  }
}

/**
 * Restore from backup
 */
function restore(backupDir: string): boolean {
  const marthaDir = getTrackerPath();

  console.log('🔄 Starting restoration...\n');
  console.log(`  Source: ${backupDir}`);
  console.log(`  Target: ${marthaDir}\n`);

  try {
    // Create a safety backup of the current state
    const safetyBackupDir = `${marthaDir}.before-rollback-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    console.log(`  📦 Creating safety backup: ${safetyBackupDir}`);
    execSync(`cp -r "${marthaDir}" "${safetyBackupDir}"`, { stdio: 'inherit' });
    console.log('  ✅ Safety backup created\n');

    // Remove current .martha directory
    console.log(`  🗑️  Removing current directory: ${marthaDir}`);
    execSync(`rm -rf "${marthaDir}"`, { stdio: 'inherit' });
    console.log('  ✅ Current directory removed\n');

    // Restore from backup
    console.log(`  📥 Restoring from backup...`);
    execSync(`cp -r "${backupDir}" "${marthaDir}"`, { stdio: 'inherit' });
    console.log('  ✅ Restoration complete\n');

    return true;
  } catch (error) {
    console.error('  ❌ Restoration failed:', error);
    return false;
  }
}

/**
 * Validate restoration
 */
function validateRestoration(): boolean {
  console.log('🔍 Validating restoration...\n');

  try {
    const marthaDir = getTrackerPath();

    // Check for essential files
    const configPath = path.join(marthaDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      console.error('  ❌ config.json not found');
      return false;
    }

    // Check worktrees directory
    const worktreesDir = path.join(marthaDir, 'worktrees');
    if (!fs.existsSync(worktreesDir)) {
      console.error('  ❌ worktrees directory not found');
      return false;
    }

    // Count worktrees
    const worktrees = fs.readdirSync(worktreesDir).filter((name) => {
      const configPath = path.join(worktreesDir, name, 'config.json');
      return fs.existsSync(configPath);
    });

    console.log(`  ✅ Found ${worktrees.length} worktrees`);
    console.log('  ✅ Restoration validated\n');

    return true;
  } catch (error) {
    console.error('  ❌ Validation failed:', error);
    return false;
  }
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Main rollback function
 */
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Migration Rollback Script                                ║');
  console.log('║   Restore .martha directory from backup                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Find latest backup
  console.log('🔍 Searching for backups...\n');
  const latestBackup = findLatestBackup();

  if (!latestBackup) {
    console.error('❌ No backup directories found.');
    console.error('   Backups should be in the parent directory with names like "backup-YYYY-MM-DD..."');
    process.exit(1);
  }

  console.log(`📦 Latest backup found: ${latestBackup}\n`);

  // Step 2: Verify backup
  if (!verifyBackup(latestBackup)) {
    console.error('❌ Backup verification failed. Aborting rollback.');
    process.exit(1);
  }

  // Step 3: Confirm with user
  console.log('⚠️  WARNING: This will replace the current .martha directory with the backup.');
  console.log('   A safety backup of the current state will be created first.\n');

  const confirmed = await promptConfirmation('Do you want to proceed with the rollback?');

  if (!confirmed) {
    console.log('\n❌ Rollback cancelled by user.');
    process.exit(0);
  }

  console.log('');

  // Step 4: Restore from backup
  if (!restore(latestBackup)) {
    console.error('❌ Restoration failed. Check the error messages above.');
    process.exit(1);
  }

  // Step 5: Validate restoration
  if (!validateRestoration()) {
    console.error('❌ Restoration validation failed.');
    console.error('   Your data may be in an inconsistent state.');
    process.exit(1);
  }

  // Success
  console.log('═'.repeat(60));
  console.log('✅ ROLLBACK COMPLETED SUCCESSFULLY');
  console.log('═'.repeat(60));
  console.log(`\n📦 Restored from: ${latestBackup}`);
  console.log('💾 Safety backup created before rollback');
  console.log('');
  process.exit(0);
}

// Run rollback
main().catch((error) => {
  console.error('\n❌ Fatal error during rollback:', error);
  process.exit(1);
});
