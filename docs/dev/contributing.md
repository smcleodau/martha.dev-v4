# Contributing to Martha Tracker

Thank you for your interest in contributing to Martha Tracker! This guide will help you get started.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build great software together.

## Getting Started

### 1. Fork and Clone

```bash
# Fork on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/martha.dev-v4.git
cd martha.dev-v4
```

### 2. Install Dependencies

```bash
# Backend
npm install

# Frontend
cd dashboard
npm install
cd ..
```

### 3. Setup Environment

```bash
cp .env.local.template .env.local
# Edit .env.local with your settings
```

### 4. Run Development Server

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd dashboard
npm run dev
```

### 5. Create Branch

```bash
git checkout -b feature/your-feature-name
```

## Development Workflow

### Making Changes

1. **Write code** following our style guide
2. **Add tests** for new functionality
3. **Update docs** if needed
4. **Run tests** to ensure nothing breaks
5. **Commit changes** with clear messages

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.spec.ts

# Run with coverage
npm run test:coverage

# Frontend tests
cd dashboard
npm test
```

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Code Style

### TypeScript

```typescript
// Use interfaces for data structures
interface Issue {
  id: string;
  title: string;
  type: IssueType;
}

// Use enums for fixed sets
enum IssueType {
  Epic = 'epic',
  Story = 'story',
  Task = 'task',
  Bug = 'bug'
}

// Use explicit types, avoid 'any'
function createIssue(data: IssueCreateRequest): Issue {
  // Implementation
}

// Use async/await, not callbacks
async function loadIssue(id: string): Promise<Issue> {
  const data = await readFile(path);
  return JSON.parse(data);
}
```

### React

```typescript
// Use functional components
export function IssueCard({ issue }: Props) {
  // Use hooks
  const [expanded, setExpanded] = useState(false);

  // Event handlers with 'handle' prefix
  const handleClick = () => {
    setExpanded(!expanded);
  };

  // Early returns for conditions
  if (!issue) {
    return null;
  }

  return (
    <div onClick={handleClick}>
      {/* JSX */}
    </div>
  );
}

// PropTypes with TypeScript interface
interface Props {
  issue: Issue;
  onUpdate?: (issue: Issue) => void;
}
```

### Naming Conventions

- **Files:** kebab-case (`issue-card.tsx`, `board-manager.ts`)
- **Components:** PascalCase (`IssueCard`, `KanbanBoard`)
- **Functions:** camelCase (`createIssue`, `loadBoard`)
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_COLUMNS`, `MAX_TITLE_LENGTH`)
- **Interfaces/Types:** PascalCase (`Issue`, `BoardState`)

### File Organization

```
src/
├─ tracker/
│  ├─ routes/          # API route handlers
│  ├─ services/        # Business logic
│  └─ types.ts         # Type definitions

dashboard/src/
├─ components/
│  └─ tracker/
│     ├─ board/        # Kanban view
│     ├─ list/         # List view
│     ├─ timeline/     # Timeline view
│     ├─ gantt/        # Gantt view
│     ├─ detail/       # Detail panel
│     ├─ shared/       # Shared components
│     └─ navigation/   # Navigation
├─ api/                # API client
├─ contexts/           # React contexts
└─ utils/              # Utilities
```

## Git Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Add/update tests
- `chore:` Maintenance

**Examples:**

```
feat(tracker): add timeline view

Implement horizontal timeline visualization with drag-and-drop
scheduling and swimlane grouping.

Closes #123
```

```
fix(kanban): fix drag and drop on mobile

Touch events were not properly handled on mobile devices.
Added touch event listeners and preventDefault calls.
```

```
docs(api): update API documentation

Add examples for new initiative endpoints.
```

## Pull Request Process

### 1. Prepare PR

```bash
# Update from main
git fetch origin
git rebase origin/develop

# Run tests
npm test

# Push to your fork
git push origin feature/your-feature
```

### 2. Create PR

On GitHub:
- Click "New Pull Request"
- Select base: `develop` (not `main`)
- Fill in template:
  - **Title:** Clear, descriptive
  - **Description:** What and why
  - **Testing:** How to test
  - **Screenshots:** For UI changes

### 3. PR Template

```markdown
## Summary
Brief description of changes.

## Motivation
Why is this change needed?

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How to test this change:
1. Step 1
2. Step 2
3. Expected result

## Screenshots
[If UI changes]

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Linting passes
- [ ] No breaking changes (or documented)
```

### 4. Code Review

- Address review comments promptly
- Push new commits (don't force-push during review)
- Mark conversations as resolved
- Request re-review when ready

### 5. Merge

Once approved:
- Squash and merge (default)
- Delete branch after merge

## Testing Guidelines

### Test Structure

```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    // Arrange
    const input = {...};

    // Act
    const result = doSomething(input);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

### What to Test

**Unit Tests:**
- Service functions
- Utilities
- Business logic
- Edge cases

**Integration Tests:**
- API endpoints
- Database operations
- File I/O

**E2E Tests:**
- Critical user flows
- Cross-component interactions
- Real browser testing

### Test Coverage

Aim for:
- 80%+ overall coverage
- 100% for critical paths
- 90%+ for services

## Documentation

### Code Comments

```typescript
/**
 * Creates a new issue in the specified board.
 *
 * @param worktreeId - Worktree identifier
 * @param boardId - Board identifier
 * @param data - Issue creation data
 * @returns Created issue
 * @throws {Error} If worktree or board not found
 */
export function createIssue(
  worktreeId: string,
  boardId: string,
  data: IssueCreateRequest
): Issue {
  // Implementation
}
```

### README Updates

If your change affects:
- Setup/installation
- Configuration
- API usage
- Features

Update relevant README files.

### API Documentation

For API changes:
- Update `/docs/api/tracker-api.md`
- Include examples
- Document breaking changes

## Issue Labels

When creating issues:

- `bug` - Something broken
- `feature` - New functionality
- `enhancement` - Improve existing
- `docs` - Documentation
- `performance` - Speed/efficiency
- `refactor` - Code cleanup
- `test` - Testing
- `good first issue` - For beginners
- `help wanted` - Need assistance
- `priority:high` - Urgent
- `priority:low` - Can wait

## Branch Strategy

```
main                  # Production releases
├─ develop            # Development branch (base for PRs)
   ├─ feature/foo     # Feature branches
   ├─ fix/bar         # Bug fix branches
   └─ docs/baz        # Documentation branches
```

**Rules:**
- Never commit directly to `main`
- Rarely commit to `develop`
- Create feature branches from `develop`
- PR back to `develop`
- Periodic releases from `develop` to `main`

## Release Process

For maintainers:

1. **Create release branch**
   ```bash
   git checkout -b release/v2.1.0 develop
   ```

2. **Update version**
   ```bash
   npm version minor  # or major/patch
   ```

3. **Update changelog**
   - Add release notes to `CHANGELOG.md`
   - List new features, fixes, breaking changes

4. **Test release**
   ```bash
   npm run build
   npm test
   ```

5. **Merge to main**
   ```bash
   git checkout main
   git merge release/v2.1.0
   git tag v2.1.0
   git push origin main --tags
   ```

6. **Merge back to develop**
   ```bash
   git checkout develop
   git merge release/v2.1.0
   git push origin develop
   ```

## Getting Help

- **GitHub Issues:** Report bugs, request features
- **GitHub Discussions:** Ask questions, share ideas
- **Discord:** Real-time chat (link in README)
- **Email:** dev@martha.dev

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Project README
- Special thanks in changelogs

Thank you for contributing to Martha Tracker!

---

**Last Updated:** 2026-01-18
