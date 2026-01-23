# Testing Guide for Martha Tracker Dashboard

## Quick Start

### Running Tests
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- ViewSwitcher.test.tsx
```

## Writing Tests

### Test File Structure
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Using Test Utilities

#### Custom Render with Providers
```typescript
import { render } from '../../test/test-utils';

// Automatically wraps with QueryClient, Router, and Preferences providers
render(<YourComponent />);
```

#### Mock Data Generators
```typescript
import { createMockIssue, createMockBoard, createMockIssues } from '../../test/mocks';

const issue = createMockIssue({ title: 'Custom Title' });
const issues = createMockIssues(10);
const board = createMockBoard({ name: 'Custom Board' });
```

### Testing Patterns

#### Component Rendering
```typescript
it('renders component with props', () => {
  render(<Component name="Test" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

#### User Interactions
```typescript
it('handles click events', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Click Me</Button>);

  await user.click(screen.getByRole('button', { name: /click me/i }));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### Keyboard Events
```typescript
it('responds to keyboard shortcuts', () => {
  const onShortcut = vi.fn();
  render(<Component onShortcut={onShortcut} />);

  const event = new KeyboardEvent('keydown', { ctrlKey: true, key: '1' });
  window.dispatchEvent(event);

  expect(onShortcut).toHaveBeenCalled();
});
```

#### Testing Hooks
```typescript
import { renderHook, act } from '@testing-library/react';

it('updates state correctly', () => {
  const { result } = renderHook(() => useYourHook());

  act(() => {
    result.current.updateValue('new value');
  });

  expect(result.current.value).toBe('new value');
});
```

#### Testing with React Query
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

const { result } = renderHook(() => useYourQuery(), {
  wrapper: createWrapper(),
});
```

#### Mocking Components
```typescript
vi.mock('../ComplexComponent', () => ({
  ComplexComponent: ({ data }: any) => (
    <div data-testid="complex-component">{data.title}</div>
  ),
}));
```

#### Testing Timers
```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('debounces correctly', () => {
  const callback = vi.fn();

  // ... trigger debounced action

  act(() => {
    vi.advanceTimersByTime(300);
  });

  expect(callback).toHaveBeenCalled();
});
```

### Accessibility Testing
```typescript
it('has proper ARIA labels', () => {
  render(<Component />);

  const button = screen.getByRole('button', { name: /submit/i });
  expect(button).toHaveAttribute('aria-label', 'Submit form');
});

it('is keyboard navigable', async () => {
  const user = userEvent.setup();
  render(<Form />);

  const input = screen.getByRole('textbox');
  input.focus();

  await user.keyboard('{Tab}');

  const button = screen.getByRole('button');
  expect(button).toHaveFocus();
});
```

### Async Testing
```typescript
import { waitFor } from '@testing-library/react';

it('loads data asynchronously', async () => {
  render(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded Data')).toBeInTheDocument();
  });
});
```

## Common Testing Scenarios

### Form Testing
```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<Form onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText(/name/i), 'John Doe');
  await user.type(screen.getByLabelText(/email/i), 'john@example.com');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
  });
});
```

### Error State Testing
```typescript
it('displays error message on failure', async () => {
  vi.mocked(api.fetchData).mockRejectedValue(new Error('Failed'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
  });
});
```

### Loading State Testing
```typescript
it('shows loading spinner while fetching', () => {
  render(<Component isLoading={true} />);

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

## Best Practices

### DO ✅
- Write descriptive test names that explain what is being tested
- Test user behavior, not implementation details
- Use screen.getByRole() for better accessibility testing
- Clean up after each test with afterEach
- Mock external dependencies and API calls
- Test edge cases and error states
- Use semantic queries (getByRole, getByLabelText)
- Keep tests simple and focused on one thing

### DON'T ❌
- Test implementation details (internal state, private methods)
- Use container.querySelector() unless necessary
- Forget to clean up mocks and timers
- Write tests that depend on execution order
- Test library code (React, third-party libraries)
- Use getByTestId() as first choice (use semantic queries)
- Create flaky tests with hard-coded timeouts

## Debugging Tests

### View Test Output
```bash
# Verbose output
npm test -- --reporter=verbose

# Run single test file
npm test -- ViewSwitcher.test.tsx

# Run tests matching pattern
npm test -- --grep "keyboard shortcuts"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

#### "screen.getByX is not a function"
- Import from test-utils: `import { render, screen } from '../../test/test-utils'`

#### "Cannot read properties of undefined"
- Mock the component/module properly
- Check if required providers are wrapped

#### "Element not found"
- Use screen.debug() to see rendered output
- Check if using correct query (getBy vs queryBy vs findBy)
- Element might be rendered asynchronously (use await waitFor)

#### Timeout Errors
- Increase timeout for slow operations
- Use fake timers for debounce/throttle tests
- Check if waiting for async operations to complete

## Code Coverage

### Viewing Coverage Report
```bash
npm run test:coverage
```

Coverage reports are generated in:
- Console output (summary)
- `coverage/index.html` (detailed HTML report)
- `coverage/lcov-report/index.html` (LCOV format)

### Coverage Thresholds
Configured in `vite.config.ts`:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Improving Coverage
1. Run coverage report to identify uncovered lines
2. Add tests for uncovered branches
3. Test error handling and edge cases
4. Ensure all component props variations are tested

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
