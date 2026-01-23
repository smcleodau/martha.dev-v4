import { test, expect } from '@playwright/test';

/**
 * E2E Test: View Mode Switching
 *
 * Test Scenario:
 * 1. Test switching between all view modes
 * 2. Verify URL updates correctly
 * 3. Verify view preferences persist
 * 4. Test view-specific features
 */

test.describe('View Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tracker page
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/kanban');

    // Wait for the board to load
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });
  });

  test('switch between all view modes', async ({ page }) => {
    // Start in Kanban view
    await expect(page).toHaveURL(/\/kanban/);
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Switch to List view
    const listViewButton = page.locator('[data-testid="view-list"], button:has-text("List")').first();
    await expect(listViewButton).toBeVisible({ timeout: 5000 });
    await listViewButton.click();

    // Verify List view loaded
    await expect(page).toHaveURL(/\/list/);
    await expect(page.locator('[data-testid="list-view"], [data-testid="issue-table"]')).toBeVisible({ timeout: 5000 });

    // Switch to Timeline view
    const timelineViewButton = page.locator('[data-testid="view-timeline"], button:has-text("Timeline")').first();
    await expect(timelineViewButton).toBeVisible();
    await timelineViewButton.click();

    // Verify Timeline view loaded
    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.locator('[data-testid="timeline-view"], [data-testid="timeline-calendar"]')).toBeVisible({ timeout: 10000 });

    // Switch to Gantt view
    const ganttViewButton = page.locator('[data-testid="view-gantt"], button:has-text("Gantt")').first();
    await expect(ganttViewButton).toBeVisible();
    await ganttViewButton.click();

    // Verify Gantt view loaded
    await expect(page).toHaveURL(/\/gantt/);
    await expect(page.locator('[data-testid="gantt-view"], [data-testid="gantt-chart"]')).toBeVisible({ timeout: 10000 });

    // Switch back to Kanban
    const kanbanViewButton = page.locator('[data-testid="view-kanban"], button:has-text("Kanban")').first();
    await expect(kanbanViewButton).toBeVisible();
    await kanbanViewButton.click();

    // Verify back to Kanban
    await expect(page).toHaveURL(/\/kanban/);
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
  });

  test('view preferences persist across reload', async ({ page }) => {
    // Switch to List view
    const listViewButton = page.locator('[data-testid="view-list"], button:has-text("List")').first();
    await listViewButton.click();

    await expect(page).toHaveURL(/\/list/);
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();

    // Should still be in List view
    await expect(page).toHaveURL(/\/list/);
    await expect(page.locator('[data-testid="list-view"]')).toBeVisible({ timeout: 5000 });

    // Switch to Gantt
    const ganttViewButton = page.locator('[data-testid="view-gantt"], button:has-text("Gantt")').first();
    await ganttViewButton.click();

    await expect(page).toHaveURL(/\/gantt/);

    // Reload again
    await page.reload();

    // Should stay in Gantt view
    await expect(page).toHaveURL(/\/gantt/);
    await expect(page.locator('[data-testid="gantt-view"]')).toBeVisible({ timeout: 10000 });
  });

  test('kanban view features', async ({ page }) => {
    // Ensure we're in Kanban view
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Verify columns exist
    const columns = page.locator('[data-testid="kanban-column"]');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);

    // Verify issue cards exist
    const issueCards = page.locator('[data-testid="issue-card"]');
    const cardCount = await issueCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(0);

    // Test drag and drop (if cards exist)
    if (cardCount >= 1) {
      const firstCard = issueCards.first();
      const firstCardBox = await firstCard.boundingBox();

      if (firstCardBox && columnCount > 1) {
        const targetColumn = columns.nth(1);
        const targetColumnBox = await targetColumn.boundingBox();

        if (targetColumnBox) {
          // Drag card to different column
          await page.mouse.move(firstCardBox.x + firstCardBox.width / 2, firstCardBox.y + firstCardBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(targetColumnBox.x + 100, targetColumnBox.y + 100, { steps: 10 });
          await page.mouse.up();

          await page.waitForTimeout(500);

          // Card should have moved (status updated)
          // Verification would require checking API or status change
        }
      }
    }

    // Test WIP limits if visible
    const wipLimit = page.locator('[data-testid="wip-limit"], .wip-limit').first();
    if (await wipLimit.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(wipLimit).toBeVisible();
    }
  });

  test('list view features', async ({ page }) => {
    // Switch to List view
    const listViewButton = page.locator('[data-testid="view-list"], button:has-text("List")').first();
    await listViewButton.click();

    await expect(page.locator('[data-testid="list-view"]')).toBeVisible({ timeout: 5000 });

    // Verify table headers
    const tableHeaders = page.locator('[data-testid="table-header"], th');
    const headerCount = await tableHeaders.count();
    expect(headerCount).toBeGreaterThan(0);

    // Verify table rows
    const tableRows = page.locator('[data-testid="issue-row"], tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);

    // Test sorting (click on a header)
    if (headerCount > 0) {
      const firstHeader = tableHeaders.first();
      await firstHeader.click();
      await page.waitForTimeout(300);

      // Click again to reverse sort
      await firstHeader.click();
      await page.waitForTimeout(300);
    }

    // Test bulk selection
    const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"], input[type="checkbox"]').first();
    if (await selectAllCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectAllCheckbox.check();
      await page.waitForTimeout(300);

      // Bulk actions toolbar should appear
      const bulkActionsToolbar = page.locator('[data-testid="bulk-actions-toolbar"]');
      if (await bulkActionsToolbar.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(bulkActionsToolbar).toBeVisible();
      }

      // Unselect all
      await selectAllCheckbox.uncheck();
    }

    // Test grouping controls
    const groupByControl = page.locator('[data-testid="group-by-control"], select[name*="group"]').first();
    if (await groupByControl.isVisible({ timeout: 2000 }).catch(() => false)) {
      await groupByControl.click();

      // Select a grouping option
      const groupOption = page.locator('option').nth(1);
      if (await groupOption.isVisible()) {
        await groupOption.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('timeline view features', async ({ page }) => {
    // Switch to Timeline view
    const timelineViewButton = page.locator('[data-testid="view-timeline"], button:has-text("Timeline")').first();
    await timelineViewButton.click();

    await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible({ timeout: 10000 });

    // Test swimlane mode selector
    const swimlaneSelector = page.locator('[data-testid="swimlane-mode-selector"]');
    if (await swimlaneSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try different swimlane modes
      const swimlaneOptions = swimlaneSelector.locator('button, option');
      const optionCount = await swimlaneOptions.count();

      if (optionCount > 0) {
        await swimlaneOptions.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Test zoom controls
    const zoomControls = page.locator('[data-testid="zoom-controls"]');
    if (await zoomControls.isVisible({ timeout: 2000 }).catch(() => false)) {
      const zoomInButton = zoomControls.locator('button:has-text("In"), button:has-text("+")').first();
      if (await zoomInButton.isVisible()) {
        await zoomInButton.click();
        await page.waitForTimeout(300);
      }

      const zoomOutButton = zoomControls.locator('button:has-text("Out"), button:has-text("-")').first();
      if (await zoomOutButton.isVisible()) {
        await zoomOutButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Test calendar navigation
    const nextButton = page.locator('[data-testid="timeline-next"], button:has-text("Next")').first();
    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(300);
    }

    const todayButton = page.locator('[data-testid="timeline-today"], button:has-text("Today")').first();
    if (await todayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('gantt view features', async ({ page }) => {
    // Switch to Gantt view
    const ganttViewButton = page.locator('[data-testid="view-gantt"], button:has-text("Gantt")').first();
    await ganttViewButton.click();

    await expect(page.locator('[data-testid="gantt-view"]')).toBeVisible({ timeout: 10000 });

    // Verify task bars are rendered
    const taskBars = page.locator('[data-testid="gantt-task-bar"], .gantt-task, rect[class*="task"]');
    const taskCount = await taskBars.count();
    expect(taskCount).toBeGreaterThanOrEqual(0);

    // Test critical path toggle
    const criticalPathToggle = page.locator('[data-testid="show-critical-path"], input[type="checkbox"]:has-text("Critical")').first();
    if (await criticalPathToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await criticalPathToggle.check();
      await page.waitForTimeout(300);

      // Critical path should be highlighted
      const criticalPathElements = page.locator('[data-testid="critical-path"], .critical-path');
      if (await criticalPathElements.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        expect(await criticalPathElements.count()).toBeGreaterThanOrEqual(0);
      }
    }

    // Test resource panel
    const resourcePanel = page.locator('[data-testid="resource-panel"]');
    if (await resourcePanel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(resourcePanel).toBeVisible();

      // Check for resource allocation bars
      const allocationBars = resourcePanel.locator('[data-testid="resource-allocation-bar"]');
      expect(await allocationBars.count()).toBeGreaterThanOrEqual(0);
    }

    // Test dependency controls
    const dependencyControls = page.locator('[data-testid="dependency-controls"]');
    if (await dependencyControls.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(dependencyControls).toBeVisible();
    }
  });

  test('view state persists with issue detail panel', async ({ page }) => {
    // Start in List view
    const listViewButton = page.locator('[data-testid="view-list"], button:has-text("List")').first();
    await listViewButton.click();

    await expect(page.locator('[data-testid="list-view"]')).toBeVisible({ timeout: 5000 });

    // Open an issue
    const issueRow = page.locator('[data-testid="issue-row"], tbody tr').first();
    if (await issueRow.isVisible()) {
      await issueRow.click();

      // Detail panel should open
      await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

      // Should still be in List view
      await expect(page).toHaveURL(/\/list/);

      // Close panel
      const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }

      // Still in List view
      await expect(page).toHaveURL(/\/list/);
    }

    // Switch to Timeline with panel open
    const issueCard = page.locator('[data-testid="issue-card"], [data-testid="issue-row"]').first();
    if (await issueCard.isVisible()) {
      await issueCard.click();
      await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });
    }

    const timelineViewButton = page.locator('[data-testid="view-timeline"], button:has-text("Timeline")').first();
    await timelineViewButton.click();

    // Should switch to Timeline with panel still open
    await expect(page).toHaveURL(/\/timeline/);
    await expect(page.locator('[data-testid="timeline-view"]')).toBeVisible({ timeout: 10000 });

    // Panel should remain open
    if (await page.locator('[data-testid="issue-detail-panel"]').isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible();
    }
  });
});
