# List View - Inline Editing & Bulk Operations

This directory contains components for inline editing and bulk operations in the Martha tracker list view (MTH-050).

## Components

### InlineEditor.tsx
Generic inline editor component that handles double-click to edit functionality.

**Features:**
- Supports multiple field types: text, dropdown, multi-select
- Optimistic updates with API calls
- Error handling with rollback on failure
- Auto-save for dropdowns
- Save/Cancel buttons for multi-select
- Keyboard shortcuts (Enter to save, Escape to cancel)

### EditableCell.tsx
Base cell component that wraps InlineEditor for TanStack Table integration.

**Features:**
- Shows display value normally
- Shows editor on double-click
- Optimistic updates
- Loading states
- Custom format functions

### BulkActionsToolbar.tsx
Toolbar that appears when issues are selected.

**Features:**
- Shows selection count
- Bulk operations: Change Status, Set Priority, Assign To, Delete
- Progress indicator during operations
- Error handling with detailed feedback
- Delete confirmation modal
- Fixed position at bottom of screen

## Specialized Cells

- **TitleCell.tsx**: Editable title cell with parent issue display
- **StatusCell.tsx**: Editable status cell with dropdown and color-coded badges
- **PriorityCell.tsx**: Editable priority cell with dropdown (Critical/High/Medium/Low)
- **AssigneeCell.tsx**: Editable assignee cell with user dropdown and avatar display
- **LabelsCell.tsx**: Editable labels cell with multi-select functionality

## Custom Hooks

- **useInlineEdit**: Manages inline editing state and API calls
- **useSelection**: Manages row selection state
- **useBulkOperations**: Manages bulk operations on multiple issues

## Integration

See `ListViewIntegration.example.tsx` for a complete example of how to integrate these components with TanStack Table.

## Total Lines of Code: ~1,220 lines
