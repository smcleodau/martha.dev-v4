# E2E Tests - Quick Start Guide

## 1. First Time Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium firefox webkit
```

## 2. Start the Backend Server

In a separate terminal:
```bash
npm run dev
```

Wait for server to start on `http://localhost:3000`

## 3. Run the Tests

### All Tests (Headless)
```bash
npm run test:e2e
```

### Interactive UI Mode (Recommended)
```bash
npm run test:e2e:ui
```

### See Browser While Testing
```bash
npm run test:e2e:headed
```

### Single Browser
```bash
npm run test:e2e:chromium
```

## 4. View Results

### HTML Report
```bash
npm run test:e2e:report
```

### Screenshots
Located in `test-results/` directory

### Videos
Located in `test-results/` directory (only on failure)

## 5. Run Specific Tests

```bash
# Single file
npx playwright test release-workflow.spec.ts

# Single test by name
npx playwright test -g "complete release workflow"

# Debug mode
npx playwright test --debug release-workflow.spec.ts
```

## 6. Common Commands

```bash
# List all tests
npx playwright test --list

# Run in Firefox only
npx playwright test --project=firefox

# Run with slow motion (for debugging)
npx playwright test --headed --slow-mo=1000

# Generate code by recording actions
npx playwright codegen http://localhost:3000/tracker
```

## 7. Troubleshooting

### Tests won't start
- Ensure backend server is running on port 3000
- Check `http://localhost:3000` in browser

### Tests timeout
- Increase timeout in `playwright.config.ts`
- Check server logs for errors

### Browser not found
```bash
npx playwright install chromium
```

### Permission errors on Linux
```bash
sudo npx playwright install-deps
```

## Test Structure

```
tests/e2e/
├── release-workflow.spec.ts    # Release management tests
├── filter-and-gantt.spec.ts    # Filtering and Gantt view
├── time-tracking.spec.ts       # Time tracking features
├── epic-timeline.spec.ts       # Epic and timeline view
├── view-switching.spec.ts      # View mode switching
├── helpers.ts                  # Utility functions
├── README.md                   # Full documentation
└── QUICK_START.md             # This file
```

## Test Coverage

- **95 total tests** across 5 browsers
- **19 test scenarios**
- **5 test files**

## Next Steps

1. Read `README.md` for detailed documentation
2. Check `TEST_DATA.md` for data setup
3. Review `MTH-057-E2E-TESTING-SUMMARY.md` for complete overview

## Quick Tips

- Use UI mode for development: `npm run test:e2e:ui`
- Use debug mode to step through tests: `npm run test:e2e:debug`
- Add `--headed` to see browser during tests
- Check screenshots in `test-results/` when tests fail
- Use `test.only()` to run single test during development

## Example: Running a Single Test

```bash
# 1. Start backend
npm run dev

# 2. In another terminal, run specific test
npx playwright test -g "switch between all view modes" --headed

# 3. View results
npm run test:e2e:report
```

Happy Testing!
