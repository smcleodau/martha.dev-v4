# Tracker Components Documentation

Frontend component documentation for developers working on the Martha Tracker UI.

## Overview

The Tracker UI is built with React 19, TypeScript, and Tailwind CSS. It follows a modular component architecture with clear separation of concerns.

### Technology Stack

- **React 19.2** - UI framework
- **TypeScript 5.7** - Type safety
- **React Router 7** - Routing and navigation
- **Tailwind CSS** - Styling
- **HTML5 Drag-and-Drop API** - Native browser drag-and-drop (no libraries)
- **ReactMarkdown** - Markdown rendering

### File Structure

```
dashboard/src/
├── pages/
│   └── TrackerPage.tsx          # Main tracker page (route component)
├── components/
│   └── tracker/
│       ├── board/
│       │   ├── KanbanBoard.tsx   # Board container
│       │   ├── KanbanColumn.tsx  # Column with drop zone
│       │   └── IssueCard.tsx     # Individual issue card
│       ├── detail/
│       │   └── IssueDetailPanel.tsx  # 800px detail panel
│       └── shared/
│           ├── FilterBar.tsx     # Search and filtering
│           └── hooks.ts          # Custom React hooks
└── api/
    └── tracker.ts               # API client and types
```

## Core Components

### TrackerPage

**File:** `dashboard/src/pages/TrackerPage.tsx`

**Purpose:** Main page component that orchestrates the entire tracker UI. Manages state, API calls, routing, and coordinates all child components.

**Responsibilities:**
- Load and manage worktrees, boards, and issues
- Handle URL routing and synchronization
- Coordinate drag-and-drop operations
- Manage filtering state
- Handle issue creation and updates
- Orchestrate detail panel display

**State Management:**
```typescript
// Multi-board state
const [worktrees, setWorktrees] = useState<WorktreeConfig[]>([]);
const [selectedWorktreeId, setSelectedWorktreeId] = useState<string>('martha-dev-v4');
const [boards, setBoards] = useState<Board[]>([]);
const [selectedBoardId, setSelectedBoardId] = useState<string>('phase1-temporal-foundation');

// Current board data
const [board, setBoard] = useState<Board | null>(null);
const [issues, setIssues] = useState<Record<string, Issue>>({});
const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

// Filter state
const [filters, setFilters] = useState<FilterState>({
  searchText: '',
  types: [],
  priorities: [],
  assignees: [],
  labels: [],
  showMyIssues: false,
  showUnassigned: false
});
```

**Key Functions:**

```typescript
// Load worktrees on mount
async function loadWorktrees(): Promise<void>

// Load boards for a worktree
async function loadBoards(worktreeId: string): Promise<void>

// Load board and all its issues
async function loadBoardData(worktreeId: string, boardId: string): Promise<void>

// Create new issue
async function handleCreateIssue(
  title: string,
  type: 'task' | 'bug' | 'story' | 'epic'
): Promise<void>

// Move issue to different status
async function handleMoveIssue(issueId: string, newStatus: string): Promise<void>

// Filter issues based on filter state
function filterIssues(allIssues: Record<string, Issue>): Record<string, Issue>
```

**Usage Pattern:**
```typescript
// Route configuration in App.tsx
<Route path="/tracker/:worktreeId/:boardId/:issueId?" element={<TrackerPage />} />

// URL examples:
// /tracker/martha-dev-v4/phase1-temporal-foundation
// /tracker/martha-dev-v4/phase1-temporal-foundation/issue-001
```

**Integration Points:**
- Reads URL params with `useParams()` from React Router
- Uses `useNavigate()` for programmatic navigation
- Calls API methods from `tracker.ts`
- Passes filtered data to `KanbanBoard`
- Shows/hides `IssueDetailPanel` based on selection

---

### KanbanBoard

**File:** `dashboard/src/components/tracker/board/KanbanBoard.tsx`

**Purpose:** Container component that renders all board columns and coordinates drag-and-drop operations across columns.

**Props:**
```typescript
interface KanbanBoardProps {
  board: Board;                                    // Board configuration
  issues: Record<string, Issue>;                   // All issues by ID
  onIssueClick: (issueId: string) => void;        // Click handler
  onIssueMove: (issueId: string, newStatus: string) => void;  // Move handler
}
```

**Usage Example:**
```typescript
<KanbanBoard
  board={board}
  issues={filteredIssues}
  onIssueClick={(issueId) => {
    setSelectedIssue(issueId);
    navigate(`/tracker/${worktreeId}/${boardId}/${issueId}`);
  }}
  onIssueMove={handleMoveIssue}
/>
```

**Implementation:**
```typescript
export function KanbanBoard({ board, issues, onIssueClick, onIssueMove }: KanbanBoardProps) {
  const { draggedIssueId, dragOverColumnId, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useDragAndDrop();

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="flex gap-4 h-full">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            issues={/* filter issues by column */}
            onIssueClick={onIssueClick}
            isDragOver={dragOverColumnId === column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id, onIssueMove)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Key Features:**
- Uses `useDragAndDrop()` custom hook for drag state
- Renders columns in horizontal flex layout
- Coordinates drag-and-drop across all columns
- Passes appropriate issues to each column

---

### KanbanColumn

**File:** `dashboard/src/components/tracker/board/KanbanColumn.tsx`

**Purpose:** Renders a single board column with its issues and handles drop zone functionality.

**Props:**
```typescript
interface KanbanColumnProps {
  column: BoardColumn;                             // Column configuration
  issues: Issue[];                                 // Issues in this column
  onIssueClick: (issueId: string) => void;        // Click handler
  isDragOver: boolean;                            // Is dragged item over this column?
  onDragOver: (e: React.DragEvent) => void;       // Drag over handler
  onDrop: (e: React.DragEvent) => void;           // Drop handler
}
```

**Usage Example:**
```typescript
<KanbanColumn
  column={{
    id: 'in-progress',
    name: 'In Progress',
    color: '#3B82F6',
    wip_limit: 5,
    issue_ids: ['issue-001', 'issue-002']
  }}
  issues={issuesInProgress}
  onIssueClick={handleIssueClick}
  isDragOver={dragOverColumnId === 'in-progress'}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
/>
```

**Implementation:**
```typescript
export function KanbanColumn({ column, issues, onIssueClick, isDragOver, onDragOver, onDrop }: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
          {column.wip_limit && (
            <span className="text-xs text-gray-500">/ {column.wip_limit}</span>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`flex-1 bg-white rounded-lg p-3 space-y-3 ${
          isDragOver ? 'border-2 border-blue-400 bg-blue-50' : 'border border-gray-200'
        }`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            onClick={() => onIssueClick(issue.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Visual States:**
- **Normal:** White background, gray border
- **Drag Over:** Blue border, light blue background

**Features:**
- Displays column name with color indicator
- Shows issue count badge
- Shows WIP limit if configured
- Visual feedback during drag-and-drop
- Scrollable issue list

---

### IssueCard

**File:** `dashboard/src/components/tracker/board/IssueCard.tsx`

**Purpose:** Renders an individual issue card with all relevant badges and metadata. Implements drag functionality.

**Props:**
```typescript
interface IssueCardProps {
  issue: Issue;                                   // Issue data
  onClick: () => void;                            // Click handler
}
```

**Usage Example:**
```typescript
<IssueCard
  issue={{
    id: 'issue-001',
    type: 'task',
    title: 'Implement workflow engine',
    status: 'in-progress',
    priority: 'high',
    parent_id: 'epic-temporal',
    assignee: { id: 'user-123', name: 'John', avatar: '...' },
    labels: ['backend', 'temporal'],
    links: { pr: 'https://...', related_issues: [], external: [] },
    // ... other fields
  }}
  onClick={() => handleIssueClick('issue-001')}
/>
```

**Implementation Highlights:**
```typescript
export function IssueCard({ issue, onClick }: IssueCardProps) {
  const { handleDragStart, handleDragEnd } = useDragAndDrop();

  // Get parent issue for badge
  const parentIssue = issue.parent_id ? getParentIssue(issue.parent_id) : null;

  return (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, issue.id)}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className="bg-[#F5F1ED] border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
    >
      {/* Parent Badge */}
      {parentIssue && (
        <div className="flex items-center gap-1 text-xs text-purple-600 mb-2">
          <svg className="w-3 h-3" ...>...</svg>
          <span className="font-medium">{parentIssue.title}</span>
        </div>
      )}

      {/* Type and Priority Badges */}
      <div className="flex gap-2 mb-2">
        <span className={`badge ${getTypeBadgeClass(issue.type)}`}>
          {issue.type}
        </span>
        <span className={`badge ${getPriorityBadgeClass(issue.priority)}`}>
          {issue.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-1">{issue.title}</h4>

      {/* Description Preview */}
      {issue.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{issue.description}</p>
      )}

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {issue.labels.slice(0, 3).map(label => (
            <span key={label} className="label-tag">{label}</span>
          ))}
          {issue.labels.length > 3 && (
            <span className="label-tag">+{issue.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer: Assignee and PR */}
      <div className="flex items-center justify-between mt-3">
        {issue.assignee && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {issue.assignee.name.charAt(0)}
            </div>
          </div>
        )}
        {issue.links.pr && (
          <svg className="w-4 h-4 text-gray-500" ...>PR Icon</svg>
        )}
      </div>
    </div>
  );
}
```

**Badge Color Schemes:**

**Type badges:**
- Epic: Purple (`bg-purple-100 text-purple-700`)
- Story: Blue (`bg-blue-100 text-blue-700`)
- Task: Gray (`bg-gray-100 text-gray-700`)
- Bug: Red (`bg-red-100 text-red-700`)

**Priority badges:**
- Critical: Red (`bg-red-100 text-red-700`)
- High: Orange (`bg-orange-100 text-orange-700`)
- Medium: Yellow (`bg-yellow-100 text-yellow-700`)
- Low: Gray (`bg-gray-100 text-gray-700`)

**Drag Behavior:**
- Cursor changes to `grabbing` during drag
- Card becomes 50% transparent when dragging
- `draggable` attribute enables native drag-and-drop

---

### IssueDetailPanel

**File:** `dashboard/src/components/tracker/detail/IssueDetailPanel.tsx`

**Purpose:** 800px wide side panel that displays comprehensive issue details with inline editing capabilities.

**Props:**
```typescript
interface IssueDetailPanelProps {
  issue: Issue;                                    // Issue to display
  board: Board;                                    // Board context
  onClose: () => void;                            // Close handler
  onStatusChange: (issueId: string, newStatus: string) => void;  // Status change handler
}
```

**Usage Example:**
```typescript
{selectedIssue && issues[selectedIssue] && (
  <IssueDetailPanel
    issue={issues[selectedIssue]}
    board={board}
    onClose={() => {
      setSelectedIssue(null);
      navigate(`/tracker/${worktreeId}/${boardId}`);
    }}
    onStatusChange={handleMoveIssue}
  />
)}
```

**Features:**

**4-Tab Interface:**
- **Details** - Full issue information with inline editing
- **Activity** - Timeline of changes (placeholder)
- **Comments** - Discussion thread (placeholder)
- **Documentation** - Linked documentation (placeholder)

**Inline Editing:**
```typescript
// Title editing
const [isEditingTitle, setIsEditingTitle] = useState(false);
const [editedTitle, setEditedTitle] = useState(issue.title);

<h2
  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
  onClick={() => setIsEditingTitle(true)}
>
  {isEditingTitle ? (
    <input
      type="text"
      value={editedTitle}
      onChange={(e) => setEditedTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') saveTitle();
        if (e.key === 'Escape') cancelEdit();
      }}
      className="w-full border-2 border-blue-500 rounded px-2 py-1"
      autoFocus
    />
  ) : (
    issue.title
  )}
</h2>
```

**Layout:**
```typescript
<div className="fixed inset-y-0 right-0 w-[800px] bg-white shadow-2xl z-50 flex flex-col">
  {/* Header */}
  <div className="border-b border-gray-200 p-6">
    <button onClick={onClose}>X</button>
    <h2>{issue.title}</h2>
  </div>

  {/* Tabs */}
  <div className="border-b border-gray-200">
    <button className={activeTab === 'details' ? 'active' : ''}>
      Details
    </button>
    {/* ... other tabs */}
  </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto p-6">
    {activeTab === 'details' && <DetailsTab />}
    {activeTab === 'activity' && <ActivityTab />}
    {/* ... */}
  </div>
</div>
```

**Styling Patterns:**
- Fixed position on right side
- 800px width for comfortable reading
- Shadow for depth
- Scrollable content area
- Blue borders during edit mode

---

### FilterBar

**File:** `dashboard/src/components/tracker/shared/FilterBar.tsx`

**Purpose:** Comprehensive filtering UI with search, quick filters, and advanced filter panel.

**Props:**
```typescript
interface FilterBarProps {
  filters: FilterState;                            // Current filter state
  onFiltersChange: (filters: FilterState) => void; // Update handler
}

interface FilterState {
  searchText: string;
  types: string[];
  priorities: string[];
  assignees: string[];
  labels: string[];
  showMyIssues: boolean;
  showUnassigned: boolean;
}
```

**Usage Example:**
```typescript
<FilterBar
  filters={filters}
  onFiltersChange={setFilters}
/>
```

**Implementation Highlights:**

**Search Input:**
```typescript
<input
  type="text"
  value={filters.searchText}
  onChange={(e) => onFiltersChange({ ...filters, searchText: e.target.value })}
  placeholder="Search issues... (type:epic, priority:high)"
  className="w-full pl-10 pr-4 py-2 border rounded-lg"
/>
```

**Quick Filter Chips:**
```typescript
<button
  onClick={() => togglePriorityFilter('high')}
  className={`px-3 py-1 rounded-full text-xs font-medium ${
    filters.priorities.includes('high')
      ? 'bg-orange-100 text-orange-700 border-orange-300'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  High Priority
</button>
```

**Advanced Filter Panel:**
```typescript
{showAdvanced && (
  <div className="p-4 border rounded-lg bg-gray-50">
    <div className="grid grid-cols-2 gap-4">
      {/* Type checkboxes */}
      {/* Priority checkboxes */}
    </div>
  </div>
)}
```

**Filter Logic:**
```typescript
const toggleTypeFilter = (type: string) => {
  const types = filters.types.includes(type)
    ? filters.types.filter(t => t !== type)
    : [...filters.types, type];
  onFiltersChange({ ...filters, types });
};
```

---

## Custom Hooks

### useDragAndDrop

**File:** `dashboard/src/components/tracker/shared/hooks.ts`

**Purpose:** Encapsulates drag-and-drop state and handlers for reuse across components.

**Returns:**
```typescript
{
  draggedIssueId: string | null;       // ID of issue being dragged
  dragOverColumnId: string | null;     // ID of column being dragged over
  handleDragStart: (e, issueId) => void;
  handleDragEnd: () => void;
  handleDragOver: (e, columnId) => void;
  handleDrop: (e, columnId, onIssueMove) => void;
}
```

**Usage:**
```typescript
const { draggedIssueId, dragOverColumnId, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useDragAndDrop();
```

**Implementation:**
```typescript
export function useDragAndDrop() {
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggedIssueId(issueId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', issueId);
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedIssueId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumnId(columnId);
  };

  const handleDrop = (
    e: React.DragEvent,
    columnId: string,
    onIssueMove: (issueId: string, newStatus: string) => void
  ) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('text/plain');
    if (issueId && onIssueMove) {
      onIssueMove(issueId, columnId);
    }
    setDragOverColumnId(null);
    setDraggedIssueId(null);
  };

  return {
    draggedIssueId,
    dragOverColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
  };
}
```

## API Integration

### API Client

**File:** `dashboard/src/api/tracker.ts`

All API calls go through centralized client:

```typescript
import { boardsApi, hierarchicalIssuesApi, worktreesApi } from '../api/tracker';

// Load worktrees
const worktreesList = await worktreesApi.list();

// Load boards
const boardsList = await boardsApi.list(worktreeId);

// Load board state
const boardData = await boardsApi.get(worktreeId, boardId);

// Load issues
const issuesList = await hierarchicalIssuesApi.list(worktreeId, boardId);

// Move issue
const updatedIssue = await hierarchicalIssuesApi.move(worktreeId, boardId, issueId, newStatus);
```

### Error Handling

```typescript
try {
  const issues = await hierarchicalIssuesApi.list(worktreeId, boardId);
  setIssues(issues);
} catch (err) {
  console.error('Failed to load issues:', err);
  setError(err instanceof Error ? err.message : 'Failed to load issues');
}
```

## Styling Patterns

### Tailwind Conventions

**Card components:**
```typescript
className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
```

**Buttons:**
```typescript
// Primary
className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"

// Secondary
className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
```

**Input fields:**
```typescript
className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
```

### Color Palette

**Background:**
- Main board: `#F5F1ED` (warm beige)
- Cards: `bg-white`
- Panel: `bg-white`

**Borders:**
- Normal: `border-gray-200`
- Hover: `border-blue-300`
- Active: `border-blue-500`

**Type colors:**
- Epic: Purple (`#9333EA`)
- Story: Blue (`#3B82F6`)
- Task: Gray (`#6B7280`)
- Bug: Red (`#EF4444`)

## Testing Strategy

### Component Tests

Use React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueCard } from './IssueCard';

test('renders issue card with title', () => {
  const issue = { id: 'issue-001', title: 'Test Issue', ... };
  render(<IssueCard issue={issue} onClick={() => {}} />);
  expect(screen.getByText('Test Issue')).toBeInTheDocument();
});
```

### Integration Tests

Use Playwright for E2E tests (see `/home/archiedev/test-tracker/` for examples).

## Performance Considerations

**Memoization:**
```typescript
const filteredIssues = useMemo(
  () => filterIssues(issues),
  [issues, filters]
);
```

**Lazy Loading:**
- Load issues on-demand per board
- Only render visible columns

**Optimistic Updates:**
- Update UI immediately on drag-drop
- Rollback on API failure

## Future Enhancements

- Virtual scrolling for large issue lists
- Keyboard navigation
- Accessibility improvements (ARIA labels)
- Dark mode support
- Mobile responsive design

## Conclusion

The Tracker components follow React best practices with clear props, TypeScript types, and Tailwind styling. The modular architecture makes it easy to extend and maintain.
