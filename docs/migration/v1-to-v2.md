# Migration Guide: v1 to v2

This guide helps you migrate from Martha Tracker v1 to v2.

## Overview

Martha Tracker v2 introduces significant new features and some breaking changes:

**New Features:**
- Multi-worktree support
- Multi-board support
- Initiatives, teams, and releases
- Timeline and Gantt views
- Advanced dependencies
- Time tracking
- Engagement tracking
- Policy compliance

**Breaking Changes:**
- API routes now hierarchical
- Issue IDs scoped to worktree
- New data model with additional fields
- Different file structure

## Pre-Migration Checklist

- [ ] Backup all data
- [ ] Test migration on copy first
- [ ] Review breaking changes
- [ ] Update client code
- [ ] Schedule downtime window

## Step 1: Backup Data

```bash
# Backup entire .tracker directory
cp -r .tracker .tracker.backup.$(date +%Y%m%d)

# Or create tar archive
tar -czf tracker-backup-$(date +%Y%m%d).tar.gz .tracker
```

## Step 2: Install v2

```bash
# Update package
git fetch
git checkout v2.0.0

# Install dependencies
npm install

# Build
npm run build
```

## Step 3: Run Migration Script

```bash
# Dry run (shows what will change)
npm run migrate -- --dry-run

# Actual migration
npm run migrate

# Or with TypeScript
npx tsx src/tracker/scripts/migrate-v1-to-v2.ts
```

## Migration Script

The script handles:

1. **Worktree Migration**
   - Creates default worktree
   - Moves existing boards to worktree
   - Updates issue references

2. **Board Migration**
   - Preserves board structure
   - Maintains column configuration
   - Updates issue mappings

3. **Issue Migration**
   - Adds new fields with defaults
   - Preserves existing data
   - Updates relationships

4. **Index Migration**
   - Rebuilds index with new structure
   - Adds new index buckets
   - Maintains existing indexes

## Data Model Changes

### Issues

**New Fields:**

```typescript
interface Issue {
  // NEW: Worktree and board identifiers
  worktree_id: string;
  board_id: string;

  // NEW: Phase 2 fields
  initiative_id: string | null;
  team_ids: string[];
  story_points: number | null;
  epic_id: string | null;
  release_id: string | null;
  start_date: string | null;
  due_date: string | null;
  estimated_duration: number | null;
  dependencies: {
    blocks: string[];
    blocked_by: string[];
    related: string[];
  };
  watchers: string[];
  policy_compliance: PolicyCompliance | null;
  engagement: {
    views: number;
    total_read_time: number;
    view_history: ViewEntry[];
  };

  // UNCHANGED: Existing fields
  id: string;
  type: string;
  title: string;
  ...
}
```

**Migration:**

```typescript
// v1 issue
const v1Issue = {
  id: 'MTH-001',
  type: 'task',
  title: 'Fix bug',
  status: 'done'
};

// Migrated to v2
const v2Issue = {
  ...v1Issue,
  worktree_id: 'default',         // NEW
  board_id: 'default',            // NEW
  initiative_id: null,            // NEW
  team_ids: [],                   // NEW
  story_points: null,             // NEW
  epic_id: null,                  // NEW
  release_id: null,               // NEW
  start_date: null,               // NEW
  due_date: null,                 // NEW
  estimated_duration: null,       // NEW
  dependencies: {                 // NEW
    blocks: [],
    blocked_by: [],
    related: []
  },
  watchers: [],                   // NEW
  policy_compliance: null,        // NEW
  engagement: {                   // NEW
    views: 0,
    total_read_time: 0,
    view_history: []
  }
};
```

### Index

**New Structure:**

```typescript
interface IssueIndex {
  worktree_id: string;    // NEW
  version: number;
  count: number;
  next_id: number;
  issues: Record<string, IndexEntry>;
  by_status: Record<string, string[]>;
  by_type: Record<string, string[]>;
  by_parent: Record<string, string[]>;
  by_board: Record<string, string[]>;        // NEW

  // NEW: Phase 2 indexes
  by_initiative: Record<string, string[]>;
  by_team: Record<string, string[]>;
  by_epic: Record<string, string[]>;
  by_release: Record<string, string[]>;
  by_start_date: Record<string, string[]>;
  by_due_date: Record<string, string[]>;
  by_assignee: Record<string, string[]>;

  updated_at: string;
}
```

## API Changes

### Route Structure

**v1 Routes:**

```
GET    /api/tracker/issues
POST   /api/tracker/issues
GET    /api/tracker/issues/:id
PATCH  /api/tracker/issues/:id
DELETE /api/tracker/issues/:id
```

**v2 Routes (Hierarchical):**

```
GET    /api/tracker/worktrees/:worktreeId/boards/:boardId/issues
POST   /api/tracker/worktrees/:worktreeId/boards/:boardId/issues
GET    /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id
PATCH  /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id
DELETE /api/tracker/worktrees/:worktreeId/boards/:boardId/issues/:id
```

**Backward Compatibility:**

v1 routes still work but are deprecated:

```
/api/tracker/issues → /api/tracker/worktrees/default/boards/default/issues
```

### Client Code Updates

**v1 Client:**

```typescript
// Create issue
const issue = await fetch('/api/tracker/issues', {
  method: 'POST',
  body: JSON.stringify({ title: 'Test', type: 'task' })
});

// Get issues
const response = await fetch('/api/tracker/issues?status=in_progress');
const { issues } = await response.json();
```

**v2 Client (Recommended):**

```typescript
// Create issue (with worktree/board)
const issue = await fetch('/api/tracker/worktrees/my-project/boards/main/issues', {
  method: 'POST',
  body: JSON.stringify({ title: 'Test', type: 'task' })
});

// Get issues (with worktree/board)
const response = await fetch('/api/tracker/worktrees/my-project/boards/main/issues?status=in_progress');
const { issues } = await response.json();
```

## File Structure Changes

### v1 Structure

```
.tracker/
├─ config.json
├─ index.json
├─ board.json
└─ issues/
   ├─ MTH-001.json
   ├─ MTH-002.json
   └─ ...
```

### v2 Structure

```
.tracker/
├─ config.json
└─ worktrees/
   └─ default/           # Default worktree
      ├─ index.json
      ├─ boards/
      │  └─ default.json
      ├─ issues/
      │  └─ default/     # Board-scoped issues
      │     ├─ MTH-001.json
      │     ├─ MTH-002.json
      │     └─ ...
      ├─ initiatives/
      ├─ teams/
      ├─ releases/
      ├─ activity/
      ├─ comments/
      ├─ time-entries/
      └─ documentation/
```

## Manual Migration Steps

If automatic migration fails:

### 1. Create Worktree

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees \
  -H "Content-Type: application/json" \
  -d '{
    "id": "default",
    "name": "default",
    "display_name": "Default",
    "description": "Migrated from v1",
    "path": "."
  }'
```

### 2. Create Board

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/default/boards \
  -H "Content-Type: application/json" \
  -d '{
    "id": "default",
    "name": "Default Board",
    "description": "Migrated from v1"
  }'
```

### 3. Migrate Issues

```typescript
// Read v1 issues
const v1Issues = readV1Issues();

// Migrate each issue
for (const v1Issue of v1Issues) {
  const v2Issue = {
    ...v1Issue,
    worktree_id: 'default',
    board_id: 'default',
    // Add new fields with defaults
    initiative_id: null,
    team_ids: [],
    story_points: null,
    epic_id: null,
    release_id: null,
    start_date: null,
    due_date: null,
    estimated_duration: null,
    dependencies: {
      blocks: [],
      blocked_by: [],
      related: []
    },
    watchers: [],
    policy_compliance: null,
    engagement: {
      views: 0,
      total_read_time: 0,
      view_history: []
    }
  };

  // Save to v2 location
  await saveV2Issue(v2Issue);
}

// Rebuild index
await rebuildIndex('default');
```

## Rollback Plan

If migration fails:

### 1. Stop v2 Server

```bash
npm run stop
```

### 2. Restore Backup

```bash
# Remove v2 data
rm -rf .tracker

# Restore v1 backup
cp -r .tracker.backup.20260118 .tracker
```

### 3. Revert to v1

```bash
git checkout v1.0.0
npm install
npm run build
npm start
```

## Post-Migration

### 1. Verify Data

```bash
# Check issue count
curl http://localhost:20000/api/tracker/worktrees/default/boards/default/issues | jq '.count'

# Spot check issues
curl http://localhost:20000/api/tracker/worktrees/default/boards/default/issues/MTH-001
```

### 2. Update Client Applications

Update all client code to use v2 API routes.

### 3. Remove Deprecated Routes (Optional)

After all clients updated, disable v1 routes:

```typescript
// In server config
config.deprecatedRoutesEnabled = false;
```

### 4. Test New Features

- Create worktree
- Create board
- Create initiative
- Create team
- Create release
- Test timeline view
- Test Gantt view
- Test dependencies

## Troubleshooting

### Issue: Migration script fails

**Solution:**

```bash
# Check logs
tail -f logs/migration.log

# Run with verbose logging
npm run migrate -- --verbose

# Skip problematic issues
npm run migrate -- --skip-errors
```

### Issue: Issues not appearing

**Solution:**

```bash
# Rebuild index
npm run rebuild-index

# Check index
cat .tracker/worktrees/default/index.json | jq '.count'
```

### Issue: Board columns wrong

**Solution:**

```bash
# Reset board to defaults
npm run reset-board -- default default
```

### Issue: Performance degraded

**Solution:**

```bash
# Rebuild indexes
npm run rebuild-indexes

# Vacuum file system (remove orphans)
npm run vacuum
```

## Support

Need help?

- **GitHub Issues:** Report migration problems
- **Discord:** Real-time help
- **Email:** support@martha.dev

Include:
- v1 version
- v2 version
- Error messages
- Log files
- Data size (# of issues, boards, etc.)

---

**Last Updated:** 2026-01-18
