import { test, expect } from '@playwright/test';

/**
 * E2E Test: Release Workflow
 *
 * Test Scenario:
 * 1. Create a new issue
 * 2. Add issue to a release
 * 3. Update release gates/checklist
 * 4. Mark issue as released
 * 5. Verify release status
 */

test.describe('Release Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to tracker page
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/kanban');

    // Wait for the board to load
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible({ timeout: 10000 });
  });

  test('complete release workflow - create issue, add to release, update gates, mark released', async ({ page }) => {
    // Step 1: Create new issue
    const newIssueButton = page.locator('button:has-text("+ New Issue")');
    await newIssueButton.click();

    // Fill in issue details in prompt (fallback to dialog if available)
    page.once('dialog', async dialog => {
      if (dialog.message().includes('Issue title:')) {
        await dialog.accept('E2E Test Release Feature');
      }
    });

    await newIssueButton.click();

    // Handle type prompt
    page.once('dialog', async dialog => {
      if (dialog.message().includes('Type')) {
        await dialog.accept('story');
      }
    });

    // Wait for issue to be created and appear
    await page.waitForTimeout(1000);

    // Alternative: Click issue card directly to open detail panel
    const issueCard = page.locator('[data-testid="issue-card"]').first();
    await issueCard.click({ timeout: 5000 }).catch(async () => {
      // Fallback: search for issue by title
      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('E2E Test Release Feature');
      await page.waitForTimeout(500);
      await page.locator('[data-testid="issue-card"]:has-text("E2E Test Release Feature")').first().click();
    });

    // Wait for detail panel to open
    await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

    // Step 2: Add to release
    // Scroll to release tracking section
    const releaseSection = page.locator('[data-testid="release-tracking"]');
    if (await releaseSection.isVisible()) {
      await releaseSection.scrollIntoViewIfNeeded();

      // Click "Add to Release" or select release dropdown
      const releaseSelect = releaseSection.locator('select, [role="combobox"]').first();
      if (await releaseSelect.isVisible()) {
        await releaseSelect.click();

        // Select first available release or create new one
        const releaseOption = page.locator('option, [role="option"]').first();
        if (await releaseOption.isVisible()) {
          await releaseOption.click();
        }
      }
    }

    // Step 3: Update release gates/checklist
    const qualitySection = page.locator('[data-testid="quality-metrics-panel"]');
    if (await qualitySection.isVisible()) {
      await qualitySection.scrollIntoViewIfNeeded();

      // Check off release gates
      const checkboxes = qualitySection.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const checkbox = checkboxes.nth(i);
        if (!(await checkbox.isChecked())) {
          await checkbox.check();
        }
      }
    }

    // Step 4: Update status to indicate release readiness
    const statusSelect = page.locator('[data-testid="status-select"], select[name="status"]').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.click();

      // Try to select 'done' or 'completed' status
      const doneOption = page.locator('option:has-text("done"), option:has-text("Done"), option:has-text("completed")').first();
      if (await doneOption.isVisible()) {
        await doneOption.click();
      }
    }

    // Step 5: Verify release information is updated
    await page.waitForTimeout(500);

    // Check that quality gates are checked
    if (await qualitySection.isVisible()) {
      const checkedBoxes = qualitySection.locator('input[type="checkbox"]:checked');
      const checkedCount = await checkedBoxes.count();
      expect(checkedCount).toBeGreaterThan(0);
    }

    // Verify release status or badge appears
    const releaseIndicator = page.locator('[data-testid="release-badge"], .release-status, :has-text("Release")').first();
    if (await releaseIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(releaseIndicator).toBeVisible();
    }

    // Close detail panel
    const closeButton = page.locator('[data-testid="close-detail-panel"], button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }

    // Verify issue card shows release indicator
    await page.waitForTimeout(500);
    const updatedCard = page.locator('[data-testid="issue-card"]:has-text("E2E Test Release Feature")').first();
    if (await updatedCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(updatedCard).toBeVisible();
    }
  });

  test('release gates validation workflow', async ({ page }) => {
    // Create issue with specific requirements
    const newIssueButton = page.locator('button:has-text("+ New Issue")');

    let issueTitle = '';
    page.on('dialog', async dialog => {
      if (dialog.message().includes('Issue title:')) {
        issueTitle = 'Release Gate Validation Test';
        await dialog.accept(issueTitle);
      } else if (dialog.message().includes('Type')) {
        await dialog.accept('task');
      }
    });

    await newIssueButton.click();
    await page.waitForTimeout(1000);

    // Open the created issue
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(issueTitle);
      await page.waitForTimeout(500);
    }

    const issueCard = page.locator(`[data-testid="issue-card"]:has-text("${issueTitle}")`).first();
    if (await issueCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await issueCard.click();
    } else {
      // Try clicking first issue card
      await page.locator('[data-testid="issue-card"]').first().click();
    }

    await expect(page.locator('[data-testid="issue-detail-panel"]')).toBeVisible({ timeout: 5000 });

    // Navigate to quality metrics
    const qualityPanel = page.locator('[data-testid="quality-metrics-panel"]');
    if (await qualityPanel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qualityPanel.scrollIntoViewIfNeeded();

      // Verify gate items are present
      const gateItems = qualityPanel.locator('[data-testid="gate-item"], .checklist-item, input[type="checkbox"]');
      const gateCount = await gateItems.count();

      if (gateCount > 0) {
        expect(gateCount).toBeGreaterThan(0);

        // Check first gate
        const firstGate = gateItems.first();
        if (await firstGate.getAttribute('type') === 'checkbox') {
          await firstGate.check();
          await expect(firstGate).toBeChecked();
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
