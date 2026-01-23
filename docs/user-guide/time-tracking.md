# Time Tracking Guide

Track time, estimate effort, and analyze productivity with Martha Tracker's time tracking features.

## Overview

Time tracking helps you:
- Estimate work accurately
- Track actual time spent
- Compare estimates vs actuals
- Improve future estimates
- Generate time reports
- Bill clients (if applicable)

## Estimating Work

### Story Points

**Story points** are relative estimates of effort:

```
1 point  = Trivial (< 2 hours)
2 points = Simple (2-4 hours)
3 points = Moderate (4-8 hours)
5 points = Complex (1-2 days)
8 points = Very complex (3-5 days)
13 points = Too large (break it down)
```

**Setting Story Points:**

1. Open issue detail panel
2. Find "Story Points" field
3. Enter points (1, 2, 3, 5, 8, 13)
4. Save

**Bulk Estimation:**

1. Sprint planning meeting
2. Review backlog issues
3. Team estimates together
4. Use planning poker
5. Update story points in bulk

### Estimated Hours

**Estimated hours** are time-based estimates:

```
Estimated Hours: 8
```

More precise than story points, best for:
- Client billing
- Detailed planning
- Resource allocation
- Hour-tracking requirements

**Setting Estimated Hours:**

1. Open issue detail panel
2. Find "Time Tracking" section
3. Enter estimated hours
4. Save

## Logging Time

### Manual Time Entry

**From Issue Detail Panel:**

1. Open issue
2. Switch to "Time Tracking" tab
3. Click "Log Time"
4. Fill in form:
   - Hours: 2.5
   - Description: "Implemented drag and drop"
   - Date: 2026-01-18 (defaults to today)
5. Click "Save"

**From List View:**

1. Click time cell
2. Enter hours inline
3. Auto-saves

### Time Entry Details

Each entry includes:
- **User ID** - Who logged the time
- **User Name** - Display name
- **Hours** - Time spent (decimal)
- **Description** - What was done
- **Date** - When work was done
- **Created At** - When entry was logged

### Editing Time Entries

1. Open issue
2. Go to "Time Tracking" tab
3. Find entry to edit
4. Click edit icon
5. Update fields
6. Save

### Deleting Time Entries

1. Open issue
2. Go to "Time Tracking" tab
3. Find entry to delete
4. Click delete icon
5. Confirm

Time totals update automatically.

## Time Tracking UI

### Issue Detail Panel

```
┌─────────────────────────────────────────┐
│ TIME TRACKING                           │
├─────────────────────────────────────────┤
│ Estimated: 8h                           │
│ Logged: 5.5h (69%)                      │
│ Remaining: 2.5h                         │
│                                         │
│ Progress: ████████████░░░░░             │
│                                         │
│ [Log Time] [View Details]               │
└─────────────────────────────────────────┘
```

### Time Entries List

```
┌─────────────────────────────────────────┐
│ TIME ENTRIES (5.5h total)               │
├─────────────────────────────────────────┤
│ Jan 18  Claude    2.5h  [Edit] [Delete]│
│ "Implemented drag and drop"             │
│                                         │
│ Jan 17  Claude    2.0h  [Edit] [Delete]│
│ "Research and design"                   │
│                                         │
│ Jan 16  Claude    1.0h  [Edit] [Delete]│
│ "Initial setup"                         │
├─────────────────────────────────────────┤
│ Total: 5.5h / 8h (69%)                  │
│ + Log Time                              │
└─────────────────────────────────────────┘
```

### Time Tracking Chart

```
┌─────────────────────────────────────────┐
│ TIME BREAKDOWN                          │
├─────────────────────────────────────────┤
│ Estimated     [████████        ] 8h     │
│ Logged        [█████████░      ] 5.5h   │
│ Remaining     [██░             ] 2.5h   │
│                                         │
│ Daily Breakdown:                        │
│ Jan 16 ██                               │
│ Jan 17 ████                             │
│ Jan 18 █████                            │
└─────────────────────────────────────────┘
```

## Time Tracking Reports

### Personal Time Report

View your logged time:

```
┌─────────────────────────────────────────┐
│ TIME REPORT: Claude                     │
│ Jan 15 - Jan 21, 2026                   │
├─────────────────────────────────────────┤
│ Total Hours: 32.5h                      │
│ Billable: 28h                           │
│ Non-billable: 4.5h                      │
│                                         │
│ BY DAY                                  │
│ Mon: 6h  ████████                       │
│ Tue: 8h  ██████████                     │
│ Wed: 7h  █████████                      │
│ Thu: 5.5h ███████                       │
│ Fri: 6h  ████████                       │
│                                         │
│ BY PROJECT                              │
│ Timeline Views: 18h (55%)               │
│ Bug Fixes: 8h (25%)                     │
│ Documentation: 4.5h (14%)               │
│ Meetings: 2h (6%)                       │
│                                         │
│ BY TYPE                                 │
│ Development: 22h (68%)                  │
│ Review: 6h (18%)                        │
│ Planning: 2.5h (8%)                     │
│ Meetings: 2h (6%)                       │
│                                         │
│ [Export PDF] [Export CSV]               │
└─────────────────────────────────────────┘
```

### Team Time Report

```
┌─────────────────────────────────────────┐
│ TEAM TIME REPORT: Frontend              │
│ Jan 15 - Jan 21, 2026                   │
├─────────────────────────────────────────┤
│ Total Hours: 98h                        │
│ Team Size: 3 people                     │
│ Avg/Person: 32.7h                       │
│                                         │
│ BY PERSON                               │
│ Claude:    32.5h  ████████████          │
│ Dev2:      35h    ██████████████        │
│ Designer:  30.5h  ████████████          │
│                                         │
│ BY PROJECT                              │
│ Timeline Views: 55h (56%)               │
│ Bug Fixes: 25h (26%)                    │
│ Documentation: 12h (12%)                │
│ Meetings: 6h (6%)                       │
│                                         │
│ UTILIZATION                             │
│ Available: 120h (3 people × 40h)        │
│ Logged: 98h                             │
│ Rate: 82%                               │
│                                         │
│ [Export] [Share]                        │
└─────────────────────────────────────────┘
```

### Project Time Report

```
┌─────────────────────────────────────────┐
│ PROJECT TIME REPORT                     │
│ Timeline Views (MTH-001)                │
├─────────────────────────────────────────┤
│ Total Estimated: 80h                    │
│ Total Logged: 55h (69%)                 │
│ Remaining: 25h                          │
│ Projected Total: 82h (+2h)              │
│                                         │
│ BY PERSON                               │
│ Claude:    Est 35h  Actual 30h  -5h     │
│ Dev2:      Est 30h  Actual 18h  -12h    │
│ Designer:  Est 15h  Actual 7h   -8h     │
│                                         │
│ BY SUB-ISSUE                            │
│ Basic Layout:     Est 20h  Act 18h  90% │
│ Drag & Drop:      Est 30h  Act 25h  83% │
│ Swimlanes:        Est 20h  Act 12h  60% │
│ Backlog Sidebar:  Est 10h  Act 0h   0%  │
│                                         │
│ BURN RATE                               │
│ Week 1: 25h                             │
│ Week 2: 30h (↑20%)                      │
│ Avg: 27.5h/week                         │
│                                         │
│ STATUS: ✓ On Track                      │
└─────────────────────────────────────────┘
```

## Time Tracking Analysis

### Estimate Accuracy

Compare estimates to actuals:

```
┌─────────────────────────────────────────┐
│ ESTIMATE ACCURACY REPORT                │
│ Last 3 months                           │
├─────────────────────────────────────────┤
│ Issues Analyzed: 120                    │
│                                         │
│ ACCURACY BY TYPE                        │
│ Tasks:   Avg +10% (slight over)         │
│ Stories: Avg -5% (slight under)         │
│ Bugs:    Avg +25% (often over)          │
│                                         │
│ ACCURACY BY PERSON                      │
│ Claude:    Avg +2% (accurate)           │
│ Dev2:      Avg -15% (underestimates)    │
│ Designer:  Avg +20% (overestimates)     │
│                                         │
│ TRENDS                                  │
│ Improving: ✓ Last 30 days +15% better  │
│ Recommendation: Continue current        │
│ estimation process                      │
└─────────────────────────────────────────┘
```

### Velocity Tracking

Story points completed per sprint:

```
┌─────────────────────────────────────────┐
│ VELOCITY REPORT: Frontend Team          │
├─────────────────────────────────────────┤
│ Sprint 1: 35 points  ███████            │
│ Sprint 2: 42 points  ████████           │
│ Sprint 3: 38 points  ████████           │
│ Sprint 4: 45 points  █████████          │
│ Sprint 5: 40 points  ████████           │
│                                         │
│ Average Velocity: 40 points/sprint      │
│ Trend: ↑ Increasing                     │
│                                         │
│ PLANNING GUIDE                          │
│ Conservative: 35 points                 │
│ Realistic: 40 points                    │
│ Aggressive: 45 points                   │
└─────────────────────────────────────────┘
```

### Cycle Time

Time from start to done:

```
┌─────────────────────────────────────────┐
│ CYCLE TIME REPORT                       │
├─────────────────────────────────────────┤
│ AVERAGE CYCLE TIME                      │
│ Tasks:   2.5 days                       │
│ Stories: 5 days                         │
│ Bugs:    1 day                          │
│                                         │
│ BY STATUS (avg days)                    │
│ Backlog → Todo:        0.5 days         │
│ Todo → In Progress:    1 day            │
│ In Progress → Review:  2 days           │
│ Review → Done:         1 day            │
│                                         │
│ BOTTLENECKS                             │
│ ⚠ In Progress phase taking 2× expected │
│ Recommendation: Review WIP limits       │
└─────────────────────────────────────────┘
```

## Best Practices

### 1. Estimate Before Starting

Always set estimates:
- Helps with planning
- Provides baseline
- Enables comparison

### 2. Log Time Daily

Don't wait until end of week:
- More accurate
- Less forgotten time
- Better tracking

### 3. Be Specific in Descriptions

Good descriptions:
```
✓ "Implemented user authentication API"
✓ "Fixed login redirect bug"
✓ "Code review for PR #123"
```

Bad descriptions:
```
✗ "Work"
✗ "Stuff"
✗ "Various tasks"
```

### 4. Track All Time

Include:
- Development time
- Code review time
- Meeting time
- Research time
- Bug investigation

### 5. Review Regularly

Weekly review:
- Check logged vs estimated
- Identify patterns
- Adjust estimates
- Share learnings

### 6. Use for Planning, Not Performance

Time tracking is for:
- ✓ Better estimation
- ✓ Project planning
- ✓ Resource allocation
- ✓ Identifying bottlenecks

Not for:
- ✗ Performance reviews
- ✗ Micromanagement
- ✗ Punishment
- ✗ Comparison between people

### 7. Break Down Large Estimates

If estimate > 1 week:
- Break into smaller issues
- Estimate each piece
- Sum for total

More accurate than one big estimate.

### 8. Update Estimates

If midway through work:
- Actual > estimate by 20%+
- Update remaining estimate
- Document why
- Share with team

### 9. Track Non-Development Time

Log time for:
- Meetings
- Code review
- Planning/refinement
- Learning/research
- Helping teammates

Accounts for full day.

### 10. Review Team Velocity

Every sprint:
- Calculate velocity
- Note trends
- Adjust next sprint capacity
- Share with stakeholders

## Time Tracking Shortcuts

**Quick Log:**
```
/log 2.5h Implemented feature X
```

**Today's Time:**
```
/time today
```

**This Week:**
```
/time week
```

**Add to Current Issue:**
```
/log 1h Code review
```

## Integration with Tools

### Calendar Integration

Sync time entries with calendar:
- Export to Google Calendar
- Block time on calendar
- Compare actual vs scheduled

### Billing Integration

Export for invoicing:
- Filter by billable flag
- Export to CSV
- Import to billing system
- Generate invoices

### Reporting Tools

Export data to:
- Tableau
- Power BI
- Google Sheets
- Excel

For custom analysis and visualization.

## Example Workflow

**Daily Routine:**

1. **Morning:**
   - Review yesterday's time entries
   - Plan today's work
   - Note estimates for tasks

2. **Throughout Day:**
   - Log time when switching tasks
   - Note what was done
   - Update issue status

3. **End of Day:**
   - Review all logged time
   - Fill in any gaps
   - Check totals

4. **Weekly:**
   - Review week's time report
   - Compare to estimates
   - Note improvements for next week

5. **Sprint End:**
   - Calculate velocity
   - Review estimate accuracy
   - Plan next sprint capacity

## Next Steps

- **[Dependencies](./dependencies.md)** - Manage issue relationships
- **[Tracker Overview](./tracker-overview.md)** - Back to basics

---

**Last Updated:** 2026-01-18
