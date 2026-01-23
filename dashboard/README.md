# Martha Development Dashboard

Modern React dashboard for monitoring Martha services and comprehensive issue tracking.

## 🎯 Main Features

### Overview Page (/)
- Service health status monitoring
- Active worktrees list with real-time status
- Quick links to API endpoints
- Auto-refresh every 5 seconds

### Tracker Page (/tracker) - NEW in v2.0
Complete issue tracking and project management system with:

**Multi-View Support:**
- **Kanban Board** - Visual workflow with drag-and-drop
- **List View** - Spreadsheet-style table with inline editing
- **Timeline View** - Date-based horizontal timeline
- **Gantt Chart** - Dependencies and resource planning

**Core Features:**
- Hierarchical issues (Epic → Story → Task/Bug)
- Advanced filtering and search
- Initiatives, teams, and releases
- Time tracking and estimation
- Issue dependencies (blocks, blocked-by, related)
- Rich detail panel with comments and activity
- Real-time updates
- URL deep linking

**Collaboration:**
- Comments on issues
- Activity timeline
- Watchers
- Team assignments
- @mentions (coming soon)

### Documentation Page (/docs)
- Browse all documentation
- Markdown rendering
- Phase progress tracking

### Settings Page (/settings)
- Configuration display
- Port allocation overview
- System information

## 🎨 Design System

Built with a warm, modern design:

**Technology Stack:**
- **React 18** + **TypeScript 5** for type-safe components
- **Vite** for lightning-fast dev experience
- **TailwindCSS 3** for utility-first styling
- **React Router 6** for client-side routing
- **Axios** for API communication

**Color Palette (Warm Tones):**
- Primary Background: `#F5F1EC` (warm beige)
- Text Primary: `#2F241B` (dark brown)
- Text Secondary: `#6B5D52` (medium brown)
- Accent Coral: `#D97F6F` (coral/salmon)
- Accent Blue: `#82c9ed` (soft blue)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (orange)

**Design Principles:**
- Card-based layout with subtle shadows
- Responsive design (mobile to desktop)
- Smooth animations and transitions
- Accessible keyboard navigation
- Color-coded status indicators
- Rich visual feedback

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint
```

**URLs:**
- Dashboard: http://localhost:20000
- Service API: http://localhost:20000/api
- Tracker: http://localhost:20000/tracker

## 📁 Project Structure

```
dashboard/src/
├── pages/              # Page components
│   ├── TrackerPage.tsx      # Main tracker page
│   ├── OverviewPage.tsx     # Service overview
│   └── ...
├── components/
│   └── tracker/       # Tracker components
│       ├── board/           # Kanban components
│       ├── list/            # List view components
│       ├── timeline/        # Timeline components
│       ├── gantt/           # Gantt components
│       ├── detail/          # Detail panel
│       ├── shared/          # Shared components
│       └── navigation/      # Navigation
├── api/               # API client
│   └── tracker.ts           # Tracker API
├── contexts/          # React contexts
│   └── PreferencesContext.tsx
├── utils/             # Utilities
└── App.tsx            # Main app
```

## 🔑 Key Components

### TrackerPage
Main tracker page with routing, state management, and view switching.

### KanbanBoard
Drag-and-drop kanban board with columns and cards.

### ListView
Sortable, filterable table view with inline editing and bulk actions.

### TimelineView
Horizontal timeline with swimlanes and drag scheduling.

### GanttView
Dependency visualization with critical path and resource allocation.

### IssueDetailPanel
Sliding panel with issue details, comments, activity, time tracking.

### FilterBar
Advanced filtering UI with saved filter presets.

### StatisticsBar
Real-time statistics and progress metrics.

## 🎯 TypeScript

All components are fully typed:

```typescript
interface Issue {
  id: string;
  worktree_id: string;
  board_id: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  status: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  assignee: Assignee | null;
  labels: string[];
  // ... more fields
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- IssueCard
```

## 📚 Documentation

- **[Tracker Overview](../docs/user-guide/tracker-overview.md)** - User guide
- **[View Modes](../docs/user-guide/view-modes.md)** - Kanban, List, Timeline, Gantt
- **[API Reference](../docs/api/tracker-api.md)** - REST API docs
- **[Architecture](../docs/dev/architecture.md)** - System design
- **[Contributing](../docs/dev/contributing.md)** - How to contribute
