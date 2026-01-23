# Gantt View - Progress Tracking & Resource Allocation

Implementation of **MTH-049**: Progress Tracking & Resource Allocation features for the Martha tracker Gantt View.

## Overview

This module provides comprehensive resource allocation tracking and progress visualization for the Gantt view, enabling teams to:

- Track resource utilization across team members
- Identify over-allocated resources
- Visualize task progress with color-coded indicators
- Filter Gantt view by assignee
- Monitor project health through progress metrics

## Components

### 1. ResourcePanel.tsx

**Purpose**: Side panel showing team resource allocation with utilization metrics

**Features**:
- 300px width, positioned on right side
- Displays all team members with assigned tasks
- Shows per team member:
  - Avatar and name
  - Task count
  - Total estimated hours
  - Utilization percentage
  - Over-allocation warnings (>40h/week in red)
- Click team member to filter Gantt to their tasks
- Collapsible design for more Gantt space
- Scrollable list
- Summary cards showing:
  - Average utilization
  - Over-allocated count
  - Total capacity

**Props**:
```typescript
interface ResourcePanelProps {
  issues: Issue[];
  selectedAssignee: string | null;
  onSelectAssignee: (userId: string | null) => void;
  availableHoursPerWeek?: number; // Default: 40
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

### 2. ResourceAllocationBar.tsx

**Purpose**: Visual bar showing workload per team member with color-coded utilization

**Features**:
- Color-coded utilization levels:
  - **Green** (Healthy): Under 30h/week
  - **Yellow** (At Capacity): 30-40h/week
  - **Orange** (Over-allocated): 40-50h/week
  - **Red** (Severely Over-allocated): >50h/week
- Shows hours as text: "35h / 40h"
- Displays utilization percentage
- Overflow indicator for >100% utilization (striped pattern)
- Task breakdown on hover

**Props**:
```typescript
interface ResourceAllocationBarProps {
  allocation: ResourceAllocation;
  onClick?: () => void;
  showDetails?: boolean;
}
```

### 3. ResourceFilterControls.tsx

**Purpose**: Dropdown to filter Gantt view by team member assignee

**Features**:
- "All Team Members" option (default)
- Individual team member options
- Shows task count per assignee
- Shows over-allocation warning icon
- Positioned in Gantt toolbar
- Dropdown with search and selection

**Props**:
```typescript
interface ResourceFilterControlsProps {
  issues: Issue[];
  selectedAssignee: string | null;
  onSelectAssignee: (userId: string | null) => void;
}
```

### 4. GanttTaskBar.tsx

**Purpose**: Individual task bar for Gantt chart with progress visualization

**Features**:
- Progress fill: Darker shade of task color
- Progress percentage text on bar (if space)
- For parent tasks (epics/stories): Show child completion
- Gradient fill for progress (left to right)
- Animated progress changes
- Over-allocation visual indicator (orange tint)
- Completion checkmark for 100% tasks
- Milestone markers for 50% completion (parent tasks)
- Hover tooltip with details

**Props**:
```typescript
interface GanttTaskBarProps {
  issue: Issue;
  allIssues: Issue[];
  startDate: Date;
  endDate: Date;
  ganttStartDate: Date;
  ganttEndDate: Date;
  rowHeight: number;
  onClick?: () => void;
  isSelected?: boolean;
  isOverAllocated?: boolean;
}
```

## Hooks

### useResourceAllocation.ts

**Purpose**: Custom hook for resource allocation calculations

**Features**:
- Calculates total hours per assignee
- Calculates utilization percentage
- Identifies over-allocated team members
- Groups tasks by assignee
- Provides aggregate metrics

**Returns**:
```typescript
{
  allocations: ResourceAllocation[];
  metrics: {
    totalTeamMembers: number;
    overAllocatedCount: number;
    totalAllocatedHours: number;
    totalAvailableHours: number;
    averageUtilization: number;
    capacityRemaining: number;
  };
}
```

**ResourceAllocation Interface**:
```typescript
interface ResourceAllocation {
  userId: string;
  userName: string;
  userAvatar: string;
  taskCount: number;
  totalHours: number;
  availableHours: number; // Default 40h/week
  utilizationPercent: number;
  isOverAllocated: boolean;
  severityLevel: 'healthy' | 'at-capacity' | 'over-allocated' | 'severely-over-allocated';
  tasks: Issue[];
}
```

## Utility Functions

### calculateTaskProgress(issue, allIssues)

Calculates progress percentage for tasks:

- **Epics/Stories**: Aggregate of child completion (% of children done)
- **Tasks/Bugs**: Binary (0% or 100%)

```typescript
function calculateTaskProgress(issue: Issue, allIssues: Issue[]): number
```

### getProgressColor(percentage, baseColor)

Returns darker shade of base color for progress fill visualization.

### formatDuration(hours)

Formats hours into human-readable duration (e.g., "2d 4h", "35h", "45m").

### getUtilizationColor(severityLevel)

Returns color scheme for utilization level:
```typescript
{
  bg: string;      // Background color
  fill: string;    // Fill color
  text: string;    // Text color
  border: string;  // Border color
}
```

### formatHours(hours)

Formats hours for compact display (e.g., "35h", "2d", "45m").

## Resource Allocation Logic

### Calculation Formula

```
Total Hours = Sum of all estimated_duration for assigned tasks
Available Hours = 40h/week (configurable)
Utilization % = (Total Hours / Available Hours) × 100
Over-allocated = Utilization > 100%
```

### Severity Levels

| Level | Hours | Utilization | Color |
|-------|-------|-------------|-------|
| Healthy | ≤30h | ≤75% | Green |
| At Capacity | 30-40h | 75-100% | Yellow |
| Over-allocated | 40-50h | 100-125% | Orange |
| Severely Over-allocated | >50h | >125% | Red |

### Progress Calculation

**For Tasks/Bugs**:
- 0% if status is not done/closed/completed
- 100% if status is done/closed/completed

**For Stories**:
- % = (Completed child tasks / Total child tasks) × 100

**For Epics**:
- % = (Completed child stories / Total child stories) × 100
- Can be weighted by story points if available

## Integration Example

```tsx
import { useState } from 'react';
import {
  ResourcePanel,
  ResourceFilterControls,
  GanttTaskBar,
  useResourceAllocation,
} from './components/tracker/gantt';

function GanttView({ issues }: { issues: Issue[] }) {
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Filter issues by selected assignee
  const filteredIssues = selectedAssignee
    ? issues.filter(issue => issue.assignee?.id === selectedAssignee)
    : issues;

  return (
    <div className="gantt-view flex h-full">
      {/* Main Gantt Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="gantt-toolbar p-4 flex items-center gap-3">
          <ResourceFilterControls
            issues={issues}
            selectedAssignee={selectedAssignee}
            onSelectAssignee={setSelectedAssignee}
          />
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-auto">
          {/* Render GanttTaskBar for each issue */}
          {filteredIssues.map(issue => (
            <GanttTaskBar
              key={issue.id}
              issue={issue}
              allIssues={issues}
              startDate={new Date(issue.start_date)}
              endDate={new Date(issue.due_date)}
              ganttStartDate={ganttStart}
              ganttEndDate={ganttEnd}
              rowHeight={48}
            />
          ))}
        </div>
      </div>

      {/* Resource Panel */}
      <ResourcePanel
        issues={issues}
        selectedAssignee={selectedAssignee}
        onSelectAssignee={setSelectedAssignee}
        isCollapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />
    </div>
  );
}
```

## Styling

All components use the warm color palette:

- **Coral**: #D97F6F
- **Gold**: #E0B666
- **Green**: #52A560
- **Blue**: #6B9BD1
- **Purple**: #8B7AA8
- **Orange**: #E8A93A
- **Backgrounds**: #FDFBF9, #F5F4F2
- **Borders**: #E8E0D5
- **Text**: #2F241B, #6B5D52, #A39686

## Lines of Code

| File | Lines | Description |
|------|-------|-------------|
| useResourceAllocation.ts | 154 | Resource allocation hook and utilities |
| ResourceAllocationBar.tsx | 127 | Allocation bar component |
| ResourcePanel.tsx | 287 | Resource panel component |
| ResourceFilterControls.tsx | 257 | Filter controls component |
| GanttTaskBar.tsx | 251 | Task bar with progress visualization |
| utils.ts (additions) | 59 | Progress calculation utilities |
| index.ts | 11 | Component exports |
| **Total** | **1,146** | **All components** |

## Future Enhancements

- [ ] Drag-and-drop task reassignment from resource panel
- [ ] Suggested task reallocation algorithm
- [ ] Historical utilization trends
- [ ] Team velocity tracking
- [ ] Burndown charts integration
- [ ] Capacity planning tools
- [ ] Load balancing recommendations
- [ ] Export resource allocation reports
- [ ] Calendar view integration
- [ ] Slack/email notifications for over-allocation
