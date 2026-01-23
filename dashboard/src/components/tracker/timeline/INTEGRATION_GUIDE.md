# Timeline View Integration Guide

This guide provides integration instructions for implementing the TimelineView component with swimlane grouping and drag-to-reschedule functionality.

## Components Created

### 1. SwimlaneHeader.tsx
- **Purpose**: Header component for each swimlane row
- **Props**:
  - `groupName: string` - Name of the swimlane group
  - `issues: Issue[]` - Issues in this swimlane
  - `collapsed?: boolean` - Whether swimlane is collapsed (future enhancement)
  - `onToggleCollapse?: () => void` - Callback for collapse/expand
- **Features**:
  - Displays group name and issue count
  - Shows aggregate statistics (story points, completion %)
  - Priority indicators (critical/high counts)
  - Progress bar visualization
  - Styled with warm color palette

### 2. SwimlaneModeSelector.tsx
- **Purpose**: Dropdown to select swimlane grouping mode
- **Props**:
  - `mode: SwimlaneMode` - Current swimlane mode
  - `onChange: (mode: SwimlaneMode) => void` - Callback when mode changes
  - `className?: string` - Optional CSS classes
- **Modes**:
  - `none` - No swimlanes (default)
  - `assignee` - Group by team member
  - `type` - Group by Epic/Story/Task/Bug
  - `priority` - Group by Critical/High/Medium/Low
  - `status` - Group by workflow status
- **Features**:
  - Dropdown UI with icons
  - Shows current selection
  - Closes on outside click

### 3. useDragReschedule Hook
- **Purpose**: Handles drag-to-reschedule logic with optimistic updates
- **Location**: `hooks/useDragReschedule.ts`
- **Parameters**:
  ```typescript
  {
    worktreeId: string;
    boardId: string;
    onSuccess?: (updatedIssue: Issue) => void;
    onError?: (error: Error, originalIssue: Issue) => void;
  }
  ```
- **Returns**:
  ```typescript
  {
    handleEventDrop: (data: DragEventData) => Promise<void>;
    handleEventResize: (data: DragEventData) => Promise<void>;
    isUpdating: boolean;
    error: Error | null;
  }
  ```
- **Features**:
  - Preserves event duration when dragging
  - Validates dates (due date can't be before start date)
  - Optimistic updates with rollback on error
  - Supports both drag (move) and resize operations

### 4. Swimlane Utilities (swimlaneUtils.ts)
- **Functions**:
  - `groupIssuesForSwimlanes(issues, mode)` - Groups issues by mode
  - `issuesToCalendarEvents(issues, swimlaneMode)` - Converts issues to calendar events
  - `swimlanesToResources(swimlanes)` - Converts to React Big Calendar resources
  - `getIssueColor(issue)` - Returns warm palette colors for issue types
  - `calculateGroupStatistics(issues)` - Calculates aggregate stats
  - `filterIssuesWithDates(issues)` - Filters issues with valid dates

## TimelineView Implementation

### 1. State Management

```typescript
import { useState } from 'react';
import { type SwimlaneMode } from './SwimlaneModeSelector';
import { groupIssuesForSwimlanes, swimlanesToResources, issuesToCalendarEvents } from './swimlaneUtils';
import { useDragReschedule } from './hooks/useDragReschedule';

export function TimelineView({ worktreeId, boardId }: TimelineViewProps) {
  // Swimlane mode state
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');

  // Issues state (from API)
  const [issues, setIssues] = useState<Issue[]>([]);

  // Drag-to-reschedule hook
  const { handleEventDrop, handleEventResize, isUpdating } = useDragReschedule({
    worktreeId,
    boardId,
    onSuccess: (updatedIssue) => {
      // Update local state optimistically
      setIssues(prevIssues =>
        prevIssues.map(issue =>
          issue.id === updatedIssue.id ? updatedIssue : issue
        )
      );
    },
    onError: (error, originalIssue) => {
      // Rollback on error
      console.error('Failed to update issue:', error);
      // Optionally show toast notification
    }
  });

  // ... rest of component
}
```

### 2. Grouping Issues

```typescript
// Group issues based on swimlane mode
const swimlanes = groupIssuesForSwimlanes(issues, swimlaneMode);

// Convert to React Big Calendar resources
const resources = swimlaneMode !== 'none'
  ? swimlanesToResources(swimlanes)
  : undefined;

// Convert issues to calendar events
const events = issuesToCalendarEvents(issues, swimlaneMode);
```

### 3. React Big Calendar Configuration

Install dependencies:
```bash
npm install react-big-calendar react-big-calendar-dnd
npm install --save-dev @types/react-big-calendar
```

Implementation:
```typescript
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

// In component:
<DragAndDropCalendar
  localizer={localizer}
  events={events}
  resources={resources}
  resourceIdAccessor="resourceId"
  resourceTitleAccessor={(resource) => (
    <SwimlaneHeader
      groupName={resource.resourceTitle}
      issues={resource.issues}
    />
  )}
  startAccessor="start"
  endAccessor="end"
  style={{ height: '600px' }}
  view="month"
  views={['month', 'week', 'day']}

  // Drag and drop
  draggableAccessor={() => true}
  resizable={true}
  onEventDrop={handleEventDrop}
  onEventResize={handleEventResize}

  // Styling
  eventPropGetter={(event) => {
    const colors = getIssueColor(event.resource);
    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
        borderWidth: '2px',
        borderStyle: 'solid'
      }
    };
  }}
/>
```

### 4. UI Layout

```typescript
<div className="timeline-view">
  {/* Header with controls */}
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-semibold" style={{ color: '#2F241B' }}>
      Timeline
    </h2>

    {/* Swimlane mode selector */}
    <SwimlaneModeSelector
      mode={swimlaneMode}
      onChange={setSwimlaneMode}
    />
  </div>

  {/* Calendar */}
  <div className="timeline-calendar">
    {/* DragAndDropCalendar component here */}
  </div>

  {/* Loading indicator */}
  {isUpdating && (
    <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg"
         style={{ backgroundColor: '#2F241B', color: '#FFFFFF' }}>
      Updating...
    </div>
  )}
</div>
```

## Key Integration Points

### 1. Resource-Based Swimlanes
When `swimlaneMode !== 'none'`, React Big Calendar's `resources` prop is used:
- Each resource represents one swimlane
- Events are assigned to resources via `resourceId`
- Custom resource header renders `SwimlaneHeader` component

### 2. Event Handlers

**handleEventDrop**: Called when user drags an event
```typescript
const handleEventDrop = async ({ event, start, end, resourceId }) => {
  // Hook handles:
  // - Date calculation (preserves duration)
  // - Date validation
  // - API call to update issue
  // - Error handling with rollback
};
```

**handleEventResize**: Called when user resizes an event
```typescript
const handleEventResize = async ({ event, start, end }) => {
  // Hook handles:
  // - Updates both start_date and due_date
  // - Calculates new estimated_duration
  // - API call and error handling
};
```

### 3. Optimistic Updates

The hook supports optimistic updates:
1. User drags event
2. UI updates immediately (optimistic)
3. API call is made in background
4. If successful: state is updated with server response
5. If failed: UI reverts to original state (rollback)

Implement in `onSuccess` and `onError` callbacks:
```typescript
const { handleEventDrop } = useDragReschedule({
  worktreeId,
  boardId,
  onSuccess: (updatedIssue) => {
    // Update state with confirmed changes
    setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
  },
  onError: (error, originalIssue) => {
    // Revert to original state
    setIssues(prev => prev.map(i => i.id === originalIssue.id ? originalIssue : i));
    // Show error notification
    showToast({ type: 'error', message: error.message });
  }
});
```

### 4. Date Filtering

Only show issues with valid dates:
```typescript
import { filterIssuesWithDates } from './swimlaneUtils';

const validIssues = filterIssuesWithDates(allIssues);
```

## Styling

### Color Palette (Warm Design)
- Background: `#FDFBF8`
- Border: `#E8E0D5`
- Text Primary: `#2F241B`
- Text Secondary: `#6B5D52`
- Text Tertiary: `#A39686`

### Issue Type Colors
- Epic: `#8B7AA8` (Purple)
- Story: `#D97F6F` (Coral)
- Task: `#A39686` (Tan)
- Bug: `#C0392B` (Red)

### Custom CSS (Optional)
```css
.timeline-view {
  padding: 1.5rem;
  background: #FDFBF8;
}

.rbc-event {
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 500;
}

.rbc-event-label {
  display: none; /* Hide default time label for all-day events */
}

.rbc-toolbar button {
  color: #2F241B;
  border-color: #E8E0D5;
}

.rbc-toolbar button.rbc-active {
  background-color: #D97F6F;
  color: white;
}
```

## Error Handling

### Validation Errors
The hook validates:
- Due date must be >= start date
- Dates must be valid ISO strings

### API Errors
- Network failures
- 404 (issue not found)
- 403 (permission denied)
- 400 (validation errors)

All errors trigger the `onError` callback with:
- `error: Error` - The error object
- `originalIssue: Issue` - The issue before changes (for rollback)

### User Feedback
Show loading state and error messages:
```typescript
{isUpdating && <LoadingSpinner />}
{error && <ErrorToast message={error.message} />}
```

## Testing Checklist

- [ ] Swimlane mode selector changes mode correctly
- [ ] Issues are grouped correctly for each mode
- [ ] Swimlanes are sorted in correct order
- [ ] SwimlaneHeader shows correct statistics
- [ ] Drag event updates dates preserving duration
- [ ] Resize event updates both start and due dates
- [ ] Date validation prevents invalid dates
- [ ] Error shows toast and reverts changes
- [ ] Loading indicator appears during update
- [ ] Events display with correct colors
- [ ] Switching modes updates swimlanes immediately

## Future Enhancements

1. **Collapse/Expand Swimlanes**: Implement `onToggleCollapse` in SwimlaneHeader
2. **Drag Between Swimlanes**: Update assignee/status when dragging to different swimlane
3. **Bulk Operations**: Select multiple events and drag together
4. **Zoom Levels**: Custom zoom for year/quarter views
5. **Gantt Chart View**: Alternative visualization with dependencies
6. **Export**: Export timeline as PDF/PNG
7. **Filters**: Filter issues by labels, team, etc.
8. **Real-time Updates**: WebSocket support for live collaboration

## Dependencies

Required packages:
```json
{
  "react-big-calendar": "^1.8.5",
  "react-big-calendar-dnd": "^1.0.0",
  "moment": "^2.29.4",
  "@types/react-big-calendar": "^1.8.5"
}
```

## File Structure

```
dashboard/src/components/tracker/timeline/
├── SwimlaneHeader.tsx          # Swimlane row header component
├── SwimlaneModeSelector.tsx    # Mode selection dropdown
├── swimlaneUtils.ts            # Utility functions
├── hooks/
│   └── useDragReschedule.ts    # Drag-to-reschedule hook
├── TimelineView.tsx            # Main timeline component (to be created)
└── INTEGRATION_GUIDE.md        # This file
```

## Contact

For questions or issues with integration, refer to:
- React Big Calendar docs: https://jquense.github.io/react-big-calendar/
- Martha Tracker API: `/mnt/data/martha.dev-v4/dashboard/src/api/tracker.ts`
- Shared utilities: `/mnt/data/martha.dev-v4/dashboard/src/components/tracker/shared/utils.ts`
