/**
 * Seed Calculator Epic Script
 * Creates a calculator app epic with sub-issues for testing orchestration workflows
 *
 * Usage:
 *   tsx scripts/seed-calculator-epic.ts [worktreeId] [boardId]
 *
 * Defaults:
 *   worktreeId: calculator-app
 *   boardId: main
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:20000';
const WORKTREE_ID = process.argv[2] || 'calculator-app';
const BOARD_ID = process.argv[3] || 'main';

interface Issue {
  id?: string;
  title: string;
  type: 'epic' | 'story' | 'task' | 'bug';
  status: 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  story_points?: number;
  parent_id?: string;
  epic_id?: string;
}

async function createIssue(issue: Issue): Promise<any> {
  try {
    const response = await axios.post(
      `${API_BASE}/api/tracker/worktrees/${WORKTREE_ID}/boards/${BOARD_ID}/issues`,
      issue
    );
    console.log(`✅ Created ${issue.type}: ${response.data.id} - ${issue.title}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to create ${issue.type}: ${issue.title}`);
    console.error(error.response?.data || error.message);
    throw error;
  }
}

async function addDependency(issueId: string, targetIssueId: string, type: 'blocked_by' | 'blocks' | 'related'): Promise<void> {
  try {
    await axios.post(
      `${API_BASE}/api/tracker/worktrees/${WORKTREE_ID}/boards/${BOARD_ID}/issues/${issueId}/dependencies`,
      { type, target_issue_id: targetIssueId }
    );
    console.log(`🔗 Added dependency: ${issueId} ${type} ${targetIssueId}`);
  } catch (error: any) {
    console.error(`❌ Failed to add dependency: ${issueId} ${type} ${targetIssueId}`);
    console.error(error.response?.data || error.message);
  }
}

async function createRelease(name: string, version: string, targetDate: string): Promise<any> {
  try {
    const response = await axios.post(
      `${API_BASE}/api/tracker/worktrees/${WORKTREE_ID}/releases`,
      {
        name,
        version,
        target_date: targetDate,
        description: 'Initial release of the calculator application'
      }
    );
    console.log(`📦 Created release: ${response.data.id} - ${name}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to create release: ${name}`);
    console.error(error.response?.data || error.message);
    throw error;
  }
}

async function assignIssueToRelease(issueId: string, releaseId: string): Promise<void> {
  try {
    await axios.patch(
      `${API_BASE}/api/tracker/worktrees/${WORKTREE_ID}/boards/${BOARD_ID}/issues/${issueId}`,
      { release_id: releaseId }
    );
    console.log(`📌 Assigned ${issueId} to release ${releaseId}`);
  } catch (error: any) {
    console.error(`❌ Failed to assign ${issueId} to release`);
    console.error(error.response?.data || error.message);
  }
}

async function seedCalculatorEpic() {
  console.log('🚀 Seeding Calculator Epic...');
  console.log(`   Worktree: ${WORKTREE_ID}`);
  console.log(`   Board: ${BOARD_ID}`);
  console.log('');

  try {
    // Step 1: Create the Epic
    const epic = await createIssue({
      title: 'Calculator Application',
      type: 'epic',
      status: 'backlog',
      priority: 'high',
      description: `# Calculator Application

Build a web-based calculator application with the following features:
- Basic arithmetic operations (add, subtract, multiply, divide)
- Memory functions (M+, M-, MR, MC)
- Clear and backspace functionality
- Keyboard support
- Responsive design
- Comprehensive test coverage

## Technical Stack
- Frontend: React + TypeScript
- Styling: Tailwind CSS
- Testing: Jest (unit) + Playwright (E2E)
- Build: Vite

## Success Criteria
- All arithmetic operations work correctly
- Memory functions persist across operations
- Test coverage > 80%
- Passes all E2E tests
- Responsive on mobile and desktop`,
    });

    console.log('');

    // Step 2: Create Story #1 - Arithmetic Operations
    const story1 = await createIssue({
      title: 'Implement basic arithmetic operations',
      type: 'story',
      status: 'todo',
      priority: 'high',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 5,
      description: `Implement core arithmetic operations:
- Addition (+)
- Subtraction (-)
- Multiplication (×)
- Division (÷)

Requirements:
- Handle decimal numbers
- Handle negative numbers
- Prevent division by zero
- Display results with appropriate precision`,
    });

    // Step 3: Create Story #2 - UI Components
    const story2 = await createIssue({
      title: 'Build calculator UI components',
      type: 'story',
      status: 'todo',
      priority: 'high',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 8,
      description: `Create the calculator user interface:
- Display screen (current number, result)
- Number buttons (0-9, decimal point)
- Operation buttons (+, -, ×, ÷, =)
- Clear (C) and backspace buttons
- Memory buttons (M+, M-, MR, MC)

Design:
- Clean, modern UI
- Touch-friendly button sizes
- Responsive layout (desktop + mobile)
- Keyboard shortcuts`,
    });

    // Step 4: Create Story #3 - Memory Functions
    const story3 = await createIssue({
      title: 'Add memory functions',
      type: 'story',
      status: 'backlog',
      priority: 'medium',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 3,
      description: `Implement calculator memory functions:
- M+ (add current value to memory)
- M- (subtract current value from memory)
- MR (recall memory value)
- MC (clear memory)

Requirements:
- Memory persists across operations
- Visual indicator when memory has value
- Memory independent of display`,
    });

    // Step 5: Create Task #1 - Unit Tests
    const task1 = await createIssue({
      title: 'Write unit tests for arithmetic logic',
      type: 'task',
      status: 'todo',
      priority: 'high',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 3,
      description: `Create comprehensive unit tests using Jest:
- Test all arithmetic operations
- Test edge cases (division by zero, very large numbers, decimals)
- Test memory functions
- Test clear/backspace functionality

Target: 80%+ code coverage`,
    });

    // Step 6: Create Task #2 - E2E Tests
    const task2 = await createIssue({
      title: 'Create E2E tests for user interactions',
      type: 'task',
      status: 'backlog',
      priority: 'medium',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 5,
      description: `Implement end-to-end tests using Playwright:
- Test complete calculation workflows
- Test keyboard shortcuts
- Test responsive behavior
- Test memory function workflows
- Test error states

Record sessions with Browserbase for evidence`,
    });

    // Step 7: Create Bug #1 - Division by Zero
    const bug1 = await createIssue({
      title: 'Handle division by zero gracefully',
      type: 'bug',
      status: 'backlog',
      priority: 'high',
      parent_id: epic.id,
      epic_id: epic.id,
      story_points: 1,
      description: `Current behavior: Division by zero shows "Infinity"

Expected behavior: Show user-friendly error message "Cannot divide by zero"

Implementation:
- Check for zero divisor before operation
- Display error message in display
- Clear error on next number input`,
    });

    console.log('');

    // Step 8: Create dependencies
    console.log('🔗 Creating dependencies...');
    await addDependency(task1.id, story1.id, 'blocked_by'); // Unit tests need arithmetic logic
    await addDependency(task2.id, story2.id, 'blocked_by'); // E2E tests need UI
    await addDependency(story3.id, story1.id, 'blocked_by'); // Memory needs arithmetic
    await addDependency(bug1.id, story1.id, 'related'); // Bug is related to arithmetic

    console.log('');

    // Step 9: Create release
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14); // 2 weeks from now
    const release = await createRelease(
      'Calculator v1.0',
      '1.0.0',
      targetDate.toISOString().split('T')[0]
    );

    console.log('');

    // Step 10: Assign issues to release
    console.log('📌 Assigning issues to release...');
    await assignIssueToRelease(story1.id, release.id);
    await assignIssueToRelease(story2.id, release.id);
    await assignIssueToRelease(story3.id, release.id);
    await assignIssueToRelease(task1.id, release.id);
    await assignIssueToRelease(task2.id, release.id);
    await assignIssueToRelease(bug1.id, release.id);

    console.log('');
    console.log('✨ Calculator Epic created successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Epic: ${epic.id} - ${epic.title}`);
    console.log(`   Stories: 3 (${story1.id}, ${story2.id}, ${story3.id})`);
    console.log(`   Tasks: 2 (${task1.id}, ${task2.id})`);
    console.log(`   Bugs: 1 (${bug1.id})`);
    console.log(`   Release: ${release.id} - ${release.name}`);
    console.log(`   Total Story Points: 25`);
    console.log('');
    console.log('🔗 Dependencies:');
    console.log(`   ${task1.id} blocked by ${story1.id}`);
    console.log(`   ${task2.id} blocked by ${story2.id}`);
    console.log(`   ${story3.id} blocked by ${story1.id}`);
    console.log('');
    console.log(`🌐 View in dashboard: http://localhost:3000/tracker/${WORKTREE_ID}/${BOARD_ID}`);
    console.log('');
    console.log('Ready to test orchestration workflows! 🚀');

  } catch (error) {
    console.error('');
    console.error('❌ Failed to seed calculator epic');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
seedCalculatorEpic();
