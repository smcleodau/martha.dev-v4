# Tracker User Guide

Welcome to the Martha Tracker! This guide will help you understand how to use the multi-board kanban system to manage your projects effectively.

## Introduction

The Martha Tracker is a powerful project management tool designed specifically for software development workflows. It provides:

- **Multi-board support**: Organize work across multiple kanban boards within worktrees
- **Hierarchical issues**: Structure work with epics, stories, tasks, and bugs
- **Rich filtering**: Find exactly what you're looking for with advanced search
- **Drag-and-drop**: Intuitive issue movement across columns
- **Detail panels**: Comprehensive issue management with inline editing
- **Parent-child relationships**: Connect subtasks to parent epics and stories

## Getting Started

### Accessing the Tracker

Navigate to the Tracker page from the main dashboard. You'll see:

1. **Worktree selector** at the top - Choose which project/repository to work with
2. **Board tabs** - Switch between different boards within the selected worktree
3. **Board view** - The main kanban board with your issues
4. **Filter bar** - Search and filter issues
5. **Action buttons** - Create new issues or refresh the board

### Understanding Worktrees

**Worktrees** are top-level containers that represent your code repositories or projects. Each worktree can contain multiple boards.

Example worktrees:
- `martha-dev-v4` - Main development worktree
- `feature-authentication` - Isolated worktree for authentication feature
- `hotfix-production` - Emergency fix worktree

To switch worktrees:
1. Click the **Worktree** dropdown in the header
2. Select your desired worktree
3. The page will reload with boards from that worktree

### Understanding Boards

**Boards** are kanban boards within a worktree. Each board typically represents:
- A development phase (Phase 1, Phase 2)
- A sprint or release cycle
- A specific feature or epic

Boards have:
- A **name** and **description**
- Multiple **columns** (Backlog, Todo, In Progress, Review, Done)
- Assigned **issues**
- Optional **sprint** information

To switch boards:
1. Click on a board tab in the header
2. The kanban view will update to show that board's issues

## The Kanban Board

### Board Layout

The kanban board consists of vertical columns representing different stages of work:

**Typical columns:**
- **Backlog**: Ideas and future work
- **Todo**: Planned for current sprint
- **In Progress**: Currently being worked on
- **Review**: Awaiting review or testing
- **Done**: Completed work

Each column shows:
- **Column name** and **color indicator**
- **Issue count** badge
- **WIP limit** (if set) - Maximum issues allowed in the column
- **Issue cards** - Draggable cards representing individual issues

### Understanding Issue Cards

Each issue card displays rich information at a glance:

**Top section:**
- **Parent badge** (if applicable) - Purple icon with parent issue title
- **Issue type badge** - Color-coded (Epic/Story/Task/Bug)
- **Priority badge** - Color-coded (Critical/High/Medium/Low)

**Middle section:**
- **Issue title** - Click to open detail panel
- **Description preview** (first line)

**Bottom section:**
- **Labels** - First 3 labels shown, "+N" for additional
- **Assignee avatar** - Shows who's working on it
- **PR indicator** - Icon if linked to a pull request

**Card colors:**
- **Purple** - Epic
- **Blue** - Story
- **Gray** - Task
- **Red** - Bug

**Priority colors:**
- **Red** - Critical
- **Orange** - High
- **Yellow** - Medium
- **Gray** - Low

### Moving Issues (Drag-and-Drop)

The tracker uses native HTML5 drag-and-drop for moving issues between columns:

**To move an issue:**
1. **Click and hold** on an issue card
2. **Drag** the card to the target column (card becomes semi-transparent)
3. The target column highlights with a **blue border**
4. **Drop** the card in the desired column
5. The board updates immediately, and the API saves the change

**Visual feedback:**
- Dragged cards become **50% transparent**
- Target columns show a **blue highlight**
- Column count badges update in real-time

**Tips:**
- Drop at any position in the target column
- Changes are saved automatically
- If the API fails, you'll see an error message

## Filtering and Search

The tracker provides powerful filtering capabilities to help you find exactly what you need.

### Text Search

The search bar at the top of the filter section supports:

**Simple text search:**
```
Temporal
```
Searches issue titles and descriptions for "Temporal"

**Special search syntax:**
```
type:epic          - Find all epics
priority:high      - Find high priority issues
status:in-progress - Find issues in the "In Progress" column
```

**Clear search:**
Click the **X button** on the right side of the search input to clear your search.

### Quick Filter Chips

Below the search bar, you'll find quick filter buttons:

**My Issues**
- Shows only issues assigned to you
- Mutually exclusive with Unassigned filter
- Blue highlight when active

**Unassigned**
- Shows only issues without an assignee
- Helpful for finding work to pick up
- Blue highlight when active

**High Priority**
- Filters to high priority issues only
- Orange highlight when active

**Critical**
- Filters to critical priority issues only
- Red highlight when active

**Bugs**
- Shows only bug-type issues
- Red highlight when active

**Epics**
- Shows only epic-type issues
- Purple highlight when active

**Combining filters:**
- Click multiple chips to combine filters
- Search text works alongside quick filters
- Use "Clear all" to reset everything

### Advanced Filters

Click the **Filters** button to reveal advanced filtering options:

**Type filters:**
- ☐ Epic
- ☐ Story
- ☐ Task
- ☐ Bug

**Priority filters:**
- ☐ Critical
- ☐ High
- ☐ Medium
- ☐ Low

**Features:**
- Multi-select checkboxes
- Filters apply immediately
- Combine with search and quick filters
- Click **Filters** again to collapse the panel

## Managing Issues

### Creating New Issues

To create a new issue:

1. Click the **+ New Issue** button in the header
2. Enter the **issue title** in the prompt
3. Enter the **issue type** (task/bug/story/epic)
4. The issue is created in the **Backlog** column by default
5. Open the issue detail panel to add more information

**Issue types:**
- **Epic**: Large feature or initiative
- **Story**: User-facing feature or functionality
- **Task**: Technical work or subtask
- **Bug**: Defect or issue to fix

### The Issue Detail Panel

Click on any issue card to open the **rich detail panel** on the right side of the screen.

**Panel features:**
- **800px wide** - Plenty of space for detailed information
- **4 tabs** - Details, Activity, Comments, Documentation
- **Inline editing** - Edit directly without separate forms
- **Close button** - X button in top-left corner

### Details Tab

The Details tab shows comprehensive issue information:

**Issue header:**
- **Close button** (X) - Closes the panel
- **Issue ID** - Unique identifier
- **Type badge** - Color-coded issue type

**Title section:**
- **Click to edit** the title
- Press **Enter** to save
- Press **Escape** to cancel
- Blue border indicates edit mode

**Status dropdown:**
- Select from available board columns
- Changes status immediately
- Triggers API update

**Description section:**
- **Click to edit** the description
- Full textarea with markdown support
- Press **Escape** to cancel
- Blue border indicates edit mode

**Assignee section:**
- Shows current assignee with avatar
- Click to change assignee (future feature)

**Labels section:**
- Shows all labels as colored tags
- **+ Add label** button (future feature)

**Links section:**
- **Pull Request** - Link to GitHub PR
- **Related Issues** - Connected issues
- Click links to navigate

**Metadata section:**
- **Created** - When the issue was created
- **Updated** - Last modification time
- **Board** - Which board the issue belongs to
- **Worktree** - Parent worktree

### Activity Tab

The Activity tab shows a timeline of changes to the issue:

- Status changes
- Field updates
- Assignee changes
- Label additions/removals
- Comment activity

*Note: Activity timeline is coming soon*

### Comments Tab

The Comments tab provides a discussion space for the issue:

- View all comments
- Add new comments with markdown
- Edit and delete your own comments
- @mention team members

*Note: Comments system is coming soon*

### Documentation Tab

The Documentation tab links related documentation:

- Technical specifications
- API documentation
- User guides
- Related external resources

*Note: Documentation linking is coming soon*

### Editing Issues

**Inline title editing:**
1. Open the issue detail panel
2. Click on the title
3. Edit the text
4. Press **Enter** to save or **Escape** to cancel

**Inline description editing:**
1. Open the issue detail panel
2. Click on the description text
3. Edit in the textarea
4. Press **Escape** to cancel
5. Click outside or press **Enter** to save

**Changing status:**
1. Open the issue detail panel
2. Use the **Status** dropdown
3. Select the new status
4. Changes are saved immediately

**Visual feedback:**
- Editing fields show a **blue border**
- Save operations show brief loading states
- Success/error messages appear as needed

## Working with Hierarchies

### Parent-Child Relationships

Issues can have parent-child relationships:

- **Epics** contain **stories** and **tasks**
- **Stories** contain **tasks**
- **Tasks** stand alone or belong to parents

**Parent badges on cards:**
- Cards show a **purple icon** at the top if they have a parent
- The parent issue title is displayed
- Click the parent badge to navigate to the parent issue

**Creating child issues:**
1. Open a parent issue (epic or story)
2. Create a new issue
3. Set the `parent_id` field to the parent's ID
4. The child issue will show the parent badge

### Viewing Issue Hierarchies

**From the board:**
- Parent badges show the relationship visually
- Filter by `parent_id:epic-001` to see all children

**From the detail panel:**
- Links section shows related issues
- Navigate between parent and child issues

## Tips and Best Practices

### Organizing Your Work

**Use epics for large features:**
- Create an epic for each major feature
- Break epics into stories
- Break stories into tasks
- Track progress by completing children

**Keep columns organized:**
- Move issues regularly to reflect current status
- Respect WIP limits if set
- Review the Done column periodically

**Use labels effectively:**
- Add labels for technology areas (frontend, backend, database)
- Add labels for feature areas (authentication, api, dashboard)
- Use priority labels consistently

### Efficient Navigation

**Keyboard shortcuts** (coming soon):
- `C` - Create new issue
- `F` - Focus search
- `J/K` - Navigate issues
- `Escape` - Close detail panel

**Quick actions:**
- Right-click on cards for context menu (future feature)
- Bulk select with Shift+Click (future feature)
- Use search syntax to quickly filter

### Collaboration

**Assigning work:**
- Assign issues to team members
- Use "My Issues" filter to see your work
- Check "Unassigned" for available tasks

**Communication:**
- Use comments for discussions
- @mention team members for notifications
- Link related issues

**Tracking progress:**
- Check sprint progress in board header
- Review activity timelines
- Monitor PR links for code review status

## Statistics and Metrics

The board header shows real-time statistics:

- **Total issues** - Count of all issues on the board
- **Epics** - Count by type (purple)
- **Stories** - Count by type (blue)
- **Tasks** - Count by type (gray)
- **Bugs** - Count by type (red)

Use these metrics to:
- Track sprint velocity
- Monitor bug count
- Balance work types
- Identify bottlenecks

## Troubleshooting

### Common Issues

**Issue won't drag:**
- Refresh the page
- Check browser console for errors
- Ensure JavaScript is enabled

**Filter not working:**
- Clear all filters and try again
- Check search syntax
- Refresh the page

**Detail panel won't open:**
- Check if issue still exists
- Refresh the page
- Try a different issue

**Changes not saving:**
- Check network connectivity
- Look for error messages
- Refresh and try again

### Getting Help

If you encounter issues:

1. **Refresh the page** - Solves most problems
2. **Check the browser console** - Look for error messages
3. **Review the documentation** - Check API reference and architecture docs
4. **Contact support** - Report bugs through your team's process

## What's Next?

The tracker is actively being developed. Upcoming features include:

- **Keyboard shortcuts** - Fast navigation and actions
- **Comments system** - In-app discussions
- **Activity timeline** - Detailed change tracking
- **Documentation linking** - Connect specs to issues
- **Subtasks with progress** - Visual progress bars
- **Bulk operations** - Multi-select and batch actions
- **Compact mode** - Denser card layout option
- **Custom views** - Save filter configurations
- **Export/Import** - Data portability

## Conclusion

The Martha Tracker is designed to be intuitive yet powerful. The key concepts to remember:

1. **Worktrees** contain **boards** contain **issues**
2. **Drag-and-drop** to move issues between columns
3. **Click cards** to open the detail panel
4. **Use filters** to find what you need
5. **Inline editing** for quick updates

Start exploring and find the workflow that works best for your team!
