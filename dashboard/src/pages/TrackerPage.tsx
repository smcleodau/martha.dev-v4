/**
 * Tracker Page - Multi-Board Kanban UI
 * Responsive: Mobile drawer sidebar, touch-friendly interactions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  boardsApi,
  worktreesApi,
  hierarchicalIssuesApi,
  type Issue,
  type Board,
  type WorktreeConfig,
} from '../api/tracker';
import { KanbanBoard } from '../components/tracker/board/KanbanBoard';
import { ListView } from '../components/tracker/list/ListView';
import { TimelineView } from '../components/tracker/timeline/TimelineView';
import { GanttView } from '../components/tracker/board/GanttView';
import { IssueDetailPanel } from '../components/tracker/detail/IssueDetailPanel';
import { FilterBar, type FilterState } from '../components/tracker/shared/FilterBar';
import { StatisticsBar } from '../components/tracker/shared/StatisticsBar';
import { TrackerSidebar } from '../components/tracker/navigation/TrackerSidebar';
import { ViewSwitcher } from '../components/tracker/navigation/ViewSwitcher';
import { MobileMenu } from '../components/tracker/shared/MobileMenu';
import { type ViewMode } from '../utils/preferences';
import { usePreferences } from '../contexts/PreferencesContext';
import { useKeyboardNavigation, TRACKER_SHORTCUTS, useSkipToContent } from '../hooks/useKeyboardNavigation';
import { announce, announceIssueCreated, announceIssueStatusChange, announceLoaded, announceError, announceModalOpened, announceModalClosed } from '../utils/announcer';
import { useIsMobile } from '../hooks/useMediaQuery';

export function TrackerPage() {
  // URL params
  const params = useParams<{ worktreeId?: string; boardId?: string; view?: string; issueId?: string }>();
  const navigate = useNavigate();

  // Preferences context
  const { getViewPreference, setViewPreference } = usePreferences();

  // Skip to content accessibility
  const skipToContentProps = useSkipToContent('main-tracker-content');

  // Mobile responsive state
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Multi-board state
  const [worktrees, setWorktrees] = useState<WorktreeConfig[]>([]);
  const [selectedWorktreeId, setSelectedWorktreeId] = useState<string>(params.worktreeId || 'martha-dev-v4');
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(params.boardId || 'phase1-temporal-foundation');

  // View mode state with preference persistence
  // Priority: URL param > localStorage > default
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const urlView = params.view as ViewMode | undefined;
    if (urlView && ['kanban', 'list', 'timeline', 'gantt'].includes(urlView)) {
      return urlView;
    }
    const savedView = getViewPreference(
      params.worktreeId || 'martha-dev-v4',
      params.boardId || 'phase1-temporal-foundation'
    );
    return savedView || 'kanban';
  });

  // Current board data
  const [board, setBoard] = useState<Board | null>(null);
  const [issues, setIssues] = useState<Record<string, Issue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(params.issueId || null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    types: [],
    priorities: [],
    initiatives: [],
    teams: [],
    assignees: [],
    labels: [],
    showMyIssues: false,
    showUnassigned: false,
    startDateRange: undefined,
    dueDateRange: undefined,
  });

  // Load worktrees on mount
  useEffect(() => {
    loadWorktrees();
  }, []);

  // Sync URL params to state
  useEffect(() => {
    if (params.worktreeId && params.worktreeId !== selectedWorktreeId) {
      setSelectedWorktreeId(params.worktreeId);
    }
    if (params.boardId && params.boardId !== selectedBoardId) {
      setSelectedBoardId(params.boardId);
    }
    if (params.issueId !== selectedIssue) {
      setSelectedIssue(params.issueId || null);
    }
  }, [params.worktreeId, params.boardId, params.issueId]);

  // Sync view from URL and save to preferences
  useEffect(() => {
    const urlView = params.view as ViewMode | undefined;
    if (urlView && ['kanban', 'list', 'timeline', 'gantt'].includes(urlView)) {
      setViewMode(urlView);
      // Save to preferences when explicitly set in URL
      setViewPreference(selectedWorktreeId, selectedBoardId, urlView);
    } else if (params.view === undefined) {
      // Load from preferences when no URL param
      const savedView = getViewPreference(selectedWorktreeId, selectedBoardId);
      if (savedView) {
        setViewMode(savedView);
      }
    }
  }, [params.view, selectedWorktreeId, selectedBoardId]);

  // Load boards when worktree changes
  useEffect(() => {
    if (selectedWorktreeId) {
      loadBoards(selectedWorktreeId);
    }
  }, [selectedWorktreeId]);

  // Load board and issues when board changes
  useEffect(() => {
    if (selectedWorktreeId && selectedBoardId) {
      loadBoardData(selectedWorktreeId, selectedBoardId);
    }
  }, [selectedWorktreeId, selectedBoardId]);

  async function loadWorktrees() {
    try {
      const worktreesList = await worktreesApi.list();

      // Filter to only valid tracker worktrees (with id field and boards array)
      const validWorktrees = worktreesList.filter(w =>
        w.id &&
        w.boards &&
        Array.isArray(w.boards) &&
        w.boards.length > 0
      );
      setWorktrees(validWorktrees);

      // If current selection is not in list, select first
      if (validWorktrees.length > 0 && !validWorktrees.find(w => w.id === selectedWorktreeId)) {
        setSelectedWorktreeId(validWorktrees[0].id);
      }
    } catch (err) {
      console.error('Failed to load worktrees:', err);
      setError('Failed to load worktrees');
    }
  }

  async function loadBoards(worktreeId: string) {
    try {
      const boardsList = await boardsApi.list(worktreeId);
      setBoards(boardsList);

      // If current selection is not in list, select first
      if (boardsList.length > 0 && !boardsList.find(b => b.id === selectedBoardId)) {
        setSelectedBoardId(boardsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
      setError('Failed to load boards');
    }
  }

  async function loadBoardData(worktreeId: string, boardId: string) {
    try {
      setLoading(true);
      setError(null);

      // Load board state
      const boardData = await boardsApi.get(worktreeId, boardId);
      setBoard(boardData);

      // Load all issues for this board
      const issuesList = await hierarchicalIssuesApi.list(worktreeId, boardId);
      const issuesMap: Record<string, Issue> = {};
      issuesList.forEach((issue) => {
        issuesMap[issue.id] = issue;
      });
      setIssues(issuesMap);
    } catch (err) {
      console.error('Failed to load board data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }

  // Handle issue creation
  async function handleCreateIssue(title: string, type: 'task' | 'bug' | 'story' | 'epic') {
    if (!selectedWorktreeId || !selectedBoardId) return;

    try {
      const newIssue = await hierarchicalIssuesApi.create(selectedWorktreeId, selectedBoardId, {
        title,
        type,
        status: 'backlog',
        priority: 'medium',
      });

      // Update local state
      setIssues((prev) => ({ ...prev, [newIssue.id]: newIssue }));

      // Announce to screen readers
      announceIssueCreated(newIssue.id, type);

      // Reload board to update column
      await loadBoardData(selectedWorktreeId, selectedBoardId);
    } catch (err) {
      console.error('Failed to create issue:', err);
      announceError('Failed to create issue');
      alert('Failed to create issue');
    }
  }

  // Handle issue status change (drag-drop)
  async function handleMoveIssue(issueId: string, newStatus: string) {
    if (!selectedWorktreeId || !selectedBoardId) return;

    const oldStatus = issues[issueId]?.status;

    try {
      const updatedIssue = await hierarchicalIssuesApi.move(
        selectedWorktreeId,
        selectedBoardId,
        issueId,
        newStatus
      );

      // Update local state
      setIssues((prev) => ({ ...prev, [updatedIssue.id]: updatedIssue }));

      // Announce to screen readers
      if (oldStatus) {
        announceIssueStatusChange(issueId, oldStatus, newStatus);
      }

      // Reload board
      await loadBoardData(selectedWorktreeId, selectedBoardId);
    } catch (err) {
      console.error('Failed to move issue:', err);
      announceError('Failed to move issue');
      alert('Failed to move issue');
    }
  }

  // Filter issues based on filter state
  function filterIssues(allIssues: Record<string, Issue>): Record<string, Issue> {
    let filtered = { ...allIssues };

    // Text search
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => {
          // Search in title and description
          const matchesText = issue.title.toLowerCase().includes(searchLower) ||
            issue.description?.toLowerCase().includes(searchLower);

          // Check for special syntax (type:, priority:, status:)
          if (searchLower.includes(':')) {
            const [key, value] = searchLower.split(':', 2);
            if (key === 'type' && value) return issue.type === value.trim();
            if (key === 'priority' && value) return issue.priority === value.trim();
            if (key === 'status' && value) return issue.status === value.trim();
          }

          return matchesText;
        })
      );
    }

    // Type filter
    if (filters.types.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => filters.types.includes(issue.type))
      );
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => filters.priorities.includes(issue.priority))
      );
    }

    // My issues filter (would need current user info)
    if (filters.showMyIssues) {
      // TODO: Filter by current user
      // For now, just show assigned issues
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => issue.assignee !== null)
      );
    }

    // Unassigned filter
    if (filters.showUnassigned) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => issue.assignee === null)
      );
    }

    // Initiative filter
    if (filters.initiatives.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) =>
          issue.initiative_id && filters.initiatives.includes(issue.initiative_id)
        )
      );
    }

    // Team filter
    if (filters.teams.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) =>
          issue.team_ids && issue.team_ids.some((teamId: string) => filters.teams.includes(teamId))
        )
      );
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) =>
          issue.assignee && filters.assignees.includes(issue.assignee.id)
        )
      );
    }

    // Label filter
    if (filters.labels.length > 0) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) =>
          issue.labels.some(label => filters.labels.includes(label))
        )
      );
    }

    // Date range filters
    if (filters.startDateRange) {
      const { from, to } = filters.startDateRange;
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => {
          if (!issue.start_date) return false;
          const startDate = new Date(issue.start_date);
          return startDate >= from && startDate <= to;
        })
      );
    }

    if (filters.dueDateRange) {
      const { from, to } = filters.dueDateRange;
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([_, issue]) => {
          if (!issue.due_date) return false;
          const dueDate = new Date(issue.due_date);
          return dueDate >= from && dueDate <= to;
        })
      );
    }

    return filtered;
  }

  const filteredIssues = filterIssues(issues);

  // Handle view change with URL update and preference persistence
  function handleViewChange(newView: ViewMode) {
    setViewMode(newView);
    // Save to localStorage preferences
    setViewPreference(selectedWorktreeId, selectedBoardId, newView);
    // Update URL
    const newPath = `/tracker/${selectedWorktreeId}/${selectedBoardId}/${newView}${selectedIssue ? `/${selectedIssue}` : ''}`;
    navigate(newPath, { replace: true });
    // Announce view change
    announce(`Switched to ${newView} view`);
  }

  // Keyboard shortcuts
  useKeyboardNavigation({
    shortcuts: [
      {
        ...TRACKER_SHORTCUTS.NEW_ISSUE,
        action: () => {
          const title = prompt('Issue title:');
          if (title) {
            const type = prompt('Type (task/bug/story/epic):', 'task') as any;
            handleCreateIssue(title, type || 'task');
          }
        }
      },
      {
        ...TRACKER_SHORTCUTS.REFRESH,
        action: () => loadBoardData(selectedWorktreeId, selectedBoardId)
      },
      {
        ...TRACKER_SHORTCUTS.CLOSE_PANEL,
        action: () => {
          if (selectedIssue) {
            setSelectedIssue(null);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}`);
          }
        }
      },
      {
        ...TRACKER_SHORTCUTS.KANBAN_VIEW,
        action: () => handleViewChange('kanban')
      },
      {
        ...TRACKER_SHORTCUTS.LIST_VIEW,
        action: () => handleViewChange('list')
      },
      {
        ...TRACKER_SHORTCUTS.TIMELINE_VIEW,
        action: () => handleViewChange('timeline')
      },
      {
        ...TRACKER_SHORTCUTS.GANTT_VIEW,
        action: () => handleViewChange('gantt')
      },
    ]
  });

  // Announce loaded state
  useEffect(() => {
    if (!loading && board) {
      announceLoaded('Tracker board');
    }
  }, [loading, board]);

  if (loading || worktrees.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Tracker</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => loadBoardData(selectedWorktreeId, selectedBoardId)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600">No board data available</p>
      </div>
    );
  }

  const currentBoard = boards.find(b => b.id === selectedBoardId);

  return (
    <div className="h-full flex" style={{ backgroundColor: '#F5F1EC' }}>
      {/* Skip to content link for keyboard navigation */}
      <a
        {...skipToContentProps}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-gray-900 focus:shadow-lg"
        style={{ outline: '3px solid #D97F6F' }}
      >
        Skip to main content
      </a>

      {/* Left Sidebar Navigation - Desktop/Tablet always visible, Mobile drawer */}
      <TrackerSidebar
        variant={isMobile ? 'mobile' : 'desktop'}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header with Project Selector and Actions */}
        <header
        className="border-b px-4 md:px-6 py-3 md:py-4"
        style={{
          backgroundColor: 'white',
          borderBottomColor: '#E8E0D5'
        }}
        role="banner"
      >
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Left Section: Hamburger Menu (mobile) + Project/Worktree Selector + Search */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            {/* Mobile: Hamburger Menu */}
            {isMobile && (
              <MobileMenu
                isOpen={isSidebarOpen}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            )}
            {/* Worktree Selector */}
            <div className="relative">
              <label htmlFor="worktree-selector" className="sr-only">
                Select worktree
              </label>
              <select
                id="worktree-selector"
                value={selectedWorktreeId}
                onChange={(e) => {
                  const newWorktreeId = e.target.value;
                  setSelectedWorktreeId(newWorktreeId);
                  navigate(`/tracker/${newWorktreeId}/${selectedBoardId}/${viewMode}`);
                  announce(`Switched to ${worktrees.find(w => w.id === newWorktreeId)?.display_name || newWorktreeId} worktree`);
                }}
                className="appearance-none border rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus-coral cursor-pointer"
                style={{
                  backgroundColor: '#F5F1EC',
                  borderColor: '#E8E0D5',
                  color: '#2F241B'
                }}
                aria-label="Select worktree"
              >
                {worktrees.map((worktree) => (
                  <option key={worktree.id} value={worktree.id}>
                    {worktree.display_name || worktree.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs pointer-events-none w-3 h-3"
                style={{ color: '#6B5D52' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Board Selector Dropdown */}
            <div className="relative">
              <label htmlFor="board-selector" className="sr-only">
                Select board
              </label>
              <select
                id="board-selector"
                value={selectedBoardId}
                onChange={(e) => {
                  setSelectedBoardId(e.target.value);
                  navigate(`/tracker/${selectedWorktreeId}/${e.target.value}/${viewMode}`);
                  announce(`Switched to ${boards.find(b => b.id === e.target.value)?.name || e.target.value} board`);
                }}
                className="appearance-none border rounded-lg pl-4 pr-10 py-2 text-sm font-medium focus:outline-none focus-coral cursor-pointer"
                style={{
                  backgroundColor: '#F5F1EC',
                  borderColor: '#E8E0D5',
                  color: '#2F241B'
                }}
                aria-label="Select board"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs pointer-events-none w-3 h-3"
                style={{ color: '#6B5D52' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Search Bar - Hidden on mobile (in FilterBar instead) */}
            {!isMobile && (
              <div className="relative">
                <label htmlFor="issue-search" className="sr-only">
                  Search issues
                </label>
                <input
                  id="issue-search"
                  type="search"
                  placeholder="Search issues..."
                  value={filters.searchText}
                  onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                  className="w-80 pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus-coral"
                  style={{
                    backgroundColor: '#F5F1EC',
                    borderColor: '#E8E0D5',
                    color: '#2F241B'
                  }}
                  aria-label="Search issues"
                  role="searchbox"
                />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                style={{ color: '#6B5D52' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              </div>
            )}
          </div>

          {/* Right Section: View Switcher, Stats, Live Status, Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* View Switcher - Hidden on mobile */}
            {!isMobile && <ViewSwitcher currentView={viewMode} onViewChange={handleViewChange} />}

            {/* Stats Summary - Hidden on mobile (in StatisticsBar instead) */}
            {!isMobile && (
              <div className="flex items-center gap-3 text-xs">
                <span style={{ color: '#6B5D52' }}>
                  <span className="font-semibold" style={{ color: '#2F241B' }}>{Object.values(issues).filter(i => i.type === 'epic').length}</span> Epics
                </span>
                <span style={{ color: '#6B5D52' }}>
                  <span className="font-semibold" style={{ color: '#2F241B' }}>{Object.values(issues).filter(i => i.type === 'story').length}</span> Stories
                </span>
                <span style={{ color: '#6B5D52' }}>
                  <span className="font-semibold" style={{ color: '#2F241B' }}>{Object.values(issues).filter(i => i.type === 'task').length}</span> Tasks
                </span>
              </div>
            )}

            {/* Live Status Indicator - Hidden on mobile */}
            {!isMobile && (
              <div
                className="flex items-center space-x-2 px-3 py-1.5 border rounded-lg"
                style={{
                  backgroundColor: '#ECFDF5',
                  borderColor: '#A7F3D0'
                }}
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse-live"
                  style={{ backgroundColor: '#10B981' }}
                />
                <span className="text-sm font-medium" style={{ color: '#059669' }}>
                  Live
                </span>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                loadBoardData(selectedWorktreeId, selectedBoardId);
                announce('Refreshing board');
              }}
              className="p-2 rounded-lg transition-colors"
              style={{ color: '#6B5D52' }}
              title="Refresh board"
              aria-label="Refresh board"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* New Issue Button - Compact on mobile */}
            <button
              onClick={() => {
                const title = prompt('Issue title:');
                if (title) {
                  const type = prompt('Type (task/bug/story/epic):', 'task') as any;
                  handleCreateIssue(title, type || 'task');
                }
              }}
              className="px-3 md:px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm transition-all hover:shadow-md touch-manipulation"
              style={{
                backgroundColor: '#D97F6F',
                minHeight: isMobile ? '44px' : 'auto'
              }}
              aria-label="Create new issue"
            >
              <span className="hidden md:inline">+ New Issue</span>
              <span className="md:hidden">+</span>
            </button>
          </div>
        </div>
      </header>

      {/* Board Info Section */}
      {currentBoard && (
        <div
          className="px-6 py-3 border-b"
          style={{
            backgroundColor: '#FDFCFA',
            borderBottomColor: '#E8E0D5'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: '#2F241B' }}>
                {currentBoard.name}
              </h1>
              {currentBoard.description && (
                <p className="text-sm mt-0.5" style={{ color: '#6B5D52' }}>
                  {currentBoard.description}
                </p>
              )}
            </div>
            {board.sprint && (
              <div className="text-xs" style={{ color: '#A39686' }}>
                Sprint: {board.sprint.name} ({new Date(board.sprint.start_date).toLocaleDateString()} - {new Date(board.sprint.end_date).toLocaleDateString()})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics Bar */}
      <StatisticsBar worktreeId={selectedWorktreeId} boardId={selectedBoardId} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        worktreeId={selectedWorktreeId}
      />

      {/* Views - Conditional Rendering Based on View Mode */}
      <main
        id="main-tracker-content"
        className="flex-1 flex flex-col"
        role="main"
        aria-label="Issue tracker board"
        tabIndex={-1}
      >
      {viewMode === 'kanban' && (
        <KanbanBoard
          board={board}
          issues={filteredIssues}
          onIssueClick={(issueId) => {
            setSelectedIssue(issueId);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}/${issueId}`);
            announceModalOpened('Issue details');
          }}
          onIssueMove={handleMoveIssue}
        />
      )}

      {viewMode === 'list' && (
        <ListView
          issues={Object.values(filteredIssues)}
          onIssueClick={(issue) => {
            setSelectedIssue(issue.id);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}/${issue.id}`);
          }}
          searchQuery={filters.searchText}
          worktreeId={selectedWorktreeId}
          boardId={selectedBoardId}
        />
      )}

      {viewMode === 'timeline' && (
        <TimelineView
          issues={filteredIssues}
          worktreeId={selectedWorktreeId}
          boardId={selectedBoardId}
          onIssueClick={(issueId) => {
            setSelectedIssue(issueId);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}/${issueId}`);
          }}
          onIssueUpdate={(updatedIssue) => {
            setIssues((prev) => ({ ...prev, [updatedIssue.id]: updatedIssue }));
          }}
        />
      )}

      {viewMode === 'gantt' && (
        <GanttView
          issues={filteredIssues}
          onIssueClick={(issueId) => {
            setSelectedIssue(issueId);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}/${issueId}`);
            announceModalOpened('Issue details');
          }}
        />
      )}
      </main>

      {/* Issue Detail Panel */}
      {selectedIssue && issues[selectedIssue] && board && (
        <IssueDetailPanel
          issue={issues[selectedIssue]}
          board={board}
          allIssues={issues}
          onClose={() => {
            setSelectedIssue(null);
            navigate(`/tracker/${selectedWorktreeId}/${selectedBoardId}/${viewMode}`);
            announceModalClosed('Issue details');
          }}
          onStatusChange={handleMoveIssue}
        />
      )}
      </div>
    </div>
  );
}
