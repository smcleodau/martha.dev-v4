# MTH-049 Quick Reference Card

## Import Components

```typescript
import {
  ResourcePanel,
  ResourceAllocationBar,
  ResourceFilterControls,
  GanttTaskBar,
  useResourceAllocation,
  type ResourceAllocation,
} from './components/tracker/gantt';
```

## Basic Usage

### 1. Resource Panel (Side Panel)

```tsx
const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

<ResourcePanel
  issues={allIssues}
  selectedAssignee={selectedAssignee}
  onSelectAssignee={setSelectedAssignee}
  availableHoursPerWeek={40}
  isCollapsed={isPanelCollapsed}
  onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
/>
```

### 2. Filter Controls (Toolbar)

```tsx
<ResourceFilterControls
  issues={allIssues}
  selectedAssignee={selectedAssignee}
  onSelectAssignee={setSelectedAssignee}
/>
```

### 3. Task Bar with Progress

```tsx
<GanttTaskBar
  issue={issue}
  allIssues={allIssues}
  startDate={new Date(issue.start_date)}
  endDate={new Date(issue.due_date)}
  ganttStartDate={ganttStart}
  ganttEndDate={ganttEnd}
  rowHeight={48}
  onClick={() => handleTaskClick(issue)}
  isSelected={selectedIssue?.id === issue.id}
  isOverAllocated={allocation?.isOverAllocated}
/>
```

### 4. Resource Hook

```tsx
const { allocations, metrics } = useResourceAllocation(issues, 40);

// allocations: Array of ResourceAllocation
// metrics: { totalTeamMembers, overAllocatedCount, averageUtilization, ... }
```

## Color Codes

| Utilization | Hours | Color | Level |
|-------------|-------|-------|-------|
| ≤75% | ≤30h | Green | Healthy |
| 75-100% | 30-40h | Yellow | At Capacity |
| 100-125% | 40-50h | Orange | Over-allocated |
| >125% | >50h | Red | Severely Over-allocated |

## Progress Calculation

```typescript
// Import
import { calculateTaskProgress } from './components/tracker/shared/utils';

// Use
const progress = calculateTaskProgress(issue, allIssues);
// Returns: 0-100 (percentage)
```

## Layout Example

```tsx
<div className="gantt-view flex h-full">
  {/* Main Gantt */}
  <div className="flex-1 flex flex-col">
    <div className="toolbar p-4">
      <ResourceFilterControls
        issues={issues}
        selectedAssignee={selectedAssignee}
        onSelectAssignee={setSelectedAssignee}
      />
    </div>
    <div className="gantt-chart flex-1">
      {/* Render GanttTaskBar components */}
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
```

## File Locations

```
dashboard/src/components/tracker/gantt/
├── hooks/
│   └── useResourceAllocation.ts
├── ResourcePanel.tsx
├── ResourceAllocationBar.tsx
├── ResourceFilterControls.tsx
├── GanttTaskBar.tsx
├── index.ts
└── README.md (full documentation)

dashboard/src/components/tracker/shared/
└── utils.ts (progress calculation utilities)
```

## Key Props

### ResourcePanel
- `issues: Issue[]` - All issues
- `selectedAssignee: string | null` - Currently filtered assignee
- `onSelectAssignee: (id) => void` - Filter callback
- `availableHoursPerWeek?: number` - Default: 40
- `isCollapsed?: boolean` - Panel state
- `onToggleCollapse?: () => void` - Toggle callback

### ResourceFilterControls
- `issues: Issue[]` - All issues
- `selectedAssignee: string | null` - Current filter
- `onSelectAssignee: (id) => void` - Filter callback

### GanttTaskBar
- `issue: Issue` - The task
- `allIssues: Issue[]` - All issues (for progress calc)
- `startDate: Date` - Task start
- `endDate: Date` - Task end
- `ganttStartDate: Date` - Gantt range start
- `ganttEndDate: Date` - Gantt range end
- `rowHeight: number` - Bar height
- `onClick?: () => void` - Click handler
- `isSelected?: boolean` - Selected state
- `isOverAllocated?: boolean` - Over-allocation flag

## Utility Functions

```typescript
// Resource allocation colors
getUtilizationColor(severityLevel)
// Returns: { bg, fill, text, border }

// Format hours
formatHours(35.5) // "36h"
formatHours(0.75) // "45m"

// Progress colors
getProgressColor(percentage, baseColor)
// Returns darker shade for fill

// Duration formatting
formatDuration(16) // "2d"
formatDuration(10) // "10h"
```

## Common Tasks

### Filter by Over-allocated Team Members
```tsx
const overAllocated = allocations
  .filter(a => a.isOverAllocated)
  .map(a => a.userId);
```

### Get Total Team Capacity
```tsx
const totalCapacity = metrics.totalAvailableHours;
const used = metrics.totalAllocatedHours;
const remaining = metrics.capacityRemaining;
```

### Check if User is Over-allocated
```tsx
const userAllocation = allocations.find(a => a.userId === userId);
if (userAllocation?.isOverAllocated) {
  // Show warning
}
```

### Calculate Team Average
```tsx
const avgUtilization = metrics.averageUtilization;
// Percentage: 0-∞
```

## Status Codes

Completed statuses for progress calculation:
- `"done"`
- `"closed"`
- `"completed"`

These are case-insensitive.

---

For full API documentation, see: `/dashboard/src/components/tracker/gantt/README.md`
