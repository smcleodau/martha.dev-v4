# Issue Dependencies Guide

Manage complex relationships between issues with Martha Tracker's dependency system.

## Understanding Dependencies

### What are Dependencies?

**Dependencies** define relationships between issues:

- **Blocks** - This issue must be done before another can start
- **Blocked By** - This issue can't start until another is done
- **Related** - Issues that are connected but not blocking

### Why Track Dependencies?

- Identify critical path
- Prevent wasted work
- Coordinate across teams
- Plan sequencing
- Surface blockers early

## Dependency Types

### Blocks

**"This issue blocks another issue"**

```
MTH-001 (API) blocks MTH-002 (UI)
→ API must be done before UI can use it
```

When you mark MTH-001 as "blocks MTH-002":
- MTH-002 automatically marked as "blocked by MTH-001"
- Bidirectional relationship
- MTH-001 completion unblocks MTH-002

### Blocked By

**"This issue is blocked by another"**

```
MTH-002 (UI) blocked by MTH-001 (API)
→ UI waits for API
```

Same as "blocks" but from opposite perspective.

### Related

**"These issues are connected"**

```
MTH-003 (Auth) related to MTH-004 (Security)
→ Work on similar concerns, should coordinate
```

Informational only, doesn't block.

## Adding Dependencies

### From Issue Detail Panel

1. Open issue (e.g., MTH-002)
2. Scroll to "Dependencies" section
3. Click "Add Dependency"
4. Select type:
   - Blocks
   - Blocked By
   - Related
5. Enter target issue ID (MTH-001)
6. Click "Add"

### From Context Menu

Right-click issue → "Add Dependency" → Choose type and target

### From List View

1. Select multiple issues
2. Bulk actions → "Add Dependency"
3. Choose type
4. All selected linked together

### From Gantt View

1. Click "Add Dependency" mode
2. Click first issue
3. Click second issue
4. Dependency line created

### Via API

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/boards/phase1/issues/MTH-002/dependencies \
  -H "Content-Type: application/json" \
  -d '{
    "target_issue_id": "MTH-001",
    "type": "blocked_by"
  }'
```

## Viewing Dependencies

### Issue Detail Panel

```
┌─────────────────────────────────────────┐
│ DEPENDENCIES                            │
├─────────────────────────────────────────┤
│ Blocks (2)                              │
│ → MTH-003 UI Component           [×]    │
│ → MTH-004 Integration Tests      [×]    │
│                                         │
│ Blocked By (1)                          │
│ ⚠ MTH-001 API Endpoint (In Progress)   │
│   └─ Blocking for 3 days               │
│                                         │
│ Related (2)                             │
│ → MTH-005 Documentation                 │
│ → MTH-006 Security Review               │
│                                         │
│ [+ Add Dependency]                      │
└─────────────────────────────────────────┘
```

Indicators:
- ✓ Green - Dependency complete
- ⚠ Orange - Dependency in progress
- ✗ Red - Dependency not started (blocking)

### Kanban View

Blocked issues show indicator:

```
┌──────────────────────────┐
│ MTH-002 [Task]           │
│ Build UI Component       │
│                          │
│ ⚠ Blocked by MTH-001    │
│ [Avatar] High  3pts      │
└──────────────────────────┘
```

### List View

Blocked column shows count:

```
│ ID      │ Title         │ Status │ Blocked │
├─────────┼───────────────┼────────┼─────────┤
│ MTH-002 │ UI Component  │ Todo   │ ⚠ 1     │
│ MTH-003 │ Integration   │ Todo   │ ⚠ 2     │
```

### Timeline View

Dependencies show as connecting lines:

```
Jan 15    Jan 20    Jan 25    Jan 30
[MTH-001 ─────────]
                   ╰──→ [MTH-002 ─────────]
                                   ╰──→ [MTH-003 ────]
```

### Gantt View

Full dependency visualization:

```
┌────────────────────────────────────────┐
│ [MTH-001 ════════]                     │
│                  ╰──→ [MTH-002 ═══════]│
│                                   ╰──→ [MTH-003 ═══]
│ [MTH-004 ══════]──┘                    │
│                                        │
│ Critical Path: MTH-001 → MTH-002 → MTH-003
└────────────────────────────────────────┘
```

## Dependency Graph

### Full Graph View

Visualize all dependencies:

```
┌────────────────────────────────────────┐
│ DEPENDENCY GRAPH                       │
├────────────────────────────────────────┤
│                                        │
│     MTH-001                            │
│      API                               │
│       ├──→ MTH-002                     │
│       │     UI                         │
│       │      └──→ MTH-006              │
│       │           Tests                │
│       └──→ MTH-003                     │
│             Mobile                     │
│                                        │
│     MTH-004                            │
│      Auth                              │
│       └──→ MTH-005                     │
│             Security                   │
│                                        │
│ [Zoom] [Filter] [Export]               │
└────────────────────────────────────────┘
```

### Epic Dependency Graph

See all dependencies within epic:

```
Epic: User Authentication

MTH-010 (Epic)
├─ MTH-011 (Story: Login)
│  ├─ MTH-012 (Task: API) ────┐
│  └─ MTH-013 (Task: UI) ←────┘
├─ MTH-014 (Story: Registration)
│  └─ MTH-015 (Task: Email) ←─── MTH-012
└─ MTH-016 (Story: Password Reset)
```

## Dependency Warnings

### Circular Dependencies

**Warning: Circular dependency detected!**

```
MTH-001 blocks MTH-002
MTH-002 blocks MTH-003
MTH-003 blocks MTH-001  ← Circular!

Path: MTH-001 → MTH-002 → MTH-003 → MTH-001
```

System prevents circular dependencies:
- Error when creating
- Must fix manually
- Suggests breaking cycle

### Long Dependency Chains

**Warning: Long chain detected**

```
MTH-001 → MTH-002 → MTH-003 → MTH-004 → MTH-005 → MTH-006

Chain length: 6 issues
Risk: Any delay cascades
Recommendation: Parallelize work where possible
```

### Blocked Too Long

**Alert: Issue blocked for > 7 days**

```
MTH-002 blocked by MTH-001
Blocked for: 9 days
Status: MTH-001 still in progress

Recommended actions:
- Check on MTH-001 progress
- Find workaround
- Remove dependency
- Escalate
```

## Managing Blockers

### Identifying Blockers

**Blocker Dashboard:**

```
┌─────────────────────────────────────────┐
│ CURRENT BLOCKERS                        │
├─────────────────────────────────────────┤
│ MTH-001 (In Progress, 5 days)           │
│ Blocking: 3 issues                      │
│ → MTH-002, MTH-003, MTH-004            │
│ Owner: Claude                           │
│ Status: ⚠ At Risk                       │
│                                         │
│ MTH-010 (Not Started, 2 days)           │
│ Blocking: 1 issue                       │
│ → MTH-011                               │
│ Owner: Unassigned                       │
│ Status: ✗ Critical                      │
│                                         │
│ [View All] [Export]                     │
└─────────────────────────────────────────┘
```

### Resolving Blockers

**Options:**

1. **Complete the blocker**
   - Prioritize blocker work
   - Assign resources
   - Daily check-ins

2. **Remove dependency**
   - If not truly blocking
   - If workaround found
   - Update relationship

3. **Parallelize work**
   - Find independent parts
   - Start what's unblocked
   - Merge later

4. **Escalate**
   - If stuck
   - If external blocker
   - Needs management help

### Blocker Reports

**Weekly Blocker Report:**

```
┌─────────────────────────────────────────┐
│ BLOCKER REPORT: Jan 15-21               │
├─────────────────────────────────────────┤
│ New Blockers: 5                         │
│ Resolved: 3                             │
│ Still Blocked: 2                        │
│                                         │
│ BY TEAM                                 │
│ Frontend: 2 blocked                     │
│ Backend: 1 blocked                      │
│ Mobile: 0 blocked                       │
│                                         │
│ LONGEST BLOCKERS                        │
│ 1. MTH-001 (12 days)                    │
│ 2. MTH-005 (8 days)                     │
│                                         │
│ ACTION ITEMS                            │
│ - Escalate MTH-001 to management        │
│ - Find workaround for MTH-005           │
└─────────────────────────────────────────┘
```

## Critical Path

### What is Critical Path?

The **critical path** is the longest chain of dependent tasks. Any delay in critical path tasks delays the entire project.

### Viewing Critical Path

**Gantt View:**

```
Critical path highlighted in red:

[MTH-001 ════════]──→[MTH-002 ═══════]──→[MTH-003 ═══]
  8 days             5 days              3 days
                                         Total: 16 days

Non-critical (can be delayed):
[MTH-004 ═══]  (can delay 3 days without affecting end date)
```

### Optimizing Critical Path

**Strategies:**

1. **Reduce task duration**
   - Add resources
   - Simplify scope
   - Parallel work

2. **Remove dependencies**
   - Find alternatives
   - Reorder work
   - Create workarounds

3. **Start early**
   - Begin critical tasks first
   - Don't wait for perfect info
   - Iterate

4. **Monitor closely**
   - Daily updates
   - Early warning of delays
   - Quick resolution

## Dependency Best Practices

### 1. Model Real Constraints

Only add dependencies for true blockers:

```
✓ API must exist before UI can call it
✓ Auth must work before user features
✓ Database schema before data access

✗ "It would be nice to have X first"
✗ Organizational preferences
✗ Arbitrary sequencing
```

### 2. Minimize Dependencies

Reduce coupling:

```
Before:
API → UI → Tests → Deploy (serial, 16 days)

After:
API (4 days) ─┬─→ Deploy (2 days)
UI (4 days) ──┤
Tests (4 days)┘

Parallel: 6 days (63% faster!)
```

### 3. Document Why

Add notes to dependencies:

```
Blocks: MTH-002
Reason: UI needs API endpoint /auth/login
Contract: Returns { token, user } on success
Status: API in review, should be done Friday
```

### 4. Review Regularly

Weekly dependency review:
- Are they still valid?
- Can any be removed?
- Any new blockers?
- Update status

### 5. Communicate Blockers

Make blockers visible:
- Daily standup mentions
- Blocker board
- Slack notifications
- Status reports

### 6. Plan for Dependencies

During planning:
- Identify dependencies early
- Sequence work properly
- Assign owners
- Set deadlines
- Build in buffer

### 7. Use Related Sparingly

Don't overuse "related":

```
✓ Related: Auth and Security (coordinate)
✗ Related: Login and Registration (obvious)
```

Too many relationships create noise.

### 8. Update When Done

When completing a blocker:
- Update status
- Notify blocked issues
- Remove if no longer needed
- Document outcome

### 9. Avoid Long Chains

Break up long chains:

```
Before:
A → B → C → D → E → F (6 tasks, 18 days)

After:
A → B ─┬→ F (parallel branch)
       │
C → D ─┘ E (parallel branch)

Result: 10 days (44% faster)
```

### 10. Use Gantt for Planning

Gantt view best for:
- Visualizing dependencies
- Finding critical path
- Identifying opportunities to parallelize
- Resource planning

## Dependency Scenarios

### Scenario 1: API-First Development

```
API Development
├─ MTH-001: API Endpoint
│  ├─ Blocks: MTH-002 (Web UI)
│  ├─ Blocks: MTH-003 (Mobile UI)
│  └─ Blocks: MTH-004 (Integration Tests)
└─ Plan: Finish API first, then parallel UI work
```

**Timeline:**

```
Week 1: [MTH-001 API ═════════]
Week 2:   [MTH-002 Web ═════] (parallel)
          [MTH-003 Mobile ════] (parallel)
          [MTH-004 Tests ═════] (parallel)
```

### Scenario 2: Database Migration

```
Database Migration
├─ MTH-010: New Schema
│  └─ Blocks: MTH-011 (Migration Script)
│     ├─ Blocks: MTH-012 (Update ORM)
│     │  └─ Blocks: MTH-013 (Update API)
│     │     └─ Blocks: MTH-014 (Update UI)
│     └─ Blocks: MTH-015 (Rollback Plan)
```

Sequential, must be done in order.

### Scenario 3: Feature Toggle

```
Feature Launch
├─ MTH-020: Feature Code
│  └─ Related: MTH-021 (Feature Toggle)
│     └─ Blocks: MTH-022 (Deploy to Prod)
│        └─ Related: MTH-023 (Announcement)
```

Toggle allows decoupling deploy from launch.

## Next Steps

- **[Tracker Overview](./tracker-overview.md)** - Back to basics
- **[Time Tracking](./time-tracking.md)** - Track effort
- **[View Modes](./view-modes.md)** - Visualize work

---

**Last Updated:** 2026-01-18
