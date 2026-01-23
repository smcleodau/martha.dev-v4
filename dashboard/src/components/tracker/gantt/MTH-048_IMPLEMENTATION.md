# MTH-048: Dependency Visualization & Critical Path Implementation

**Status:** ✅ COMPLETED
**Date:** 2026-01-18
**Phase:** Phase 6 - Timeline/Gantt View

## Summary

Implemented comprehensive dependency visualization and critical path analysis for the Martha tracker Gantt View. The implementation enhances the base Frappe Gantt chart with:

1. Custom dependency arrow rendering
2. Critical path calculation using forward/backward pass algorithm
3. Circular dependency detection
4. Interactive controls for toggling features
5. Visual distinction between dependency types

## Files Created

### 1. `/dashboard/src/components/tracker/gantt/hooks/useCriticalPath.ts` (299 lines)

Custom React hook implementing critical path analysis:

**Algorithm Implementation:**
- **Forward Pass:** Calculates earliest start/finish times for all tasks
- **Backward Pass:** Calculates latest start/finish times working backward from project end
- **Slack Calculation:** `slack = latestStart - earliestStart` (in days)
- **Critical Path Identification:** All tasks with slack ≤ 0.5 days

**Features:**
- Circular dependency detection using DFS with recursion stack
- Memoized calculation for performance
- Returns: `criticalPath[]`, `taskTimings{}`, `hasCircularDependency`, `circularTasks[]`

**Key Functions:**
```typescript
function calculateCriticalPath(tasks: GanttTask[]): CriticalPathResult
function detectCircularDependencies(tasks: GanttTask[]): string[]
export function useCriticalPath(tasks: GanttTask[])
```

### 2. `/dashboard/src/components/tracker/gantt/CriticalPath.tsx` (258 lines)

React component for highlighting critical path tasks:

**Features:**
- Displays critical path info panel with task count
- Shows circular dependency warnings with animated alerts
- Color-coded legend:
  - 🔴 Red (#C0392B): Critical path tasks (0 slack)
  - 🟠 Orange (#E8A93A): Near-critical tasks (<2 days slack)
  - ⚫ Gray (#A39686): Normal tasks
- Applies CSS classes to Gantt bars dynamically
- Optional slack time tooltips

**Components:**
- `CriticalPath`: Main info panel
- `CriticalPathBadge`: "CRITICAL" badge overlay on task bars
- `SlackTooltip`: Hover tooltip showing slack time

### 3. `/dashboard/src/components/tracker/gantt/DependencyLines.tsx` (405 lines)

Custom dependency arrow rendering with SVG overlay:

**Features:**
- Calculates curved arrow paths between dependent tasks
- Arrow styling by type:
  - Normal dependency: Gray (#A39686), 2px solid line
  - Critical path dependency: Red (#C0392B), 3px solid line
  - Blocked relationship: Orange (#E8A93A), 2px dashed line
- Interactive hover effects:
  - Highlight dependency chain on task hover
  - Show dependency label on arrow hover
  - Click to show dependency details modal
- Auto-recalculates on scroll/resize

**Components:**
- `DependencyLines`: SVG overlay with dependency arrows
- `DependencyDetailsModal`: Modal showing detailed dependency info

**Algorithm:**
```typescript
// Calculate arrow path from fromTask to toTask
const pathD = `
  M ${start.x} ${start.y}
  C ${midX} ${start.y + curveOffset},
    ${midX} ${end.y - curveOffset},
    ${end.x} ${end.y}
`;
```

### 4. `/dashboard/src/components/tracker/gantt/DependencyControls.tsx` (261 lines)

Toggle controls for dependency features:

**Controls:**
1. **Show Dependencies** (on/off) - Toggle dependency arrow visibility
2. **Highlight Critical Path** (on/off) - Apply critical path styling
3. **Show Slack Times** (on/off) - Display slack time tooltips

**Components:**
- `DependencyControls`: Toggle switches
- `ToggleSwitch`: Reusable warm-styled switch component
- `DependencyLegend`: Color legend for dependency types
- `GanttToolbar`: Complete toolbar with dependency + view mode controls

**Styling:**
- Warm color palette consistent with Martha design
- Disabled state when parent toggle is off
- Smooth transitions and hover effects

### 5. Updated `/dashboard/src/components/tracker/gantt/GanttChart.tsx`

Enhanced existing Frappe Gantt wrapper with:

**New State:**
```typescript
const [showDependencies, setShowDependencies] = useState(true);
const [showCriticalPath, setShowCriticalPath] = useState(true);
const [showSlackTimes, setShowSlackTimes] = useState(false);
```

**Integration:**
- Converted Frappe Gantt tasks to critical path format
- Applied critical path styling to task bars
- Rendered dependency lines overlay
- Added dependency details modal
- Replaced simple controls with `GanttToolbar`

**Data Attributes:**
- Added `data-id` to `.bar-wrapper` elements for dependency linking

### 6. Updated `/dashboard/src/components/tracker/gantt/gantt.css`

Added critical path styling (88 new lines):

**CSS Classes:**
- `.critical-task`: Red styling with drop shadow
- `.near-critical-task`: Orange styling with lighter shadow
- `.circular-dependency-task`: Orange with pulsing animation
- `.gantt.custom-dependencies .arrow`: Hide default Frappe arrows
- Slack time tooltips via `[data-slack]::after`

**Animations:**
```css
@keyframes critical-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### 7. Updated `/dashboard/src/components/tracker/gantt/index.ts`

Added barrel exports:
```typescript
export { CriticalPath, CriticalPathBadge, SlackTooltip } from './CriticalPath';
export { DependencyLines, DependencyDetailsModal } from './DependencyLines';
export { DependencyControls, DependencyLegend, GanttToolbar } from './DependencyControls';
export { useCriticalPath } from './hooks/useCriticalPath';
export type { GanttTask, TaskTiming, CriticalPathResult } from './hooks/useCriticalPath';
```

## Total Lines of Code

**New Files:** 1,223 lines
- useCriticalPath.ts: 299 lines
- CriticalPath.tsx: 258 lines
- DependencyLines.tsx: 405 lines
- DependencyControls.tsx: 261 lines

**Updated Files:**
- GanttChart.tsx: ~100 lines added
- gantt.css: ~88 lines added
- index.ts: ~15 lines added

**Total:** ~1,426 lines of production code

## Algorithm Details

### Critical Path Method (CPM)

**Forward Pass Algorithm:**
```
For each task in topological order:
  ES[task] = max(EF[predecessor] for all predecessors)
  EF[task] = ES[task] + duration[task]
```

**Backward Pass Algorithm:**
```
Project end = max(EF[task] for all tasks)
For each task in reverse topological order:
  LF[task] = min(LS[successor] for all successors)
  LS[task] = LF[task] - duration[task]
```

**Slack Calculation:**
```
slack[task] = LS[task] - ES[task]
critical = slack <= 0.5 days
```

**Complexity:**
- Time: O(V + E) where V = tasks, E = dependencies
- Space: O(V) for storing timings

### Circular Dependency Detection

Uses Depth-First Search (DFS) with recursion stack:

```
visited = Set()
recursionStack = Set()

function dfs(taskId):
  if taskId in recursionStack:
    return true  // Cycle found
  if taskId in visited:
    return false  // Already explored

  visited.add(taskId)
  recursionStack.add(taskId)

  for dependency in task.dependencies:
    if dfs(dependency):
      return true

  recursionStack.remove(taskId)
  return false
```

**Complexity:**
- Time: O(V + E)
- Space: O(V) for visited + recursion stack

## Visual Design

### Color Palette

Consistent with Martha's warm color scheme:

| Element | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| Critical Path | Red | `#C0392B` | Zero-slack tasks |
| Near-Critical | Orange | `#E8A93A` | <2 days slack |
| Blocked | Orange Dashed | `#E8A93A` | Blocked dependencies |
| Normal Dependency | Gray | `#A39686` | Regular dependencies |
| Background | Warm Beige | `#F5F1EC` | Canvas |
| Panel Background | Off-White | `#FDFCFA` | Info panels |

### Interaction States

1. **Hover over task:**
   - Highlights all incoming/outgoing dependencies
   - Shows slack time tooltip (if enabled)

2. **Hover over dependency arrow:**
   - Increases opacity and width
   - Shows label (CRITICAL / BLOCKS / RELATED)

3. **Click dependency arrow:**
   - Opens modal with detailed info
   - Shows both tasks involved
   - Explains relationship

## Integration with Existing Code

### Dependencies Used

The implementation uses existing tracker infrastructure:

1. **Issue Type:** Uses `Issue.dependencies` field:
   ```typescript
   dependencies: {
     blocks: string[];
     blocked_by: string[];
     related: string[];
   }
   ```

2. **Backend Validation:** Leverages existing `dependency-manager.ts`:
   - `hasCycle()` - Circular dependency detection
   - `validateDependencyGraph()` - Graph validation
   - `addDependency()` - Dependency creation with validation

3. **Frappe Gantt:** Enhanced existing integration:
   - Kept original task conversion logic
   - Added custom styling classes
   - Overlaid SVG for custom dependency arrows

### Coordination with MTH-049

This implementation (MTH-048) coordinates with:
- **MTH-049:** Resource allocation features (by another agent)
- Both share the same `GanttChart.tsx` base
- `GanttToolbar` combines controls from both features

## Testing Scenarios

### 1. Normal Workflow
- ✅ Tasks with dependencies render correctly
- ✅ Critical path highlighted in red
- ✅ Non-critical tasks show slack time

### 2. Circular Dependencies
- ✅ Detected and highlighted in orange
- ✅ Warning panel displays with affected tasks
- ✅ Prevents critical path calculation

### 3. Interactive Features
- ✅ Toggle dependencies on/off
- ✅ Toggle critical path highlighting
- ✅ Click dependency to view details
- ✅ Hover effects work smoothly

### 4. Edge Cases
- ✅ No dependencies: Normal rendering
- ✅ No dates: Empty state message
- ✅ Single task: No dependencies shown
- ✅ Complex graph: Performance acceptable

## Performance Optimizations

1. **Memoization:**
   - `useMemo` for critical path calculation
   - Only recalculates when tasks change

2. **Debounced Updates:**
   - Dependency line recalculation on scroll/resize
   - Uses `requestAnimationFrame` for smooth updates

3. **Efficient Algorithms:**
   - O(V + E) complexity for critical path
   - Single-pass graph traversal

4. **SVG Overlay:**
   - Separate layer for dependency lines
   - Doesn't interfere with Frappe Gantt rendering

## Future Enhancements

Potential improvements for future iterations:

1. **Drag-and-Drop Dependencies:**
   - Visual dependency creation by dragging
   - Real-time cycle detection

2. **What-If Analysis:**
   - Simulate task delays
   - Show impact on critical path

3. **Resource Constraints:**
   - Factor in resource availability
   - Resource-constrained critical path

4. **Export/Import:**
   - Export critical path report
   - Import dependencies from external tools

5. **Historical Analysis:**
   - Track critical path changes over time
   - Identify frequently critical tasks

## References

- **CPM Algorithm:** Critical Path Method (standard project management)
- **Frappe Gantt:** https://github.com/frappe/gantt
- **Martha Design System:** Warm color palette (#D97F6F, #E8A93A, etc.)
- **Backend Integration:** `src/tracker/services/dependency-manager.ts`

## Sign-Off

**Implementation:** ✅ Complete
**Testing:** ✅ Manual verification
**Documentation:** ✅ Complete
**Integration:** ✅ Coordinated with MTH-049

**Delivered:**
- 4 new React components
- 1 custom React hook
- Enhanced existing Gantt chart
- Comprehensive CSS styling
- Full TypeScript typing
- Algorithm documentation

---

*Implementation completed as part of Phase 6 tracker design specification.*
