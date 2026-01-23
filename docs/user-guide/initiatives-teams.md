# Initiatives and Teams Guide

Organize cross-cutting work with initiatives and coordinate people with teams in Martha Tracker.

## Initiatives

### What are Initiatives?

**Initiatives** are strategic goals that span multiple issues, boards, and sometimes even worktrees. They help you track high-level objectives and their progress.

Examples:
- "Mobile App Launch" (3 months, 5 epics, 3 teams)
- "Performance Optimization" (ongoing, multiple sprints)
- "GDPR Compliance" (cross-functional, deadline-driven)

### Creating an Initiative

**From the Sidebar:**

1. Click "Initiatives" in the sidebar
2. Click "+ New Initiative"
3. Fill in details:
   - **Name:** Timeline & Gantt Views
   - **Description:** Add advanced visualization
   - **Goal:** Enable better project planning
   - **Status:** In Progress
   - **Start Date:** 2026-01-15
   - **End Date:** 2026-02-15
   - **Owner:** Select owner
   - **Teams:** Select participating teams

4. Click "Create"

**From the API:**

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/initiatives \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App Launch",
    "description": "Native iOS and Android apps",
    "goal": "Reach mobile users",
    "status": "planning",
    "start_date": "2026-03-01",
    "end_date": "2026-06-30",
    "owner": {"id": "user-123", "name": "Product Manager"},
    "team_ids": ["team-mobile", "team-backend"]
  }'
```

### Initiative Fields

- **Name** (required) - Short, clear name
- **Description** - Detailed explanation
- **Goal** - Measurable objective
- **Status** - planning, in_progress, on_hold, completed, cancelled
- **Start Date** - When initiative begins
- **End Date** - Target completion date
- **Owner** - Responsible person
- **Teams** - Participating teams

### Linking Issues to Initiatives

**When Creating an Issue:**

```
Title: Implement iOS login screen
Type: Task
Initiative: [Mobile App Launch ▼]
```

**For Existing Issues:**

1. Open issue detail panel
2. Find "Initiative" field
3. Select from dropdown
4. Save

**Bulk Assignment:**

1. Switch to List view
2. Filter issues you want to assign
3. Select all with checkboxes
4. Click "Set Initiative" in bulk actions
5. Choose initiative
6. Apply

### Viewing Initiative Progress

**Initiative Detail View:**

```
┌──────────────────────────────────────────────────┐
│ Mobile App Launch                          [Edit]│
├──────────────────────────────────────────────────┤
│ Status: In Progress                              │
│ Timeline: Mar 1 - Jun 30 (4 months)              │
│ Owner: Product Manager                           │
│ Teams: Mobile, Backend                           │
│                                                  │
│ PROGRESS                                         │
│ ████████████░░░░  75% Complete                   │
│ 24 of 32 issues done                            │
│                                                  │
│ BY TYPE                                          │
│ Epics: ███░  3/4                                │
│ Stories: ████████░  8/10                        │
│ Tasks: ████████████░  13/18                     │
│                                                  │
│ BY TEAM                                          │
│ Mobile: ███████░  14/20                         │
│ Backend: ████████  10/12                        │
│                                                  │
│ TIMELINE                                         │
│ [Gantt chart showing initiative timeline]        │
│                                                  │
│ ISSUES                                           │
│ [List of linked issues]                          │
└──────────────────────────────────────────────────┘
```

**Dashboard Widget:**

Shows all active initiatives with progress bars.

### Initiative Reports

**Progress Report:**
- Total issues (planned vs complete)
- By type, team, status
- Burndown chart
- Velocity tracking

**Health Report:**
- On track / At risk / Behind
- Blocked issues count
- Overdue issues
- Resource allocation

**Export Options:**
- PDF summary
- Excel spreadsheet
- Presentation slides

### Initiative Best Practices

**1. Clear Goals**
- Make goals specific and measurable
- Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)

**2. Realistic Timelines**
- Build in buffer time
- Account for dependencies
- Consider team capacity

**3. Regular Reviews**
- Weekly status updates
- Monthly stakeholder reviews
- Adjust scope as needed

**4. Cross-Team Coordination**
- Assign clear owners
- Schedule sync meetings
- Use initiative as communication hub

---

## Teams

### What are Teams?

**Teams** are groups of people working together. Teams can be:
- Functional (Frontend, Backend, QA)
- Cross-functional (Squad A, Squad B)
- Temporary (Tiger Team, Task Force)

### Creating a Team

**From the Sidebar:**

1. Click "Teams" in the sidebar
2. Click "+ New Team"
3. Fill in details:
   - **Name:** Frontend Team
   - **Description:** React and UI development
   - **Members:** Add team members

4. Click "Create"

**From the API:**

```bash
curl -X POST http://localhost:20000/api/tracker/worktrees/martha-dev-v4/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Frontend Team",
    "description": "React and UI development",
    "members": [
      {"id": "user-123", "name": "Claude", "role": "developer"},
      {"id": "user-456", "name": "Designer", "role": "designer"}
    ]
  }'
```

### Team Fields

- **Name** (required) - Team name
- **Description** - Team purpose and focus
- **Members** - Team members with roles
  - id (required)
  - name (required)
  - role (developer, designer, pm, qa, etc.)
  - avatar (optional)

### Assigning Issues to Teams

Issues can be assigned to multiple teams:

```
Issue: Implement authentication
Assignee: Claude (individual)
Teams: Frontend, Backend, Security
```

**When Creating:**

```
Title: Build login component
Teams: [Frontend ▼] [+ Add Team]
```

**For Existing Issues:**

1. Open issue detail panel
2. Find "Teams" field
3. Select teams (multiple selection)
4. Save

### Team Views

**Team Dashboard:**

```
┌──────────────────────────────────────────────────┐
│ Frontend Team                            [Edit]  │
├──────────────────────────────────────────────────┤
│ Members: 5                                       │
│ Active Issues: 18                                │
│                                                  │
│ CAPACITY                                         │
│ Claude      ████████░░  80%  16h / 20h          │
│ Designer    ██████░░░░  60%  12h / 20h          │
│ Dev2        ████████░░  80%  16h / 20h          │
│                                                  │
│ CURRENT SPRINT                                   │
│ Planned: 45 points                               │
│ Completed: 28 points (62%)                       │
│ In Progress: 12 points                           │
│ Remaining: 5 points                              │
│                                                  │
│ ACTIVE ISSUES                                    │
│ [List of team's issues]                          │
│                                                  │
│ RECENT ACTIVITY                                  │
│ [Team activity feed]                             │
└──────────────────────────────────────────────────┘
```

**Filter by Team:**

```
Filter: Team: [Frontend ▼]
Result: Shows all Frontend team issues
```

**Team Timeline:**

View team's work on timeline:

```
Swimlane: [Team ▼]

Frontend ────[Issue 1]───[Issue 2]────[Issue 3]
Backend  ──────[Issue 4]────[Issue 5]
QA       ────────────────[Issue 6]───[Issue 7]
```

**Team Gantt:**

Resource allocation by team:

```
Team: Frontend
[Gantt showing resource usage across members]
```

### Team Reports

**Velocity Report:**
- Story points per sprint
- Trend over time
- Comparison to commitment

**Capacity Report:**
- Hours available vs allocated
- Overallocated members
- Underutilized capacity

**Workload Distribution:**
- Issues per person
- Story points per person
- Balance across team

**Cycle Time:**
- Average time from start to done
- By issue type
- Bottleneck identification

### Team Best Practices

**1. Right Team Size**
- 3-9 people ideal
- Too small: Single point of failure
- Too large: Communication overhead

**2. Clear Roles**
- Define member responsibilities
- Cross-train for resilience
- Rotate roles periodically

**3. Balanced Workload**
- Monitor allocation regularly
- Avoid overloading individuals
- Consider skill levels

**4. Team Metrics**
- Track velocity consistently
- Use for planning, not performance
- Celebrate improvements

---

## Initiatives + Teams

### Combining Initiatives and Teams

Map teams to initiatives:

```
Initiative: Mobile App Launch
├─ Team: Mobile (primary)
├─ Team: Backend (support)
└─ Team: QA (support)
```

**Initiative-Team Matrix:**

```
                │Frontend│Backend│Mobile│QA│Design
────────────────┼────────┼───────┼──────┼──┼──────
Mobile App      │   -    │   ●   │  ●●● │● │  ●●
GDPR Compliance │   ●    │  ●●●  │  -   │● │  -
Performance     │  ●●    │  ●●   │  ●   │● │  -

● = Supporting   ●● = Contributing   ●●● = Leading
```

**Cross-Team Coordination:**

```
Weekly Sync: Mobile App Initiative
Attendees: Leads from Mobile, Backend, QA, Design
Agenda:
- Progress updates
- Blockers and dependencies
- Resource needs
- Next week plan
```

### Resource Planning

**Initiative Resource View:**

```
Mobile App Launch
Total Effort: 480 hours (6 person-months)

By Team:
Mobile:  240h (50%)  ████████████░░░░░░░░░░░░
Backend: 120h (25%)  ████████████░░░░░░░░░░░░
QA:       80h (17%)  ████████░░░░░░░░░░░░░░░░
Design:   40h (8%)   ████░░░░░░░░░░░░░░░░░░░░
```

**Team Allocation:**

```
Frontend Team (5 people, 200h/week capacity)

Allocated:
Mobile App:      80h (40%)  ████████████████████░░░░░
GDPR:            40h (20%)  ██████████░░░░░░░░░░░░░░░
BAU/Support:     60h (30%)  ███████████████░░░░░░░░░░
Available:       20h (10%)  █████░░░░░░░░░░░░░░░░░░░░
```

### Portfolio View

See all initiatives and their team assignments:

```
┌─────────────────┬──────────┬─────────┬────────┐
│ Initiative      │ Timeline │ Teams   │ Status │
├─────────────────┼──────────┼─────────┼────────┤
│ Mobile App      │ 4 months │ 4 teams │ ⚠ Risk │
│ GDPR Compliance │ 2 months │ 3 teams │ ✓ Good │
│ Performance     │ Ongoing  │ 5 teams │ ✓ Good │
│ API v2          │ 6 months │ 2 teams │ 🕐 New  │
└─────────────────┴──────────┴─────────┴────────┘
```

---

## Examples

### Example: Mobile App Initiative

**Setup:**

1. Create initiative:
   - Name: "Mobile App Launch"
   - Timeline: Q1 2026
   - Goal: Ship iOS and Android apps

2. Create/assign teams:
   - Mobile Team (iOS/Android devs)
   - Backend Team (API support)
   - QA Team (Mobile testing)
   - Design Team (UX/UI)

3. Create epics:
   - Epic: iOS App
   - Epic: Android App
   - Epic: Backend API Updates
   - Epic: Mobile Analytics

4. Link epics to initiative

5. Assign teams to epics:
   - iOS App → Mobile Team (lead) + Backend (support)
   - Android App → Mobile Team (lead) + Backend (support)
   - Backend API → Backend Team (lead) + Mobile (support)
   - Analytics → Mobile + Backend + QA

6. Break down into stories/tasks

7. Track progress on initiative dashboard

### Example: Cross-Functional Squad

**Setup:**

1. Create team:
   - Name: "Squad Phoenix"
   - Type: Cross-functional
   - Members:
     - 2 Frontend Devs
     - 1 Backend Dev
     - 1 Designer
     - 1 QA

2. Create board: "Phoenix Squad Board"

3. Assign work to squad:
   - All issues → Team: Squad Phoenix
   - Individuals assigned within squad

4. Sprint planning:
   - Squad capacity: 100 points
   - Pull from backlog
   - Balance across members

5. Daily standup:
   - Filter: Team: Squad Phoenix
   - View: Kanban
   - Review in-progress

6. Sprint review:
   - Team velocity report
   - Retrospective
   - Plan improvements

---

## Next Steps

- **[Releases](./releases.md)** - Plan version releases
- **[Time Tracking](./time-tracking.md)** - Track time and effort
- **[Dependencies](./dependencies.md)** - Manage relationships

---

**Last Updated:** 2026-01-18
