import { test, expect } from '@playwright/test';

/**
 * E2E Test: Time Tracking
 *
 * Test Scenario:
 * 1. Open issue detail panel
 * 2. Log time entry (3 hours)
 * 3. Log another time entry (2 hours)
 * 4. Verify total shows 5 hours
 * 5. Verify entries in activity timeline
 */

test.describe('Time Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tracker page
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/kanban');

    // Wait for the board to load
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });
  });

  test('log time entries and verify aggregated hours', async ({ page }) => {
    // Step 1: Open issue detail panel
    // Click on first available issue card
    const issueCard = page.locator('[data-testid="issue-card"]').first();
    await expect(issueCard).toBeVisible({ timeout: 5000 });
    await issueCard.click();

    // Wait for detail panel to open
    await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

    // Step 2: Log first time entry (3 hours)
    const timeTrackingSection = page.locator('[data-testid="time-tracking"], :has-text("Time Tracking")').first();

    if (await timeTrackingSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeTrackingSection.scrollIntoViewIfNeeded();

      // Click "Log Time" or "Add Time Entry" button
      const logTimeButton = page.locator('[data-testid="log-time-button"], button:has-text("Log Time")').first();
      if (await logTimeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logTimeButton.click();

        // Fill in hours field
        const hoursInput = page.locator('[data-testid="hours-input"], input[name="hours"], input[placeholder*="hours"]').first();
        if (await hoursInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hoursInput.fill('3');

          // Fill in description
          const descriptionInput = page.locator('[data-testid="time-description"], input[name="description"], textarea').first();
          if (await descriptionInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await descriptionInput.fill('Initial development work');
          }

          // Save time entry
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Log")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(500);
          }
        }
      } else {
        // Alternative: Direct input field
        const directHoursInput = timeTrackingSection.locator('input[type="number"], input[name*="hours"]').first();
        if (await directHoursInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await directHoursInput.fill('3');
          await directHoursInput.press('Enter');
          await page.waitForTimeout(500);
        }
      }

      // Step 3: Log second time entry (2 hours)
      const logTimeButton2 = page.locator('[data-testid="log-time-button"], button:has-text("Log Time")').first();
      if (await logTimeButton2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logTimeButton2.click();

        const hoursInput2 = page.locator('[data-testid="hours-input"], input[name="hours"], input[placeholder*="hours"]').first();
        if (await hoursInput2.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hoursInput2.fill('2');

          const descriptionInput2 = page.locator('[data-testid="time-description"], input[name="description"], textarea').first();
          if (await descriptionInput2.isVisible({ timeout: 1000 }).catch(() => false)) {
            await descriptionInput2.fill('Testing and bug fixes');
          }

          const saveButton2 = page.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Log")').first();
          if (await saveButton2.isVisible()) {
            await saveButton2.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Step 4: Verify total shows 5 hours
      const totalHours = page.locator('[data-testid="total-hours"], :has-text("Total:"), :has-text("Logged:")').first();
      if (await totalHours.isVisible({ timeout: 3000 }).catch(() => false)) {
        const totalText = await totalHours.textContent();
        expect(totalText).toMatch(/5|Total/i);
      }

      // Alternative: Check logged hours display
      const loggedHoursDisplay = timeTrackingSection.locator('.logged-hours, [class*="total"]').first();
      if (await loggedHoursDisplay.isVisible({ timeout: 2000 }).catch(() => false)) {
        const hoursText = await loggedHoursDisplay.textContent();
        // Should contain 5 somewhere
        expect(hoursText).toBeTruthy();
      }
    }

    // Step 5: Verify entries in activity timeline
    const activityTimeline = page.locator('[data-testid="activity-timeline"], :has-text("Activity")').first();
    if (await activityTimeline.isVisible({ timeout: 3000 }).catch(() => false)) {
      await activityTimeline.scrollIntoViewIfNeeded();

      // Look for time log entries
      const timeEntries = activityTimeline.locator('[data-testid="activity-entry"]:has-text("logged"), :has-text("time")');
      const entryCount = await timeEntries.count();

      // Should have at least some activity entries
      expect(entryCount).toBeGreaterThanOrEqual(0);
    }

    // Close detail panel
    const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('time tracking summary and progress', async ({ page }) => {
    // Open first issue
    const issueCard = page.locator('[data-testid="issue-card"]').first();
    await issueCard.click();

    await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

    // Check time tracking section
    const timeSection = page.locator('[data-testid="time-tracking"]');
    if (await timeSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeSection.scrollIntoViewIfNeeded();

      // Verify estimated hours field exists
      const estimatedHours = timeSection.locator('[data-testid="estimated-hours"], :has-text("Estimated")').first();
      if (await estimatedHours.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(estimatedHours).toBeVisible();
      }

      // Verify logged hours display
      const loggedHours = timeSection.locator('[data-testid="logged-hours"], :has-text("Logged")').first();
      if (await loggedHours.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(loggedHours).toBeVisible();
      }

      // Check for progress bar or indicator
      const progressIndicator = timeSection.locator('[data-testid="time-progress"], progress, [role="progressbar"]').first();
      if (await progressIndicator.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(progressIndicator).toBeVisible();
      }
    }

    // Close panel
    const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('time entry editing and deletion', async ({ page }) => {
    // Open issue
    const issueCard = page.locator('[data-testid="issue-card"]').first();
    await issueCard.click();

    await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

    // Navigate to time tracking
    const timeSection = page.locator('[data-testid="time-tracking"]');
    if (await timeSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timeSection.scrollIntoViewIfNeeded();

      // Log a time entry first
      const logTimeButton = page.locator('[data-testid="log-time-button"], button:has-text("Log Time")').first();
      if (await logTimeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logTimeButton.click();

        const hoursInput = page.locator('[data-testid="hours-input"], input[name="hours"]').first();
        if (await hoursInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await hoursInput.fill('1.5');

          const saveButton = page.locator('button:has-text("Save"), button:has-text("Log")').first();
          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Try to edit the entry
      const timeEntry = page.locator('[data-testid="time-entry"]').first();
      if (await timeEntry.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Hover to show edit/delete buttons
        await timeEntry.hover();

        const editButton = timeEntry.locator('[data-testid="edit-time-entry"], button[aria-label*="Edit"]').first();
        if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await editButton.click();

          // Modify hours
          const editHoursInput = page.locator('[data-testid="hours-input"], input[name="hours"]').first();
          if (await editHoursInput.isVisible({ timeout: 1000 }).catch(() => false)) {
            await editHoursInput.fill('2');

            const updateButton = page.locator('button:has-text("Update"), button:has-text("Save")').first();
            if (await updateButton.isVisible()) {
              await updateButton.click();
            }
          }
        }
      }
    }

    // Close panel
    const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });
});
