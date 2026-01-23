# Martha Tracker Overview

## Introduction

Martha Tracker is a comprehensive issue tracking and project management system designed specifically for development workflows. It provides powerful visualization tools, hierarchical issue organization, and deep integration with development practices.

## What is Martha Tracker?

Martha Tracker helps development teams:

- **Plan work** with epics, stories, and tasks
- **Visualize progress** across kanban, list, timeline, and Gantt views
- **Track time** and estimate effort accurately
- **Manage dependencies** between issues
- **Coordinate teams** across multiple initiatives
- **Plan releases** with clear milestones
- **Document decisions** and link to issues
- **Monitor engagement** and activity

## Key Concepts

### Worktrees

A **worktree** represents a project or repository. Each worktree can contain multiple boards.

Example: `martha-dev-v4`, `communications-service`

### Boards

A **board** organizes issues within a worktree using kanban columns. Teams can create multiple boards for different aspects of a project.

Example boards:
- "Phase 1: Foundation" - Core infrastructure work
- "Frontend Development" - UI components and pages
- "Backend API" - API endpoints and services
- "Infrastructure" - DevOps and deployment

### Issues

Issues represent work items and come in four types:

1. **Epic** - Large body of work spanning multiple stories/tasks
2. **Story** - User-facing feature or capability
3. **Task** - Technical work item
4. **Bug** - Defect or issue to fix

Issues form a hierarchy:
```
Epic
├── Story
│   ├── Task
│   └── Task
└── Story
    └── Task
```

### Issue States

Every issue moves through these states:

1. **Backlog** - Not yet scheduled
2. **To Do** - Scheduled for current sprint
3. **In Progress** - Actively being worked on
4. **Review** - Under review (code review, testing, etc.)
5. **Done** - Completed

### Priorities

Issues have four priority levels:

- **Critical** - Urgent, blocks other work
- **High** - Important, should be done soon
- **Medium** - Normal priority (default)
- **Low** - Nice to have, can wait

## Getting Started

### 1. Access the Tracker

Navigate to the tracker page in the Martha dashboard:

```
http://localhost:20000/tracker
```

Or if using the production URL:

```
https://martha.arch.ie/tracker
```

### 2. Select a Worktree

Use the worktree dropdown in the header to select your project:

```
[Martha Development v4 ▼]
```

### 3. Select a Board

Choose a board from the board dropdown:

```
[Phase 1: Foundation ▼]
```

### 4. Choose a View

Select your preferred view using the view switcher:

- **Kanban** - Card-based columns (default)
- **List** - Spreadsheet-style table
- **Timeline** - Date-based horizontal timeline
- **Gantt** - Resource planning and dependencies

## Understanding the Interface

### Header Bar

The header contains:

```
┌────────────────────────────────────────────────────────────┐
│ [Worktree ▼] [Board ▼] [Search...] │ [View] [Stats] [Live] │
└────────────────────────────────────────────────────────────┘
```

- **Worktree Selector** - Switch between projects
- **Board Selector** - Switch between boards
- **Search Box** - Full-text search across issues
- **View Switcher** - Change between kanban/list/timeline/gantt
- **Statistics** - Quick stats (epics, stories, tasks)
- **Live Indicator** - Shows real-time connection status
- **New Issue Button** - Create new issue

### Sidebar Navigation

The left sidebar provides:

- **Recent Issues** - Recently viewed issues
- **My Issues** - Issues assigned to you
- **Initiatives** - Strategic initiatives
- **Teams** - Team organization
- **Releases** - Version planning

### Filter Bar

Below the header, the filter bar lets you refine the view:

```
Type: [All ▼] Priority: [All ▼] Initiative: [All ▼] Team: [All ▼] [More Filters]
```

Advanced filters include:
- Assignee
- Labels
- Start/Due dates
- Story points
- Status
- Custom fields

### Statistics Bar

Shows key metrics for the current board:

- Total issues by type
- Completion percentage
- Story points (planned vs completed)
- Average cycle time
- Work in progress count

## Common Workflows

### Creating an Issue

1. Click "**+ New Issue**" in the header
2. Enter a title
3. Select type (epic, story, task, bug)
4. Click "Create"
5. Fill in details in the detail panel

Or use the kanban column's "+ Add Issue" button to create directly in a specific status.

### Moving an Issue

**Kanban View:**
- Drag and drop cards between columns

**List View:**
- Click the status cell and select new status

**Timeline/Gantt:**
- Drag the issue bar to change dates
- Status changes automatically based on dates

### Viewing Issue Details

Click any issue card/row to open the detail panel on the right:

```
┌─────────────────────────────────┐
│ MTH-001 [Epic]            [×]   │
├─────────────────────────────────┤
│ Timeline View                   │
│ Status: In Progress  Priority: High
│ Assignee: [Avatar] Claude       │
│                                 │
│ Description...                  │
│                                 │
│ [Comments] [Activity] [Time]    │
└─────────────────────────────────┘
```

The detail panel shows:
- Full description (markdown supported)
- Status, priority, assignee
- Labels and custom fields
- Parent/child relationships
- Dependencies
- Comments and activity
- Time tracking
- Linked documentation
- Quality metrics
- Policy compliance

### Adding Comments

1. Open issue detail panel
2. Switch to "Comments" tab
3. Type your comment (markdown supported)
4. Click "Add Comment"

Comments support:
- Markdown formatting
- @mentions
- Code blocks
- Links to other issues (MTH-123)

### Tracking Time

1. Open issue detail panel
2. Switch to "Time Tracking" tab
3. Click "Log Time"
4. Enter hours and description
5. Click "Save"

Time tracking shows:
- Estimated hours
- Logged hours
- Remaining hours
- Burndown chart
- Time entries by user

### Managing Dependencies

1. Open issue detail panel
2. Scroll to "Dependencies" section
3. Click "Add Dependency"
4. Select relationship type:
   - **Blocks** - This issue blocks another
   - **Blocked By** - This issue is blocked by another
   - **Related** - General relationship
5. Select target issue
6. Click "Add"

Dependencies appear in:
- Issue detail panel
- Gantt view (with connecting lines)
- Dependency graph

### Linking Documentation

1. Open issue detail panel
2. Scroll to "Documentation" section
3. Click "Add Documentation"
4. Select documentation type:
   - Overview
   - Technical Spec
   - API Reference
   - Guide
   - Troubleshooting
5. Write or link existing doc
6. Click "Save"

Documentation appears in:
- Issue detail panel
- Documentation browser
- Search results

## Search and Filtering

### Quick Search

Use the search box in the header for full-text search:

```
Search: "authentication bug"
```

Searches across:
- Issue titles
- Descriptions
- Comments
- Labels

### Special Search Syntax

Use special prefixes for precise searches:

```
type:epic              → Find all epics
priority:high          → High priority issues
status:in_progress     → Issues in progress
assignee:@claude       → Issues assigned to Claude
label:frontend         → Issues with "frontend" label
parent:MTH-001         → Children of MTH-001
```

### Advanced Filters

Click "More Filters" to access advanced options:

- **Date Ranges** - Start date, due date
- **Story Points** - Estimation range
- **Teams** - Filter by team
- **Initiatives** - Filter by initiative
- **Releases** - Filter by target release
- **Watchers** - Issues you're watching
- **Recently Updated** - Modified in last N days

### Saving Filters

Save commonly used filters:

1. Apply desired filters
2. Click "Save Filter"
3. Enter a name
4. Filter appears in sidebar

## Keyboard Shortcuts

Speed up your workflow with shortcuts:

### Navigation
- `k` - Move selection up
- `j` - Move selection down
- `Enter` - Open selected issue
- `Esc` - Close detail panel
- `/` - Focus search box

### Issue Actions
- `c` - Create new issue
- `e` - Edit current issue
- `d` - Delete current issue
- `a` - Assign to me
- `w` - Add/remove watcher

### View Switching
- `1` - Kanban view
- `2` - List view
- `3` - Timeline view
- `4` - Gantt view

### Quick Status Changes
- `b` - Move to Backlog
- `t` - Move to To Do
- `i` - Move to In Progress
- `r` - Move to Review
- `x` - Move to Done

## Tips and Best Practices

### 1. Use Hierarchical Structure

Organize work hierarchically:

```
Epic: User Authentication
├── Story: Login Flow
│   ├── Task: Create login API endpoint
│   ├── Task: Build login UI component
│   └── Task: Add password validation
└── Story: Password Reset
    ├── Task: Email notification system
    └── Task: Reset token generation
```

### 2. Keep Issues Focused

Each issue should be:
- **Specific** - Clear, actionable goal
- **Measurable** - Know when it's done
- **Reasonable** - Can be completed in a sprint
- **Independent** - Minimal dependencies

### 3. Use Labels Effectively

Create a consistent labeling system:

- **Domain** - `frontend`, `backend`, `database`, `devops`
- **Type** - `enhancement`, `refactor`, `tech-debt`
- **Status** - `blocked`, `ready-for-review`, `needs-testing`
- **Priority** - Use priority field instead
- **Component** - `auth`, `api`, `ui`, `docs`

### 4. Estimate Accurately

Use story points for estimation:

- **1 point** - Trivial (< 2 hours)
- **2 points** - Simple (2-4 hours)
- **3 points** - Moderate (4-8 hours)
- **5 points** - Complex (1-2 days)
- **8 points** - Very complex (3-5 days)
- **13 points** - Too large, break it down

### 5. Track Time Regularly

Log time as you work:

- Log daily, not weekly
- Be specific in descriptions
- Include context (meetings, research, etc.)
- Review at end of sprint

### 6. Link Related Work

Create connections between issues:

- **Parent-Child** - For hierarchical structure
- **Dependencies** - For blocking relationships
- **Related** - For loosely connected work
- **Documentation** - For technical specs

### 7. Use Views Effectively

Choose the right view for the task:

- **Kanban** - Daily work, sprint planning
- **List** - Bulk operations, detailed review
- **Timeline** - Date-based planning, sprint overview
- **Gantt** - Resource planning, dependency management

### 8. Communicate in Issues

Keep communication in issues:

- Comment on progress
- Tag teammates with @mentions
- Link to pull requests
- Document decisions
- Share screenshots

### 9. Review Regularly

Make time for regular reviews:

- **Daily** - Update issue statuses
- **Weekly** - Review completed work
- **Sprint End** - Retrospective, burndown analysis
- **Release** - Close completed issues, plan next release

### 10. Keep it Updated

Maintain data quality:

- Update statuses promptly
- Log time regularly
- Comment on blockers
- Link PRs when created
- Close issues when done

## Next Steps

Now that you understand the basics:

1. **[View Modes](./view-modes.md)** - Learn about kanban, list, timeline, and Gantt views
2. **[Advanced Filtering](./filtering.md)** - Master search and filters
3. **[Initiatives & Teams](./initiatives-teams.md)** - Organize cross-cutting work
4. **[Releases](./releases.md)** - Plan and track releases
5. **[Time Tracking](./time-tracking.md)** - Estimate and log time
6. **[Dependencies](./dependencies.md)** - Manage issue relationships

## Support

Need help?

- **Documentation** - Browse the full docs
- **Search** - Use the search bar
- **GitHub Issues** - Report bugs or request features
- **Community** - Join the discussion

---

**Last Updated:** 2026-01-18
