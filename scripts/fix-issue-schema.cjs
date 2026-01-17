#!/usr/bin/env node
/**
 * Fix Issue JSON Schema
 *
 * Transforms all issue JSON files in martha-workflow to match the expected Issue type schema.
 *
 * Changes:
 * - Moves created_at and updated_at into metadata object
 * - Adds metadata.version as timestamp
 * - Adds missing required fields: quality, time_tracking, links, documentation, github_sync
 * - Renames epic_id to parent_id
 * - Sets assignee to null if not present
 * - Sets priority to "medium" if not present
 * - Sets description to null if not present
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_PATH = '/mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/boards';

// Find all issue JSON files
function findIssueFiles() {
  const command = `find ${BASE_PATH} -name "*.json" -path "*/issues/*"`;
  const output = execSync(command, { encoding: 'utf8' });
  return output.trim().split('\n').filter(line => line.length > 0);
}

// Transform issue to match schema
function transformIssue(oldIssue) {
  const now = Date.now();

  // Start with base fields
  const newIssue = {
    id: oldIssue.id,
    worktree_id: oldIssue.worktree_id || 'martha-dev-v4',
    board_id: oldIssue.board_id,
    type: oldIssue.type,
    title: oldIssue.title,
    description: oldIssue.description || null,
    status: oldIssue.status,
    priority: oldIssue.priority || 'medium',
    parent_id: oldIssue.parent_id || oldIssue.epic_id || null,
    assignee: oldIssue.assignee || null,
    labels: oldIssue.labels || [],
  };

  // Add quality (check if already exists)
  newIssue.quality = oldIssue.quality || {
    coverage: 0,
    checklist: []
  };

  // Add time_tracking (check if already exists)
  newIssue.time_tracking = oldIssue.time_tracking || {
    estimated_hours: oldIssue.story_points ? oldIssue.story_points * 2 : null,
    logged_hours: 0
  };

  // Add links (check if already exists)
  newIssue.links = oldIssue.links || {
    pr: null,
    related_issues: [],
    external: []
  };

  // Ensure external array exists in links
  if (newIssue.links && !newIssue.links.external) {
    newIssue.links.external = [];
  }

  // Add documentation (check if already exists)
  newIssue.documentation = oldIssue.documentation || {
    overview: null,
    technical_spec: null,
    related_docs: []
  };

  // Add github_sync (check if already exists)
  newIssue.github_sync = oldIssue.github_sync || {
    issue_number: null,
    last_synced: null,
    dirty: false
  };

  // Add metadata (move created_at and updated_at here)
  newIssue.metadata = oldIssue.metadata || {
    created_at: oldIssue.created_at || new Date().toISOString(),
    updated_at: oldIssue.updated_at || new Date().toISOString(),
    version: oldIssue.version || now
  };

  return newIssue;
}

// Process a single file
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const oldIssue = JSON.parse(content);

    // Check if already has metadata (already transformed)
    if (oldIssue.metadata && oldIssue.quality && oldIssue.time_tracking &&
        oldIssue.links && oldIssue.documentation && oldIssue.github_sync) {
      console.log(`✓ Already correct: ${filePath}`);
      return { success: true, skipped: true };
    }

    const newIssue = transformIssue(oldIssue);

    // Write back with pretty formatting
    fs.writeFileSync(filePath, JSON.stringify(newIssue, null, 2) + '\n', 'utf8');

    console.log(`✓ Fixed: ${filePath}`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return { success: false, skipped: false, error: error.message };
  }
}

// Main execution
function main() {
  console.log('Finding issue JSON files...\n');

  const files = findIssueFiles();
  console.log(`Found ${files.length} issue files\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const result = processFile(file);
    if (result.success) {
      if (result.skipped) {
        skipped++;
      } else {
        fixed++;
      }
    } else {
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`Total files: ${files.length}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Already correct: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(50));
}

main();
