# Release Management Guide

Plan, track, and ship releases with Martha Tracker's release management features.

## What are Releases?

**Releases** are versioned milestones that group related issues for deployment. They help you:

- Plan what goes in each version
- Track release progress
- Coordinate across teams
- Communicate to stakeholders
- Manage release notes

## Creating a Release

### From the Sidebar

1. Click "Releases" in sidebar
2. Click "+ New Release"
3. Fill in details:
   - **ID:** v2.0.0
   - **Name:** Version 2.0 - Timeline Views
   - **Description:** Major feature release
   - **Version:** 2.0.0
   - **Status:** in_progress
   - **Release Date:** 2026-02-28
4. Click "Create"

### From the API

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/releases \
  -H "Content-Type: application/json" \
  -d '{
    "id": "v2.0.0",
    "name": "Version 2.0 - Timeline Views",
    "description": "Major feature release with timeline and Gantt views",
    "version": "2.0.0",
    "status": "in_progress",
    "release_date": "2026-02-28"
  }'
```

## Release Fields

- **ID** (required) - Unique identifier (e.g., v2.0.0)
- **Name** (required) - Display name
- **Description** - What's in this release
- **Version** (required) - Semantic version (major.minor.patch)
- **Status** - planned, in_progress, testing, released, cancelled
- **Release Date** (required) - Target release date

## Semantic Versioning

Follow semantic versioning (semver):

```
MAJOR.MINOR.PATCH

2.1.3
│ │ └─ Patch: Bug fixes, small updates (backward compatible)
│ └─── Minor: New features (backward compatible)
└───── Major: Breaking changes, major features
```

**Examples:**

- `1.0.0` - Initial release
- `1.1.0` - Add new feature (backward compatible)
- `1.1.1` - Bug fix
- `2.0.0` - Breaking change (API change, etc.)

## Release Statuses

### Planned

Release is defined but work hasn't started:

```
Status: Planned
Progress: 0%
Issues: Identified but not assigned
```

**Actions:**
- Refine scope
- Estimate effort
- Assign to sprint

### In Progress

Active development:

```
Status: In Progress
Progress: 45%
Issues: Mix of done, in progress, todo
```

**Actions:**
- Track progress
- Daily updates
- Manage scope

### Testing

Feature complete, in QA:

```
Status: Testing
Progress: 95%
Issues: All done, bugs being fixed
```

**Actions:**
- Run test suites
- Fix bugs
- Prepare release notes

### Released

Shipped to production:

```
Status: Released
Progress: 100%
Release Date: 2026-02-28
```

**Actions:**
- Close release
- Archive documentation
- Plan next release

### Cancelled

Release cancelled:

```
Status: Cancelled
Reason: Scope changed, deprioritized
```

**Actions:**
- Reassign issues
- Document why
- Clean up

## Linking Issues to Releases

### When Creating Issues

```
Title: Implement timeline drag-drop
Release: [v2.0.0 ▼]
```

### For Existing Issues

1. Open issue detail panel
2. Find "Release" field
3. Select from dropdown
4. Save

### Bulk Assignment

1. Filter issues to assign
2. Select all
3. Bulk actions → "Set Release"
4. Choose release
5. Apply

## Release Dashboard

### Overview

```
┌──────────────────────────────────────────────────┐
│ v2.0.0 - Timeline Views                   [Edit] │
├──────────────────────────────────────────────────┤
│ Status: In Progress                              │
│ Release Date: Feb 28, 2026 (40 days away)       │
│                                                  │
│ PROGRESS                                         │
│ ████████████░░░░  75% Complete                   │
│ 45 of 60 issues done                            │
│                                                  │
│ BURNDOWN                                         │
│ [Chart showing issue burndown]                   │
│  Target    ●────────●                           │
│  Actual    ●───●─●                              │
│  Remaining: 15 issues                            │
│                                                  │
│ BY STATUS                                        │
│ Done:         45 (75%)  ████████████████░░░░     │
│ In Progress:   8 (13%)  ███░░░░░░░░░░░░░░░░░    │
│ To Do:         5 (8%)   ██░░░░░░░░░░░░░░░░░░    │
│ Backlog:       2 (3%)   █░░░░░░░░░░░░░░░░░░░    │
│                                                  │
│ BY TYPE                                          │
│ Epics:    ███░   3/4                            │
│ Stories:  ██████░ 12/15                         │
│ Tasks:    ████████████░  30/41                  │
│                                                  │
│ QUALITY GATES                                    │
│ ✓ Code review (100%)                            │
│ ⚠ Test coverage (85% - Target: 90%)            │
│ ✓ Documentation (100%)                          │
│ ⚠ Security review (80% - 12 remaining)         │
│                                                  │
│ RECENT ACTIVITY                                  │
│ [Activity feed]                                  │
└──────────────────────────────────────────────────┘
```

### Release Board View

Filter board by release:

```
Filter: Release: [v2.0.0 ▼]

Shows only v2.0.0 issues in kanban view
```

### Release Timeline

View release on timeline:

```
┌────────────────────────────────────────────────┐
│ Jan 15    Jan 29    Feb 12    Feb 26  │ Mar 12│
│           ↓ Start          ↓ Release Date      │
├────────────────────────────────────────────────┤
│ [───────────────v2.0.0────────────────]        │
│   [Epic 1──────]                               │
│       [Epic 2────────]                         │
│             [Epic 3─────]                      │
│                 [Epic 4──────]                 │
└────────────────────────────────────────────────┘
```

### Release Gantt

Critical path and dependencies:

```
┌─────────────────────────────────────────┐
│ Release: v2.0.0                         │
├─────────────────────────────────────────┤
│ [Epic 1════════]──┐                    │
│ [Epic 2════]──────┤                    │
│                   ↓                     │
│         [Epic 3═══════]──→[Epic 4════] │
│                          Critical Path ↑│
└─────────────────────────────────────────┘
```

## Release Planning

### 1. Define Scope

Decide what goes in the release:

**Feature-Driven:**
```
v2.0.0: Timeline Views
- Timeline view
- Gantt chart
- Dependencies
- Resource planning
```

**Time-Driven:**
```
Q1 2026 Release
- Whatever's ready by Feb 28
- Must-haves + nice-to-haves
- Cut scope if needed
```

### 2. Break Down Work

Create epics and stories:

```
Epic: Timeline View
├─ Story: Basic timeline layout
│  ├─ Task: Timeline component
│  ├─ Task: Date axis
│  └─ Task: Issue bars
├─ Story: Drag and drop
│  ├─ Task: Horizontal drag
│  ├─ Task: Vertical drag
│  └─ Task: Date snapping
└─ Story: Swimlanes
   ├─ Task: Swimlane selector
   ├─ Task: Group by status
   └─ Task: Group by assignee
```

### 3. Estimate Effort

Add story points to all issues:

```
Epic: Timeline View (34 points)
├─ Story: Basic layout (8 points)
├─ Story: Drag and drop (13 points)
└─ Story: Swimlanes (13 points)
```

### 4. Assign Issues

Assign to team members:

```
Timeline View (34 points)
├─ Claude: 18 points
│  ├─ Basic layout
│  └─ Drag and drop
└─ Developer 2: 16 points
   └─ Swimlanes
```

### 5. Set Milestones

Define checkpoints:

```
Jan 31: Alpha (basic timeline)
Feb 14: Beta (drag and drop)
Feb 28: Release (complete)
```

### 6. Track Progress

Monitor daily:
- Burndown chart
- Velocity
- Scope changes
- Blockers

## Release Reports

### Progress Report

```
┌────────────────────────────────────────┐
│ Release Progress Report                │
│ v2.0.0 - As of Jan 18, 2026           │
├────────────────────────────────────────┤
│ Schedule                               │
│ Start: Jan 15 (3 days ago)            │
│ Release: Feb 28 (40 days)             │
│ Elapsed: 7% | Remaining: 93%          │
│                                        │
│ Scope                                  │
│ Planned: 60 issues, 150 points        │
│ Added: 5 issues, 12 points            │
│ Removed: 2 issues, 5 points           │
│ Current: 63 issues, 157 points        │
│                                        │
│ Progress                               │
│ Done: 45 issues (71%), 112 pts (71%) │
│ In Progress: 8 issues, 20 pts         │
│ Remaining: 10 issues, 25 pts          │
│                                        │
│ Velocity                               │
│ Week 1: 35 points                     │
│ Week 2: 42 points (↑20%)              │
│ Avg: 38.5 points/week                 │
│ Projected completion: Feb 25 (✓)     │
│                                        │
│ Health: ✓ On Track                    │
└────────────────────────────────────────┘
```

### Quality Report

```
┌────────────────────────────────────────┐
│ Release Quality Report                 │
├────────────────────────────────────────┤
│ Code Coverage                          │
│ Current: 85%                           │
│ Target: 90%                            │
│ Status: ⚠ Below target                │
│                                        │
│ Test Results                           │
│ Unit: 450 passed, 2 failed            │
│ Integration: 120 passed, 0 failed     │
│ E2E: 45 passed, 1 failed              │
│ Status: ⚠ 3 failures                  │
│                                        │
│ Code Review                            │
│ Reviewed: 60/60 PRs (100%)            │
│ Status: ✓ Complete                    │
│                                        │
│ Documentation                          │
│ API Docs: ✓ Complete                  │
│ User Guide: ✓ Complete                │
│ Release Notes: ⚠ In Progress          │
│                                        │
│ Security                               │
│ Security Review: 48/60 issues (80%)   │
│ Vulnerabilities: 0 critical, 2 medium │
│ Status: ⚠ In Progress                 │
└────────────────────────────────────────┘
```

### Risk Report

```
┌────────────────────────────────────────┐
│ Release Risk Report                    │
├────────────────────────────────────────┤
│ Schedule Risks                         │
│ ⚠ 3 blocked issues (2 days)          │
│ ⚠ 2 overdue issues (5 days)          │
│ ✓ Velocity trending up                │
│                                        │
│ Scope Risks                            │
│ ⚠ Scope creep: +7 issues              │
│ ✓ No major changes                    │
│                                        │
│ Quality Risks                          │
│ ⚠ Test coverage below target          │
│ ⚠ 3 test failures                     │
│ ⚠ Security review incomplete          │
│                                        │
│ Resource Risks                         │
│ ⚠ 2 developers overallocated          │
│ ✓ No critical dependencies            │
│                                        │
│ Overall: ⚠ Medium Risk                │
│ Recommendation: Address test failures, │
│ complete security review               │
└────────────────────────────────────────┘
```

## Release Notes

### Auto-Generated

Martha can generate release notes from issues:

```markdown
# Release v2.0.0 - Timeline Views

Released: February 28, 2026

## New Features

- **Timeline View** (#MTH-001)
  - Horizontal timeline visualization
  - Drag and drop scheduling
  - Swimlane grouping by status, assignee, priority

- **Gantt Chart** (#MTH-010)
  - Dependency visualization
  - Critical path highlighting
  - Resource allocation view

- **Advanced Dependencies** (#MTH-015)
  - Blocks/Blocked-by relationships
  - Dependency cycle detection
  - Dependency graph view

## Improvements

- **Performance** (#MTH-020)
  - 50% faster list view rendering
  - Virtualized tables for large datasets

- **Filtering** (#MTH-025)
  - Advanced filter builder
  - Saved filter presets
  - URL-based filter sharing

## Bug Fixes

- Fixed drag and drop on mobile (#MTH-030)
- Fixed date picker timezone issues (#MTH-031)
- Fixed kanban column overflow (#MTH-032)

## Breaking Changes

- API endpoint `/api/issues` deprecated, use `/api/worktrees/:id/boards/:id/issues`
- `parent_id` field now separate from `epic_id`

## Migration Guide

See [Migration Guide](../migration/v1-to-v2.md) for upgrade instructions.
```

### Manual Editing

1. Generate draft release notes
2. Edit for clarity and tone
3. Add context and examples
4. Publish to documentation

## Release Checklist

### Pre-Release

```
□ All issues done
□ Code reviewed
□ Tests passing
□ Coverage meets target
□ Security review complete
□ Documentation updated
□ Release notes written
□ Migration guide ready
□ Changelog updated
□ Deployment plan reviewed
```

### Release Day

```
□ Final testing
□ Backup database
□ Deploy to staging
□ Smoke tests
□ Deploy to production
□ Verify deployment
□ Publish release notes
□ Notify users
□ Monitor for issues
```

### Post-Release

```
□ Close release in tracker
□ Archive documentation
□ Review retrospective
□ Update roadmap
□ Plan next release
```

## Release Workflows

### Continuous Delivery

Ship frequently:

```
Week 1: v2.1.0 (Features A, B)
Week 2: v2.1.1 (Bug fixes)
Week 3: v2.2.0 (Feature C)
Week 4: v2.2.1 (Bug fixes)
```

### Sprint-Based

Release per sprint:

```
Sprint 1: v2.0.0 (Major release)
Sprint 2: v2.1.0 (Minor features)
Sprint 3: v2.2.0 (Minor features)
Sprint 4: v2.3.0 (Minor features)
```

### Milestone-Based

Release when ready:

```
Q1: v2.0.0 (Timeline views)
Q2: v3.0.0 (Mobile apps)
Q3: v3.1.0 (Integrations)
Q4: v4.0.0 (AI features)
```

## Next Steps

- **[Time Tracking](./time-tracking.md)** - Track effort
- **[Dependencies](./dependencies.md)** - Manage relationships
- **[Migration Guide](../migration/v1-to-v2.md)** - Upgrade guide

---

**Last Updated:** 2026-01-18
