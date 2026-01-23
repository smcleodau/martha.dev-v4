/**
 * E2E Test Helpers
 * Common utilities and fixtures for Playwright tests
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for the tracker page to fully load
 */
export async function waitForTrackerLoad(page: Page) {
  await expect(page.locator('[data-testid="kanban-board"], [data-testid="list-view"], [data-testid="timeline-view"], [data-testid="gantt-view"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Navigate to a specific view
 */
export async function switchToView(page: Page, view: 'kanban' | 'list' | 'timeline' | 'gantt') {
  const viewButton = page.locator(`[data-testid="view-${view}"], button:has-text("${view.charAt(0).toUpperCase() + view.slice(1)}")`).first();
  await viewButton.click();
  await expect(page).toHaveURL(new RegExp(`/${view}`));
}

/**
 * Create a new issue via the UI
 */
export async function createIssue(
  page: Page,
  title: string,
  type: 'task' | 'bug' | 'story' | 'epic' = 'task'
): Promise<void> {
  const newIssueButton = page.locator('button:has-text("+ New Issue")');

  page.once('dialog', async dialog => {
    if (dialog.message().includes('Issue title:')) {
      await dialog.accept(title);
    }
  });

  await newIssueButton.click();

  page.once('dialog', async dialog => {
    if (dialog.message().includes('Type')) {
      await dialog.accept(type);
    }
  });

  await page.waitForTimeout(1000);
}

/**
 * Search for an issue by title
 */
export async function searchIssue(page: Page, title: string): Promise<void> {
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.isVisible({ timeout: 2000 })) {
    await searchInput.fill(title);
    await page.waitForTimeout(500);
  }
}

/**
 * Open issue detail panel
 */
export async function openIssueDetail(page: Page, issueTitle?: string): Promise<void> {
  if (issueTitle) {
    await searchIssue(page, issueTitle);
    const issueCard = page.locator(`[data-testid="issue-card"]:has-text("${issueTitle}")`).first();
    await issueCard.click();
  } else {
    const issueCard = page.locator('[data-testid="issue-card"]').first();
    await issueCard.click();
  }

  await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });
}

/**
 * Close issue detail panel
 */
export async function closeIssueDetail(page: Page): Promise<void> {
  const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

/**
 * Apply a filter
 */
export async function applyFilter(
  page: Page,
  filterType: 'initiative' | 'team' | 'priority' | 'type',
  optionIndex: number = 0
): Promise<void> {
  const filter = page.locator(`[data-testid="${filterType}-filter"], button:has-text("${filterType.charAt(0).toUpperCase() + filterType.slice(1)}")`).first();

  if (await filter.isVisible({ timeout: 2000 })) {
    await filter.click();

    const option = page.locator('[data-testid*="option"], [role="option"]').nth(optionIndex);
    if (await option.isVisible({ timeout: 2000 })) {
      await option.click();
    } else {
      await page.keyboard.press('Escape');
    }
  }
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('[data-testid="clear-filters"], button:has-text("Clear")').first();
  if (await clearButton.isVisible({ timeout: 2000 })) {
    await clearButton.click();
  }
}

/**
 * Drag and drop element
 */
export async function dragAndDrop(
  page: Page,
  sourceSelector: string,
  targetSelector: string
): Promise<void> {
  const source = page.locator(sourceSelector).first();
  const target = page.locator(targetSelector).first();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (sourceBox && targetBox) {
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
}

/**
 * Log time entry
 */
export async function logTimeEntry(
  page: Page,
  hours: number,
  description?: string
): Promise<void> {
  const timeSection = page.locator('[data-testid="time-tracking"]');
  await timeSection.scrollIntoViewIfNeeded();

  const logTimeButton = page.locator('[data-testid="log-time-button"], button:has-text("Log Time")').first();
  if (await logTimeButton.isVisible({ timeout: 2000 })) {
    await logTimeButton.click();

    const hoursInput = page.locator('[data-testid="hours-input"], input[name="hours"]').first();
    if (await hoursInput.isVisible({ timeout: 2000 })) {
      await hoursInput.fill(hours.toString());

      if (description) {
        const descInput = page.locator('[data-testid="time-description"], input[name="description"], textarea').first();
        if (await descInput.isVisible({ timeout: 1000 })) {
          await descInput.fill(description);
        }
      }

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Log")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }
    }
  }
}

/**
 * Set issue dates
 */
export async function setIssueDates(
  page: Page,
  startDate?: Date,
  dueDate?: Date
): Promise<void> {
  if (startDate) {
    const startInput = page.locator('[data-testid="start-date"], input[name="start_date"]').first();
    if (await startInput.isVisible({ timeout: 2000 })) {
      await startInput.fill(startDate.toISOString().split('T')[0]);
    }
  }

  if (dueDate) {
    const dueInput = page.locator('[data-testid="due-date"], input[name="due_date"]').nth(1);
    if (await dueInput.isVisible({ timeout: 2000 })) {
      await dueInput.fill(dueDate.toISOString().split('T')[0]);
    }
  }
}

/**
 * Update issue status
 */
export async function updateIssueStatus(
  page: Page,
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
): Promise<void> {
  const statusSelect = page.locator('[data-testid="status-select"], select[name="status"]').first();
  if (await statusSelect.isVisible({ timeout: 2000 })) {
    await statusSelect.click();

    const statusOption = page.locator(`option:has-text("${status}"), option[value="${status}"]`).first();
    if (await statusOption.isVisible()) {
      await statusOption.click();
    }
  }
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 5000
): Promise<void> {
  await page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Check if element is visible (with fallback)
 */
export async function isVisibleSafe(page: Page, selector: string): Promise<boolean> {
  try {
    return await page.locator(selector).first().isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Screenshot on test step
 */
export async function screenshotStep(page: Page, stepName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${stepName.replace(/\s+/g, '-').toLowerCase()}.png`,
    fullPage: true,
  });
}
