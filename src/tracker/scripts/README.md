# Tracker Migration Scripts

This directory contains data migration scripts for the Martha tracker system.

## Scripts

### 1. migrate-add-new-fields.ts

Migrates all existing tracker issues to include Phase 1.1 data model extensions.

**Usage:**
```bash
npx tsx src/tracker/scripts/migrate-add-new-fields.ts
```

**What it does:**
- Creates automatic timestamped backup before making changes
- Adds new fields to all issues with default values
- Rebuilds all indexes with new groupings
- Validates migration results
- Reports detailed statistics

**Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Automatic backup creation
- ✅ Comprehensive validation
- ✅ Detailed progress reporting
- ✅ Error handling with rollback instructions

**New fields added:**
- `initiative_id`, `team_ids`, `story_points`, `epic_id`, `release_id`
- `start_date`, `due_date`, `estimated_duration`
- `dependencies`, `watchers`, `policy_compliance`, `engagement`

**New index groupings:**
- `by_initiative`, `by_team`, `by_epic`, `by_release`
- `by_start_date`, `by_due_date`, `by_assignee`

### 2. rollback-migration.ts

Restores the .martha directory from the most recent backup.

**Usage:**
```bash
npx tsx src/tracker/scripts/rollback-migration.ts
```

**What it does:**
- Finds the most recent backup automatically
- Verifies backup integrity
- Creates safety backup of current state
- Prompts for user confirmation
- Restores from backup
- Validates restoration

**Safety features:**
- ✅ Backup verification before restore
- ✅ Safety backup before rollback
- ✅ User confirmation prompt
- ✅ Post-restoration validation

## Migration History

### 2026-01-18T15:01:37Z - Phase 1.1 Data Model Extensions

**Status:** ✅ Completed Successfully

**Statistics:**
- Total issues: 276
- Migrated: 274
- Skipped (already current): 2
- Errors: 0

**Worktrees:**
- calculator-app: 0 issues
- communications-service: 87 issues
- martha-dev-v4: 189 issues

**Backups:**
- `/mnt/data/martha-workflow/backup-2026-01-18T15-01-19-722Z`
- `/mnt/data/martha-workflow/backup-2026-01-18T15-01-37-894Z`

## Best Practices

### Before Migration

1. **Review the migration script** to understand what changes will be made
2. **Ensure adequate disk space** for backup creation
3. **Close any applications** accessing the tracker data
4. **Notify team members** if running on shared data

### During Migration

1. **Monitor progress** - the script provides detailed output
2. **Don't interrupt** - let the migration complete
3. **Check for errors** - review the summary at the end

### After Migration

1. **Verify results** - check sample issues have new fields
2. **Test functionality** - ensure tracker still works
3. **Keep backups** - retain for at least 30 days
4. **Document** - note migration date and results

## Troubleshooting

### Migration fails with errors

1. Review error messages in output
2. Check backup was created successfully
3. If needed, run rollback script
4. Fix underlying issues
5. Re-run migration (it's idempotent)

### Need to rollback

```bash
npx tsx src/tracker/scripts/rollback-migration.ts
```

The rollback script will:
- Find the latest backup automatically
- Verify backup integrity
- Create safety backup of current state
- Prompt for confirmation
- Restore from backup

### Backup not found

Backups are stored in `/mnt/data/martha-workflow/backup-*`

If you need to manually restore:
```bash
# List available backups
ls -l /mnt/data/martha-workflow/ | grep backup

# Manual restore (replace TIMESTAMP)
cp -r /mnt/data/martha-workflow/backup-TIMESTAMP /mnt/data/martha-workflow/.martha
```

## Validation

### Verify issue migration

```bash
# Check a sample issue has new fields
cat /mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/boards/2C98C1/issues/MTH-033.json | jq '{initiative_id, team_ids, epic_id, dependencies, engagement}'
```

### Verify index updates

```bash
# Check index has new groupings
cat /mnt/data/martha-workflow/.martha/worktrees/martha-dev-v4/index.json | jq '{by_initiative, by_team, by_epic, by_release, by_assignee}'
```

## Support

For issues or questions:
1. Check `MIGRATION-SUMMARY.md` for detailed documentation
2. Review error messages in script output
3. Check backups are available before making changes
4. Use rollback script if needed

## Related Documentation

- `MIGRATION-SUMMARY.md` - Detailed migration report
- `../../types.ts` - Data model definitions
- `../../services/index-manager.ts` - Index management
