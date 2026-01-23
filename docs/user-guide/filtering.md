# Advanced Filtering Guide

Master search and filtering to quickly find exactly what you need in Martha Tracker.

## Quick Search

### Basic Text Search

Use the search box in the header for instant full-text search:

```
Search: authentication
```

Searches across:
- Issue titles
- Descriptions
- Comments
- Labels
- Assignee names

### Search Syntax

**Special Prefixes:**

```
type:epic              → All epics
type:task              → All tasks
priority:high          → High priority
priority:critical      → Critical items
status:in_progress     → In progress issues
assignee:claude        → Assigned to Claude
label:frontend         → Tagged "frontend"
parent:MTH-001         → Children of MTH-001
has:assignee           → Has assignee
has:due_date           → Has due date set
no:assignee            → Unassigned
no:due_date            → No due date
```

**Combining Searches:**

```
type:task status:in_progress assignee:claude
→ Claude's in-progress tasks

priority:high no:assignee
→ High priority unassigned issues

label:bug status:backlog
→ Bugs in backlog
```

**Quoted Phrases:**

```
"user authentication"
→ Exact phrase match

title:"login flow"
→ Search only in titles
```

## Filter Bar

### Basic Filters

```
┌──────────────────────────────────────────────────────┐
│ Type: [All ▼] Priority: [All ▼] Status: [All ▼]     │
│ Initiative: [All ▼] Team: [All ▼] [More Filters]    │
└──────────────────────────────────────────────────────┘
```

**Type Filter:**
- All
- Epic
- Story
- Task
- Bug

**Priority Filter:**
- All
- Critical
- High
- Medium
- Low

**Status Filter:**
- All
- Backlog
- To Do
- In Progress
- Review
- Done

**Initiative Filter:**
- All initiatives
- No initiative
- Individual initiatives

**Team Filter:**
- All teams
- No team
- Individual teams

### Advanced Filters

Click "More Filters" to access:

```
┌────────────────────────────────────────┐
│ ADVANCED FILTERS                       │
├────────────────────────────────────────┤
│ Assignee:        [Select... ▼]        │
│ Labels:          [Select... ▼]        │
│ Release:         [Select... ▼]        │
│ Epic:            [Select... ▼]        │
│ Start Date:      [From] [To]          │
│ Due Date:        [From] [To]          │
│ Story Points:    [Min] [Max]          │
│ Created:         [Last 7 days ▼]      │
│ Updated:         [Last 7 days ▼]      │
│                                        │
│ [x] My Issues Only                    │
│ [x] Show Unassigned                   │
│ [x] Show Overdue                      │
│ [x] Show Blocked                      │
│ [ ] Has Dependencies                  │
│ [ ] Has Documentation                 │
│                                        │
│ [Clear All] [Apply Filters]           │
└────────────────────────────────────────┘
```

### Date Range Filters

**Start Date / Due Date:**

```
From: [2026-01-15] To: [2026-01-31]
```

Or use presets:
- Today
- This Week
- This Month
- This Quarter
- Next 7 Days
- Next 30 Days
- Custom Range

**Created / Updated:**

Presets:
- Last 24 hours
- Last 7 days
- Last 30 days
- Last 90 days
- Custom range

### Story Points Range

```
Min: [0] Max: [8]
```

Find issues within estimation range.

### Quick Toggles

```
[x] My Issues Only     → Assigned to me
[x] Show Unassigned    → No assignee
[x] Show Overdue       → Past due date
[x] Show Blocked       → Has blocking dependencies
[ ] Has Dependencies   → Has any dependencies
[ ] Has Documentation  → Has linked docs
[ ] Watched by Me      → Issues I'm watching
```

## Active Filter Chips

Applied filters appear as chips above the content:

```
× Type: Task  × Priority: High  × Assignee: Claude  [Clear All]
```

Click × to remove individual filters, or "Clear All" to reset.

## Saved Filters

### Creating Saved Filters

1. Apply desired filters
2. Click "Save Filter" button
3. Enter a name: "My High Priority Tasks"
4. Click "Save"

### Using Saved Filters

Access from the sidebar:

```
SAVED FILTERS
→ My High Priority Tasks
→ Unassigned Bugs
→ Current Sprint
→ Overdue Issues
```

Click to instantly apply.

### Managing Saved Filters

Right-click for options:
- Rename
- Update (overwrite with current)
- Delete
- Share (generate shareable link)

## Filter Presets

Built-in presets in the sidebar:

```
QUICK FILTERS
→ My Issues
→ Unassigned
→ Recently Updated
→ Overdue
→ Blocked
→ This Sprint
```

## Filtering by Type

### Hierarchy Filtering

When filtering by parent:

```
parent:MTH-001
→ Direct children only

descendants:MTH-001
→ All descendants (recursive)
```

### Epic Filtering

```
epic:MTH-001
→ All issues in epic (includes nested)
```

## Filtering by People

### Assignee

```
assignee:claude        → Assigned to Claude
assignee:@me          → Assigned to me
no:assignee           → Unassigned
has:assignee          → Has any assignee
```

### Watchers

```
watcher:claude        → Claude is watching
watcher:@me          → I'm watching
```

### Author

```
author:claude         → Created by Claude
```

## Filtering by Dates

### Relative Dates

```
created:>2026-01-01          → After Jan 1
created:<2026-01-31          → Before Jan 31
updated:>-7d                 → Last 7 days
due:>+7d                     → Due after next 7 days
due:<+0d                     → Overdue (past today)
```

### Date Keywords

```
due:today
due:tomorrow
due:this_week
due:next_week
due:this_month
due:next_month
```

## Filtering by Labels

### Single Label

```
label:frontend        → Has "frontend" label
```

### Multiple Labels (OR)

```
label:frontend,backend
→ Has "frontend" OR "backend"
```

### Multiple Labels (AND)

```
label:frontend label:urgent
→ Has both labels
```

### Excluding Labels

```
-label:blocked
→ Does NOT have "blocked" label
```

## Filtering by Custom Fields

### Initiative

```
initiative:timeline-views
→ Part of "timeline-views" initiative

no:initiative
→ Not part of any initiative
```

### Team

```
team:frontend
→ Assigned to "frontend" team

team:frontend,backend
→ Assigned to either team
```

### Release

```
release:v2.0.0
→ Targeted for v2.0.0

no:release
→ Not in any release
```

## Filtering by State

### Status

```
status:in_progress
status:todo,in_progress
→ Multiple statuses (OR)
```

### Priority

```
priority:critical,high
→ Critical or High
```

### Progress

```
progress:>50
→ More than 50% complete

progress:0
→ Not started
```

## Filtering by Relationships

### Dependencies

```
has:dependencies
→ Has any dependencies

blocks:MTH-002
→ Blocks MTH-002

blocked_by:MTH-001
→ Blocked by MTH-001

related:MTH-003
→ Related to MTH-003
```

### Documentation

```
has:documentation
→ Has linked documentation

no:documentation
→ No documentation
```

### Comments

```
has:comments
→ Has comments

comments:>5
→ More than 5 comments
```

## Combining Filters

### Boolean Logic

**AND (implicit):**
```
type:task status:in_progress
→ Tasks AND in progress
```

**OR (comma-separated):**
```
priority:critical,high
→ Critical OR High
```

**NOT (minus prefix):**
```
-status:done
→ NOT done
```

**Complex:**
```
type:task priority:critical,high -status:done assignee:@me
→ My critical/high priority tasks that aren't done
```

## Filtering in Different Views

### Kanban View

Filters hide non-matching cards:

```
Applied: type:task
Result: Only task cards visible
```

Column counts update to show filtered totals.

### List View

Filters reduce table rows:

```
Showing 12 of 156 issues (filtered)
```

Grouping respects filters.

### Timeline View

Filtered issues removed from timeline:

```
Only matching issues appear on timeline
Backlog sidebar also filtered
```

### Gantt View

Filtered issues and their dependencies:

```
Dependency lines show even if target filtered out
Parent issues visible if children match
```

## URL Filter Sharing

Filters encode in URL:

```
/tracker/martha-dev-v4/phase1/kanban?
  type=task&
  status=in_progress&
  priority=high&
  assignee=claude
```

Share URL to share filtered view.

## Performance Tips

### Large Datasets

For boards with 1000+ issues:

1. **Use specific filters** - Reduce result set
2. **Avoid wildcards** - Be precise
3. **Use saved filters** - Faster than rebuilding
4. **Enable virtualization** - In list view settings

### Filter Order

Apply filters in this order for best performance:

1. Type filter (reduces most)
2. Status filter
3. Date filters
4. Text search (most expensive)

## Filter Examples

### Common Use Cases

**Sprint Planning:**
```
status:backlog priority:high,critical -has:assignee
→ Unassigned high-priority backlog items
```

**Standup Review:**
```
assignee:@me status:in_progress,review
→ My active work
```

**Bug Triage:**
```
type:bug status:backlog,todo -has:priority
→ Unprior
itized bugs
```

**Release Planning:**
```
release:v2.0.0 -status:done
→ Incomplete items for release
```

**Capacity Planning:**
```
assignee:claude due:this_week
→ Claude's work this week
```

**Technical Debt:**
```
label:tech-debt status:backlog
→ Backlog technical debt
```

**Documentation Review:**
```
-has:documentation status:done
→ Completed work without docs
```

## Next Steps

- **[Initiatives & Teams](./initiatives-teams.md)** - Organize work
- **[Time Tracking](./time-tracking.md)** - Track time
- **[Dependencies](./dependencies.md)** - Manage relationships

---

**Last Updated:** 2026-01-18
