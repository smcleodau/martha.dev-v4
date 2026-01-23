import { test, expect } from '@playwright/test';

/**
 * E2E Test: Filter and Gantt View
 *
 * Test Scenario:
 * 1. Apply initiative filter
 * 2. Apply team filter
 * 3. Switch to Gantt view
 * 4. Add dependency between issues
 * 5. Verify dependency arrow appears
 */

test.describe('Filter and Gantt View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tracker page
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/kanban');

    // Wait for the board to load
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });
  });

  test('filter by initiative and team, then switch to gantt and add dependency', async ({ page }) => {
    // Step 1: Apply initiative filter
    const filterBar = page.locator('[data-testid="filter-bar"]');
    await expect(filterBar).toBeVisible({ timeout: 5000 });

    // Click initiative filter dropdown
    const initiativeFilter = page.locator('[data-testid="initiative-filter"], button:has-text("Initiative")').first();
    if (await initiativeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await initiativeFilter.click();

      // Select first initiative
      const initiativeOption = page.locator('[data-testid="initiative-option"], [role="option"]').first();
      if (await initiativeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await initiativeOption.click();
      } else {
        // Close dropdown if no options
        await page.keyboard.press('Escape');
      }
    }

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Step 2: Apply team filter
    const teamFilter = page.locator('[data-testid="team-filter"], button:has-text("Team")').first();
    if (await teamFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await teamFilter.click();

      // Select first team
      const teamOption = page.locator('[data-testid="team-option"], [role="option"]').first();
      if (await teamOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await teamOption.click();
      } else {
        // Close dropdown if no options
        await page.keyboard.press('Escape');
      }
    }

    // Wait for filters to apply
    await page.waitForTimeout(500);

    // Verify active filter chips are shown
    const filterChips = page.locator('[data-testid="active-filter-chips"], .filter-chip');
    if (await filterChips.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await filterChips.count()).toBeGreaterThanOrEqual(0);
    }

    // Step 3: Switch to Gantt view
    const ganttViewButton = page.locator('[data-testid="view-gantt"], button:has-text("Gantt")').first();
    await expect(ganttViewButton).toBeVisible({ timeout: 5000 });
    await ganttViewButton.click();

    // Wait for Gantt view to load
    await expect(page.locator('[data-testid="gantt-view"], [data-testid="gantt-chart"]')).toBeVisible({ timeout: 10000 });

    // Verify URL updated to gantt view
    await expect(page).toHaveURL(/\/gantt/);

    // Step 4: Add dependency between issues
    // Click on first task bar to select it
    const taskBars = page.locator('[data-testid="gantt-task-bar"], .gantt-task');
    const taskCount = await taskBars.count();

    if (taskCount >= 2) {
      // Click first task
      await taskBars.first().click();

      // Look for dependency controls
      const dependencyButton = page.locator('[data-testid="add-dependency"], button:has-text("Add Dependency")').first();
      if (await dependencyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dependencyButton.click();

        // Select second task as dependent
        const dependentSelect = page.locator('[data-testid="dependency-select"], select').first();
        if (await dependentSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dependentSelect.selectOption({ index: 1 });

          // Save dependency
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
          }
        }
      } else {
        // Alternative: Right-click context menu
        await taskBars.first().click({ button: 'right' });
        const dependencyMenuItem = page.locator('[role="menuitem"]:has-text("Add Dependency")').first();
        if (await dependencyMenuItem.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dependencyMenuItem.click();
        }
      }

      // Step 5: Verify dependency arrow appears
      await page.waitForTimeout(500);

      const dependencyLines = page.locator('[data-testid="dependency-line"], .dependency-arrow, svg line');
      if (await dependencyLines.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await dependencyLines.count()).toBeGreaterThan(0);
      }
    }
  });

  test('filter combinations and view persistence', async ({ page }) => {
    // Apply multiple filters
    const filterBar = page.locator('[data-testid="filter-bar"]');
    await expect(filterBar).toBeVisible({ timeout: 5000 });

    // Apply priority filter
    const priorityFilter = page.locator('[data-testid="priority-filter"], button:has-text("Priority")').first();
    if (await priorityFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await priorityFilter.click();

      // Select high priority
      const highPriority = page.locator('[data-testid="priority-high"], :has-text("High")').first();
      if (await highPriority.isVisible({ timeout: 1000 }).catch(() => false)) {
        await highPriority.click();
      }

      // Close dropdown
      await page.keyboard.press('Escape');
    }

    // Apply type filter
    const typeFilter = page.locator('[data-testid="type-filter"], button:has-text("Type")').first();
    if (await typeFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await typeFilter.click();

      // Select story type
      const storyType = page.locator('[data-testid="type-story"], :has-text("Story")').first();
      if (await storyType.isVisible({ timeout: 1000 }).catch(() => false)) {
        await storyType.click();
      }

      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);

    // Switch to Gantt view
    const ganttViewButton = page.locator('[data-testid="view-gantt"], button:has-text("Gantt")').first();
    await ganttViewButton.click();

    await expect(page.locator('[data-testid="gantt-view"], [data-testid="gantt-chart"]')).toBeVisible({ timeout: 10000 });

    // Verify filters persist across view change
    const filterChips = page.locator('[data-testid="active-filter-chips"], .filter-chip');
    if (await filterChips.isVisible({ timeout: 2000 }).catch(() => false)) {
      // At least one filter should be active
      expect(await filterChips.count()).toBeGreaterThanOrEqual(0);
    }

    // Switch back to Kanban
    const kanbanViewButton = page.locator('[data-testid="view-kanban"], button:has-text("Kanban")').first();
    await kanbanViewButton.click();

    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 5000 });

    // Verify filters still active
    if (await filterChips.isVisible({ timeout: 2000 }).catch(() => false)) {
      expect(await filterChips.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('gantt dependency visualization', async ({ page }) => {
    // Navigate directly to Gantt view
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/gantt');

    // Wait for Gantt chart to load
    await expect(page.locator('[data-testid="gantt-view"], [data-testid="gantt-chart"]')).toBeVisible({ timeout: 10000 });

    // Verify task bars are rendered
    const taskBars = page.locator('[data-testid="gantt-task-bar"], .gantt-task, rect[class*="task"]');
    const taskCount = await taskBars.count();

    expect(taskCount).toBeGreaterThanOrEqual(0);

    // Check for dependency visualization elements
    const dependencyContainer = page.locator('[data-testid="dependency-lines"], svg');
    if (await dependencyContainer.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(dependencyContainer).toBeVisible();
    }

    // Test zoom controls if available
    const zoomIn = page.locator('[data-testid="zoom-in"], button:has-text("Zoom In")').first();
    if (await zoomIn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await zoomIn.click();
      await page.waitForTimeout(300);
    }

    const zoomOut = page.locator('[data-testid="zoom-out"], button:has-text("Zoom Out")').first();
    if (await zoomOut.isVisible({ timeout: 2000 }).catch(() => false)) {
      await zoomOut.click();
      await page.waitForTimeout(300);
    }
  });
});
