# E2E Testing with Playwright - MTH-057

This directory contains end-to-end tests for the Martha.dev tracker application using Playwright.

## Overview

The E2E test suite covers critical workflows in the tracker application:

1. **Release Workflow** - Create issue, add to release, update gates, mark released
2. **Filter and Gantt** - Apply filters, switch to Gantt view, add dependencies
3. **Time Tracking** - Log time entries, verify aggregated hours
4. **Epic Timeline** - Create epic, link to initiative, view on timeline
5. **View Switching** - Test all view modes and persistence

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright installed (via `npm install`)
- Backend server running on `http://localhost:3000` (or configure via `BASE_URL` env var)

## Installation

Install Playwright and browsers:

```bash
npm install
npx playwright install
```

On Linux, you may need to install system dependencies:

```bash
sudo npx playwright install-deps
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run tests on specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### View test report
```bash
npm run test:e2e:report
```

## Test Files

- `release-workflow.spec.ts` - Tests for release management workflow
- `filter-and-gantt.spec.ts` - Tests for filtering and Gantt view features
- `time-tracking.spec.ts` - Tests for time tracking functionality
- `epic-timeline.spec.ts` - Tests for epic creation and timeline view
- `view-switching.spec.ts` - Tests for view mode switching and persistence
- `helpers.ts` - Common test utilities and helper functions

## Configuration

Configuration is in `playwright.config.ts` at the project root:

- **Base URL**: `http://localhost:3000` (configurable via `BASE_URL` env)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Timeout**: 60s per test, 5s for assertions
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: On failure
- **Traces**: On first retry

## Environment Variables

```bash
# Set custom base URL
BASE_URL=http://localhost:8080 npm run test:e2e

# Run in CI mode (enables retries)
CI=true npm run test:e2e
```

## Test Data IDs

The tests use `data-testid` attributes for reliable element selection. Key test IDs:

### Views
- `kanban-board` - Kanban board container
- `list-view` - List view container
- `timeline-view` - Timeline view container
- `gantt-view` - Gantt view container

### Components
- `issue-card` - Issue card in kanban
- `issue-detail-panel` - Issue detail panel
- `filter-bar` - Filter bar
- `view-kanban`, `view-list`, `view-timeline`, `view-gantt` - View switcher buttons

### Sections
- `time-tracking` - Time tracking section
- `quality-metrics-panel` - Quality metrics panel
- `release-tracking` - Release tracking section
- `activity-timeline` - Activity timeline

### Actions
- `close-detail-panel` - Close button for detail panel
- `log-time-button` - Log time entry button
- `add-dependency` - Add dependency button

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tracker/martha-dev-v4/phase1-temporal-foundation/kanban');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
  });

  test('test scenario description', async ({ page }) => {
    // Test steps
  });
});
```

### Using Helpers

```typescript
import { openIssueDetail, logTimeEntry, closeIssueDetail } from './helpers';

test('test with helpers', async ({ page }) => {
  await openIssueDetail(page, 'My Issue Title');
  await logTimeEntry(page, 3, 'Development work');
  await closeIssueDetail(page);
});
```

## Best Practices

1. **Use data-testid attributes** - More reliable than text or CSS selectors
2. **Wait for visibility** - Always wait for elements before interacting
3. **Use timeouts** - Set reasonable timeouts for slow operations
4. **Add screenshots** - Capture screenshots on important steps for debugging
5. **Clean up state** - Close panels and reset filters after tests
6. **Use helpers** - Reuse common operations via helper functions
7. **Handle fallbacks** - Gracefully handle missing or optional UI elements

## Debugging

### View traces
```bash
npx playwright show-trace trace.zip
```

### Run single test file
```bash
npx playwright test release-workflow.spec.ts
```

### Run single test
```bash
npx playwright test -g "complete release workflow"
```

### Headed mode with slow motion
```bash
npx playwright test --headed --slow-mo=1000
```

## CI/CD Integration

The tests are configured to run in CI environments:

- Automatic retries on failure
- Screenshot and video capture
- HTML report generation
- JSON results export

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Playwright tests
  run: npm run test:e2e

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

## Troubleshooting

### Browser not installed
```bash
npx playwright install chromium
```

### Permission denied
```bash
sudo npx playwright install-deps
```

### Port already in use
```bash
# Change BASE_URL in playwright.config.ts or set env var
BASE_URL=http://localhost:8080 npm run test:e2e
```

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check backend server is running
- Verify network connectivity

## Test Coverage

Current test coverage includes:

- ✅ Issue creation and management
- ✅ View mode switching (Kanban, List, Timeline, Gantt)
- ✅ Filtering by initiative, team, priority, type
- ✅ Time tracking and aggregation
- ✅ Epic creation and timeline visualization
- ✅ Release workflow and gates
- ✅ Dependency management
- ✅ Drag and drop operations

## Future Enhancements

- [ ] Visual regression tests
- [ ] API mocking for isolated tests
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Mobile-specific workflows
- [ ] Multi-user collaboration tests
- [ ] WebSocket real-time updates tests

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)
