# View Modes Guide

Martha Tracker provides four distinct view modes, each optimized for different workflows and use cases. This guide explains when and how to use each view effectively.

## Overview of Views

| View | Best For | Key Features |
|------|----------|--------------|
| **Kanban** | Daily work, sprint execution | Drag-drop, visual workflow, WIP limits |
| **List** | Bulk operations, data entry | Inline editing, sorting, batch actions |
| **Timeline** | Sprint planning, date visualization | Swimlanes, drag scheduling, backlog |
| **Gantt** | Resource planning, dependencies | Critical path, resource allocation, milestones |

## Switching Views

### Using the View Switcher

Click the view switcher in the top-right header:

```
[Kanban] [List] [Timeline] [Gantt]
```

### Keyboard Shortcuts

- `1` - Switch to Kanban
- `2` - Switch to List
- `3` - Switch to Timeline
- `4` - Switch to Gantt

### URL Deep Linking

Each view has a unique URL:

```
/tracker/:worktree/:board/kanban
/tracker/:worktree/:board/list
/tracker/:worktree/:board/timeline
/tracker/:worktree/:board/gantt
```

Views persist in your browser preferences.

---

## Kanban View

### Overview

The Kanban view displays issues as cards organized in vertical columns representing workflow states. It's the default view and best for daily execution and sprint work.

### Layout

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Backlog │ To Do   │ In Prog │ Review  │ Done    │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ [Card]  │ [Card]  │ [Card]  │         │ [Card]  │
│ [Card]  │ [Card]  │ [Card]  │         │ [Card]  │
│ [Card]  │         │         │         │ [Card]  │
│         │         │         │         │         │
│ + Add   │ + Add   │ + Add   │ + Add   │ + Add   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### Card Anatomy

Each card displays:

- **Issue ID** (MTH-001) with type badge
- **Title** (truncated if long)
- **Priority indicator** (colored border or icon)
- **Assignee avatar**
- **Labels** (color-coded chips)
- **Story points** (if set)
- **Child count** (for epics/stories)
- **Due date** (if approaching or overdue)
- **Dependency indicators** (if blocked)

### Features

#### Drag and Drop

Move issues between columns:

1. Click and hold a card
2. Drag to target column
3. Drop in desired position
4. Release to update status

Cards can be reordered within columns to prioritize work.

#### Parent Issue Context

Cards show their parent issue in a compact header:

```
┌────────────────────────────┐
│ Epic: User Authentication  │  ← Parent context
├────────────────────────────┤
│ MTH-002 [Story]            │
│ Login Flow                 │
│                            │
│ [Avatar] High  3pts        │
└────────────────────────────┘
```

#### WIP Limits

Columns can have Work In Progress (WIP) limits:

```
In Progress (3/5)  ← 3 issues, limit of 5
```

When a column exceeds its limit, it displays a warning color.

#### Quick Actions

Hover over a card to reveal quick actions:

- **Edit** - Open in detail panel
- **Assign** - Change assignee
- **Priority** - Change priority
- **Delete** - Remove issue

#### Filters

Filters apply to the kanban view:

- Hidden cards are excluded from all columns
- Column counts reflect filtered results
- Parent cards remain visible if any child matches

#### Column Customization

Customize columns in board settings:

- Rename columns
- Change colors
- Set WIP limits
- Reorder columns
- Add custom columns

### Best Practices

**Daily Standup**
- Review "In Progress" column
- Move completed items to "Done"
- Pull new work from "To Do"
- Identify blockers

**Sprint Planning**
- Focus on "Backlog" column
- Move items to "To Do" for sprint
- Estimate story points
- Assign owners

**Code Review**
- Monitor "Review" column
- Move reviewed items to "Done"
- Request changes by commenting
- Track review time

---

## List View

### Overview

The List view displays issues in a spreadsheet-style table with sortable columns and inline editing. It's best for bulk operations, data entry, and detailed review.

### Layout

```
┌────┬──────┬──────────────────┬────────┬────────┬──────────┬─────┐
│ ☐  │ ID   │ Title            │ Status │ Prior. │ Assignee │ ... │
├────┼──────┼──────────────────┼────────┼────────┼──────────┼─────┤
│ ☐  │ M-01 │ Timeline View    │ Done   │ High   │ Claude   │ ... │
│ ☐  │ M-02 │ Gantt Chart      │ Prog   │ High   │ User2    │ ... │
│ ☐  │ M-03 │ Dependencies     │ Todo   │ Med    │ -        │ ... │
└────┴──────┴──────────────────┴────────┴────────┴──────────┴─────┘
```

### Columns

Default columns:

1. **Checkbox** - Select for bulk actions
2. **ID** - Issue identifier with type badge
3. **Title** - Issue title (click to open)
4. **Status** - Current status (editable dropdown)
5. **Priority** - Priority level (editable dropdown)
6. **Assignee** - Avatar and name (editable)
7. **Labels** - Tags (editable chips)
8. **Story Points** - Estimate (editable number)
9. **Due Date** - Target date (editable date picker)
10. **Progress** - Completion percentage
11. **Actions** - Quick action menu

### Features

#### Inline Editing

Click any cell to edit in place:

- **Text fields** - Click to focus, type, press Enter
- **Dropdowns** - Click to show options, select
- **Date fields** - Click to show calendar, select date
- **Labels** - Click to show tag selector, add/remove

Changes save automatically.

#### Sorting

Click column headers to sort:

- First click: Ascending
- Second click: Descending
- Third click: Clear sort

Multi-column sorting:
- Hold Shift and click additional columns

#### Grouping

Group issues by any field:

```
Group by: [Status ▼]

□ Backlog (12)
  ☐ MTH-001 Timeline View
  ☐ MTH-002 Gantt Chart

□ In Progress (5)
  ☐ MTH-003 Dependencies
  ☐ MTH-004 Time Tracking
```

Group options:
- Status
- Priority
- Assignee
- Type
- Initiative
- Team
- Release
- Label

Collapse/expand groups by clicking the arrow.

#### Bulk Actions

Select multiple issues using checkboxes:

1. Check individual issues, or
2. Check column header to select all

Bulk actions toolbar appears:

```
☑ 3 selected  [Change Status ▼] [Assign ▼] [Add Label ▼] [Delete]
```

Available bulk actions:
- Change status
- Change priority
- Assign to user
- Add labels
- Remove labels
- Set due date
- Delete issues
- Move to board
- Link to initiative/release

#### Column Customization

Show/hide columns using the column selector:

```
[Columns ▼]
☑ ID
☑ Title
☑ Status
☑ Priority
☑ Assignee
☐ Start Date
☐ Due Date
☑ Labels
☐ Team
☐ Initiative
```

Drag column headers to reorder.

#### Filtering

All filters apply to the list view:

```
Type: [Task ▼] Status: [In Progress ▼] Priority: [High ▼]

Showing 5 of 42 issues
```

Active filters display as chips above the table.

#### Virtualization

Large datasets use virtual scrolling for performance:

- Only visible rows are rendered
- Smooth scrolling with thousands of issues
- No pagination needed

#### Export

Export filtered/selected issues:

```
[Export ▼]
- CSV
- Excel
- JSON
- Markdown
```

### Best Practices

**Data Entry**
- Use list view for creating many issues at once
- Inline editing is faster than detail panel
- Tab key moves between cells

**Bulk Updates**
- Select all issues for a sprint
- Bulk assign to team members
- Bulk update status after standup

**Review and Triage**
- Sort by priority, then status
- Group by assignee to balance workload
- Export for reporting

**Search and Filter**
- Use filters to find specific issues
- Save filter presets for common queries
- Export filtered results

---

## Timeline View

### Overview

The Timeline view displays issues on a horizontal timeline based on start and due dates. It's best for sprint planning, date-based visualization, and scheduling work.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ Week View ▼  [Today]  [← →]  Swimlane: Status ▼          │
├──────────────────────────────────────────────────────────┤
│ Jan 15    Jan 17    Jan 19    Jan 21    Jan 23    Jan 25 │
├──────────────────────────────────────────────────────────┤
│ Backlog                                                   │
│   [──────────────────────]                               │
│                                                           │
│ In Progress                                               │
│        [────────────]                                     │
│                  [──────]                                 │
│                                                           │
│ Done                                                      │
│   [────]                                                  │
└──────────────────────────────────────────────────────────┘
```

### Features

#### Time Scales

Choose your preferred time scale:

- **Day** - Hour-by-hour view
- **Week** - Day-by-day view (default)
- **Month** - Week-by-week view
- **Quarter** - Month-by-month view

#### Swimlanes

Group issues into horizontal swimlanes:

- **Status** - Group by status (default)
- **Assignee** - Group by person
- **Priority** - Group by priority level
- **Type** - Group by issue type
- **Team** - Group by team
- **Initiative** - Group by initiative
- **None** - Flat list

#### Issue Bars

Each issue appears as a horizontal bar:

```
[MTH-001: Timeline View ━━━━━━━━━━━━━━]
```

Bar characteristics:
- **Color** - Based on priority or type
- **Length** - From start_date to due_date
- **Label** - Issue ID and title
- **Position** - Vertical position in swimlane

#### Drag Scheduling

Drag issues to reschedule:

1. **Drag horizontally** - Change start and due dates
2. **Drag edges** - Extend or shorten duration
3. **Drag vertically** - Move to different swimlane (changes status/assignee)

Dates update automatically.

#### Today Indicator

A vertical line shows the current date:

```
│ Jan 15    Jan 17   │Jan 19   Jan 21    Jan 23    Jan 25 │
│                     ↑ Today                               │
```

Automatically scrolls to today on load.

#### Unscheduled Backlog

Issues without dates appear in a sidebar:

```
┌────────────────┐
│ Unscheduled    │
│ (Backlog)      │
├────────────────┤
│ [MTH-005]      │
│ No dates set   │
│                │
│ [MTH-006]      │
│ New issue      │
└────────────────┘
```

Drag from backlog to timeline to schedule.

#### Zoom Controls

Zoom in/out to adjust detail level:

```
[- □ +]  ← Zoom controls
```

Or use:
- `Ctrl + Scroll` to zoom
- `Ctrl + 0` to reset zoom

#### Milestones

Display release dates and sprints:

```
│ Jan 15    Jan 17    Jan 19  ▼ Sprint End   Jan 23   │
│                            Jan 21                     │
```

Milestones appear as vertical markers.

### Best Practices

**Sprint Planning**
- View entire sprint timeline
- Identify gaps and overlaps
- Balance workload across team
- Schedule based on dependencies

**Date Management**
- Set realistic start/due dates
- Account for weekends/holidays
- Leave buffer for unknowns
- Update dates as work progresses

**Resource Planning**
- Use Assignee swimlanes
- Identify overallocation
- Balance across team members
- Consider part-time availability

---

## Gantt View

### Overview

The Gantt view displays issues with dependencies, critical path, and resource allocation. It's best for complex project planning, dependency management, and resource optimization.

### Layout

```
┌────────────────┬──────────────────────────────────────────┐
│ Issue Tree     │ Timeline with Dependencies               │
├────────────────┼──────────────────────────────────────────┤
│ ▼ MTH-001 Epic │ [════════════════════════]               │
│   ▶ MTH-002 St │    [───────────]                         │
│   ▶ MTH-003 St │          [─────────]                     │
│     → MTH-004  │                [─────]──┐                │
│     → MTH-005  │                    [────]┘               │
└────────────────┴──────────────────────────────────────────┘
```

### Features

#### Hierarchical Tree

Left panel shows issue hierarchy:

```
▼ MTH-001 Epic: User Auth
  ▶ MTH-002 Story: Login
    → MTH-004 Task: API
    → MTH-005 Task: UI
  ▶ MTH-003 Story: Password Reset
    → MTH-006 Task: Email
```

- Click arrows to expand/collapse
- Indent shows parent-child relationships
- Icons show issue type

#### Dependency Lines

Visual lines show dependencies:

```
[Task A ─────]
              ╰──→ [Task B ─────]
```

Dependency types:
- **Solid line** - Blocks (finish-to-start)
- **Dashed line** - Related (informational)
- **Red line** - Circular dependency (error)

#### Critical Path

The critical path highlights in red:

```
[Task A ═══════]──→[Task B ═══════]──→[Task C ═══════]
     ↑ Critical path (longest dependency chain)
```

Any delay in critical path items delays the entire project.

#### Resource Allocation

Show resource usage per person:

```
Claude    ████████░░░░  80% allocated
User2     ██████░░░░░░  60% allocated
User3     ████████████  100% allocated (overallocated!)
```

Allocation based on:
- Estimated hours
- Task duration
- Working hours per day

#### Task Bars

Gantt bars show:

- **Blue** - Normal tasks
- **Orange** - Critical path
- **Red** - Overdue
- **Green** - Completed
- **Gray** - Not started

#### Milestones

Milestones appear as diamonds:

```
[Task ─────] ◆ Milestone [Task ─────]
```

Common milestones:
- Sprint end
- Release date
- Demo/review
- External deadline

#### Baseline Comparison

Compare current schedule to baseline:

```
Current:  [════════]
Baseline: [══════]  ← Original estimate
          └──┘ 2 days late
```

Shows schedule variance.

#### Resource Filtering

Filter by resource allocation:

```
Show: [Overallocated ▼]
```

Options:
- All resources
- Overallocated (>100%)
- Underallocated (<80%)
- Unassigned
- Specific person

### Gantt Controls

```
┌────────────────────────────────────────────────────┐
│ [Week ▼] [Critical Path ☑] [Dependencies ☑]       │
│ [Resources ☑] [Baseline ☐] [Filter Resources ▼]   │
└────────────────────────────────────────────────────┘
```

### Best Practices

**Project Planning**
- Identify critical path early
- Build in buffer time
- Account for dependencies
- Track baseline vs actual

**Dependency Management**
- Minimize dependencies where possible
- Avoid circular dependencies
- Document blocking reasons
- Update as work completes

**Resource Optimization**
- Balance workload across team
- Identify overallocation early
- Account for part-time/vacation
- Consider skill requirements

**Progress Tracking**
- Update completion regularly
- Compare to baseline
- Identify delays early
- Communicate changes

---

## View Preferences

### Saving View Preferences

Your preferred view is saved per board:

- Automatically saved when you switch views
- Persists in browser local storage
- Can be synced across devices (if logged in)

### Default View

Set a default view in settings:

```
Settings > Tracker > Default View: [Kanban ▼]
```

### View-Specific Settings

Each view has customizable settings:

**Kanban:**
- Card size (compact/normal/large)
- Show parent context
- Column width
- WIP limit warnings

**List:**
- Row height
- Column visibility
- Default sort order
- Group by default

**Timeline:**
- Default time scale
- Default swimlane mode
- Show unscheduled backlog
- Milestone visibility

**Gantt:**
- Show critical path by default
- Show dependency lines
- Show resource allocation
- Baseline comparison

---

## Tips for View Selection

### Choose Kanban When:

- ✓ Doing daily standups
- ✓ Executing sprint work
- ✓ Visualizing workflow
- ✓ Limiting WIP
- ✓ Quick status updates

### Choose List When:

- ✓ Bulk editing many issues
- ✓ Entering new issues quickly
- ✓ Sorting and filtering data
- ✓ Exporting for reports
- ✓ Reviewing detailed information

### Choose Timeline When:

- ✓ Planning sprints
- ✓ Visualizing schedules
- ✓ Balancing workload by date
- ✓ Identifying conflicts
- ✓ Scheduling new work

### Choose Gantt When:

- ✓ Planning complex projects
- ✓ Managing dependencies
- ✓ Optimizing resources
- ✓ Identifying critical path
- ✓ Comparing to baseline

## Keyboard Shortcuts

View-specific shortcuts:

**All Views:**
- `1-4` - Switch views
- `/` - Focus search
- `c` - Create issue
- `Esc` - Close detail panel

**Kanban:**
- `h/l` - Move card left/right
- `j/k` - Select next/previous card

**List:**
- `j/k` - Move selection
- `Enter` - Edit selected cell
- `Space` - Toggle checkbox
- `Shift+Click` - Select range

**Timeline/Gantt:**
- `+/-` - Zoom in/out
- `0` - Reset zoom
- `t` - Go to today
- `h/l` - Scroll left/right

---

## Next Steps

- **[Advanced Filtering](./filtering.md)** - Master search and filters across all views
- **[Initiatives & Teams](./initiatives-teams.md)** - Organize cross-cutting work
- **[Dependencies](./dependencies.md)** - Manage complex issue relationships

---

**Last Updated:** 2026-01-18
