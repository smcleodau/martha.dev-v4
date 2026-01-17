#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ISSUES_DIR = '/mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/issues';
const STATE_FILE = '/mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/boards/phase1-temporal-foundation/state.json';
const BOARD_ID = 'phase1-temporal-foundation';
const WORKTREE_ID = 'martha-dev-v4';

// Parse markdown frontmatter
function parseFrontmatter(content) {
  const lines = content.split('\n');
  const frontmatter = {};
  let inFrontmatter = false;
  let bodyStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        bodyStartIndex = i + 1;
        break;
      }
      continue;
    }

    if (inFrontmatter) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value = match[2];

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map(v => v.trim());
        }
        // Parse numbers
        else if (!isNaN(value) && value !== '') {
          value = Number(value);
        }
        // Remove quotes from strings
        else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        frontmatter[key] = value;
      }
    }
  }

  // Extract body (everything after frontmatter)
  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return { frontmatter, body };
}

// Convert markdown to JSON
function convertMarkdownToJson(mdFilePath) {
  const content = fs.readFileSync(mdFilePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  const id = frontmatter.id;
  const type = id.startsWith('EPIC-') ? 'epic' : 'task';

  // Determine updated_at (use current time for completed issues)
  const updatedAt = new Date().toISOString();

  const jsonIssue = {
    id: frontmatter.id,
    title: frontmatter.title,
    description: body,
    status: 'done',
    type: type,
    story_points: frontmatter.story_points,
    labels: frontmatter.labels || [],
    created_at: frontmatter.created_at,
    updated_at: updatedAt,
    board_id: BOARD_ID,
    worktree_id: WORKTREE_ID
  };

  // Add epic_id for tasks
  if (frontmatter.epic_id) {
    jsonIssue.epic_id = frontmatter.epic_id;
  }

  return jsonIssue;
}

// Main conversion function
function convertAllIssues() {
  const files = fs.readdirSync(ISSUES_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));
  const allIssueIds = [];

  console.log(`Found ${mdFiles.length} markdown files to convert`);

  mdFiles.forEach(mdFile => {
    const mdPath = path.join(ISSUES_DIR, mdFile);
    const jsonFile = mdFile.replace('.md', '.json');
    const jsonPath = path.join(ISSUES_DIR, jsonFile);

    try {
      const jsonIssue = convertMarkdownToJson(mdPath);
      fs.writeFileSync(jsonPath, JSON.stringify(jsonIssue, null, 2) + '\n');
      allIssueIds.push(jsonIssue.id);
      console.log(`✓ Converted ${mdFile} -> ${jsonFile}`);
    } catch (error) {
      console.error(`✗ Failed to convert ${mdFile}:`, error.message);
    }
  });

  return allIssueIds;
}

// Update board state
function updateBoardState(issueIds) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));

  // Sort issue IDs: EPICs first, then TASKs in natural order
  const sortedIds = issueIds.sort((a, b) => {
    const aIsEpic = a.startsWith('EPIC-');
    const bIsEpic = b.startsWith('EPIC-');

    if (aIsEpic && !bIsEpic) return -1;
    if (!aIsEpic && bIsEpic) return 1;

    // Natural sort for numbers
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Clear all columns and put all issues in done
  state.columns.forEach(column => {
    if (column.id === 'done') {
      column.issue_ids = sortedIds;
    } else {
      column.issue_ids = [];
    }
  });

  // Update version and timestamp
  state.version = Date.now();
  state.updated_at = new Date().toISOString();

  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(`\n✓ Updated board state with ${sortedIds.length} issues in 'done' column`);
}

// Run conversion
console.log('Starting markdown to JSON conversion...\n');
const issueIds = convertAllIssues();
updateBoardState(issueIds);
console.log('\n✅ Conversion complete!');
console.log(`Total issues converted: ${issueIds.length}`);
