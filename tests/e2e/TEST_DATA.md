# E2E Test Data Setup

This document describes the test data requirements and setup for E2E tests.

## Required Test Data

The E2E tests expect the following data to be present:

### Worktree
- **ID**: `martha-dev-v4`
- **Name**: Martha Dev v4
- **At least one board configured**

### Board
- **ID**: `phase1-temporal-foundation`
- **Name**: Phase 1 - Temporal Foundation
- **Columns**: backlog, todo, in_progress, in_review, done

### Issues
Tests will create their own issues dynamically, but some tests may work better with existing issues:
- At least 1-2 existing issues for interaction tests
- Issues with different types (epic, story, task, bug)
- Some issues with dates for timeline tests

### Optional Data
- **Initiatives**: At least 1 initiative for filter tests
- **Teams**: At least 1 team for filter tests
- **Users**: At least 1 user for assignee tests

## Seeding Test Data

### Manual Setup

1. Start the backend server:
```bash
npm run dev
```

2. Run database migrations:
```bash
npm run db:migrate
```

3. Seed development data:
```bash
npm run db:seed
```

### Programmatic Setup

Create a test data seeding script in `scripts/seed-e2e-data.ts`:

```typescript
import { pool } from '../src/db/pool';
import { v4 as uuidv4 } from 'uuid';

async function seedE2EData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create worktree
    const worktreeId = 'martha-dev-v4';
    await client.query(
      `INSERT INTO worktrees (id, name, display_name, path, boards)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [worktreeId, 'martha-dev-v4', 'Martha Dev v4', '/mnt/data/martha.dev-v4', ['phase1-temporal-foundation']]
    );

    // Create board
    const boardId = 'phase1-temporal-foundation';
    await client.query(
      `INSERT INTO boards (id, worktree_id, name, description, columns)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [
        boardId,
        worktreeId,
        'Phase 1 - Temporal Foundation',
        'Core temporal tracking foundation',
        JSON.stringify([
          { id: 'backlog', name: 'Backlog', color: '#94A3B8', wip_limit: null, issue_ids: [] },
          { id: 'todo', name: 'To Do', color: '#60A5FA', wip_limit: 5, issue_ids: [] },
          { id: 'in_progress', name: 'In Progress', color: '#FBBF24', wip_limit: 3, issue_ids: [] },
          { id: 'in_review', name: 'In Review', color: '#A78BFA', wip_limit: 3, issue_ids: [] },
          { id: 'done', name: 'Done', color: '#34D399', wip_limit: null, issue_ids: [] }
        ])
      ]
    );

    // Create sample initiative
    await client.query(
      `INSERT INTO initiatives (id, worktree_id, name, description, color, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), worktreeId, 'E2E Test Initiative', 'Initiative for E2E testing', '#3B82F6', 'active']
    );

    // Create sample team
    await client.query(
      `INSERT INTO teams (id, worktree_id, name, description, color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [uuidv4(), worktreeId, 'E2E Test Team', 'Team for E2E testing', '#10B981']
    );

    // Create sample issues
    const issueTypes = ['epic', 'story', 'task', 'bug'];
    const statuses = ['backlog', 'todo', 'in_progress'];

    for (let i = 0; i < 5; i++) {
      const issueId = `E2E-TEST-${i + 1}`;
      await client.query(
        `INSERT INTO issues (id, worktree_id, board_id, type, title, status, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          issueId,
          worktreeId,
          boardId,
          issueTypes[i % issueTypes.length],
          `E2E Test Issue ${i + 1}`,
          statuses[i % statuses.length],
          'medium'
        ]
      );
    }

    await client.query('COMMIT');
    console.log('E2E test data seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding E2E data:', error);
    throw error;
  } finally {
    client.release();
  }
}

seedE2EData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
```

Then run:
```bash
tsx scripts/seed-e2e-data.ts
```

## Test Data Cleanup

After running tests, you may want to clean up test data:

```sql
-- Delete test issues
DELETE FROM issues WHERE id LIKE 'E2E-%';

-- Delete test initiatives
DELETE FROM initiatives WHERE name LIKE '%E2E Test%';

-- Delete test teams
DELETE FROM teams WHERE name LIKE '%E2E Test%';
```

## Environment-Specific Data

### Local Development
- Use full database with all features enabled
- Can use real user data (with caution)

### CI/CD
- Use minimal test dataset
- Mock external services
- Clean database between runs

### Staging
- Use production-like data
- Anonymized user information
- Full feature set enabled

## Data Isolation

Each test should:
1. Create its own test data when possible
2. Not depend on specific existing data
3. Clean up after itself (optional)
4. Use unique identifiers to avoid conflicts

Example:
```typescript
test('my test', async ({ page }) => {
  const testId = `E2E-TEST-${Date.now()}`;
  // Use testId for all created entities
});
```

## Mocking External Services

For E2E tests, consider mocking:
- GitHub API calls
- Email notifications
- Webhook deliveries
- External authentication

Use Playwright's route mocking:
```typescript
await page.route('**/api/github/**', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ success: true })
  });
});
```

## Database Snapshots

For consistent test data:

1. Create a snapshot after seeding:
```bash
pg_dump martha_test > tests/e2e/fixtures/test-snapshot.sql
```

2. Restore before test runs:
```bash
psql martha_test < tests/e2e/fixtures/test-snapshot.sql
```

## Best Practices

1. **Idempotent Seeds** - Seeds should be rerunnable without errors
2. **Minimal Data** - Only create data needed for tests
3. **Realistic Data** - Use production-like data structures
4. **Version Control** - Check in seed scripts, not raw data
5. **Documentation** - Document any special data requirements
6. **Cleanup** - Provide cleanup scripts for test data
