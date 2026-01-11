# Martha.dev MAPDS - Git Branching Strategy

## Branch Structure

We follow a **modified Gitflow** workflow optimized for rapid development and infrastructure management.

### Permanent Branches

#### `main`
- **Purpose**: Production-ready code
- **Protection**: Protected branch, requires PR reviews
- **Deployments**: Production Martha service deployments
- **Merges from**: `develop` only (via PR)
- **Never commit directly to main**

#### `develop`
- **Purpose**: Integration branch for features
- **Protection**: Semi-protected, team leads can merge
- **State**: Should always be stable and deployable
- **Merges from**: Feature branches
- **Merges to**: `main` (via release PR)

### Temporary Branches

#### Feature Branches: `feature/<name>`
**Format**: `feature/monitoring-deployment`, `feature/github-integration`, `feature/mcp-server`

- **Created from**: `develop`
- **Merged to**: `develop`
- **Naming**: Use lowercase with hyphens
- **Lifespan**: Delete after merge
- **Examples**:
  - `feature/monitoring-deployment` - Initial monitoring system setup
  - `feature/cloudflare-tunnels` - Tunnel management implementation
  - `feature/swarm-orchestration` - Claude-flow swarm integration
  - `feature/github-epic-sync` - GitHub epic/issue synchronization
  - `feature/test-orchestration` - Test execution coordination
  - `feature/evidence-collection` - Braintrust/Browserbase integration

#### Bugfix Branches: `bugfix/<issue>`
**Format**: `bugfix/redis-connection`, `bugfix/agent-crash`

- **Created from**: `develop` (or `main` for hotfixes)
- **Merged to**: `develop` (or `main` for hotfixes)
- **Naming**: Use issue number or short description
- **Examples**:
  - `bugfix/redis-connection-leak`
  - `bugfix/agent-docker-permissions`
  - `bugfix/websocket-timeout`

#### Hotfix Branches: `hotfix/<critical-issue>`
**Format**: `hotfix/service-crash`, `hotfix/port-conflict`

- **Created from**: `main`
- **Merged to**: Both `main` AND `develop`
- **Purpose**: Critical production fixes
- **Process**: Fast-track review and merge
- **Examples**:
  - `hotfix/service-memory-leak`
  - `hotfix/redis-password-leak`

#### Release Branches: `release/v<version>`
**Format**: `release/v1.0.0`, `release/v2.1.0`

- **Created from**: `develop`
- **Merged to**: `main` and `develop`
- **Purpose**: Prepare for production release
- **Activities**: Version bumps, documentation, final testing
- **Examples**:
  - `release/v1.0.0` - Initial production release
  - `release/v2.0.0` - MCP server + GitHub integration

---

## Workflow Examples

### Feature Development

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/github-integration

# Work on feature
git add .
git commit -m "Add GitHub GraphQL client"

# Push and create PR
git push -u origin feature/github-integration
# Create PR: feature/github-integration → develop

# After PR approved and merged
git checkout develop
git pull origin develop
git branch -d feature/github-integration
```

### Bugfix

```bash
# Start bugfix
git checkout develop
git checkout -b bugfix/agent-crash

# Fix the bug
git add .
git commit -m "Fix agent crash on docker permission denied"

# Push and create PR
git push -u origin bugfix/agent-crash
# Create PR: bugfix/agent-crash → develop
```

### Hotfix (Critical Production Issue)

```bash
# Start hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/service-memory-leak

# Fix the issue
git add .
git commit -m "Fix memory leak in event storage"

# Merge to main first
git checkout main
git merge hotfix/service-memory-leak
git push origin main

# Also merge to develop
git checkout develop
git merge hotfix/service-memory-leak
git push origin develop

# Delete hotfix branch
git branch -d hotfix/service-memory-leak
```

### Release

```bash
# Create release branch
git checkout develop
git checkout -b release/v1.0.0

# Bump version, update docs
git commit -m "Prepare v1.0.0 release"

# Merge to main
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge release/v1.0.0
git push origin develop

# Delete release branch
git branch -d release/v1.0.0
```

---

## Commit Message Guidelines

### Format
```
<type>: <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat: Add Cloudflare tunnel provisioning

- Implement tunnel creation via Cloudflare API
- Add DNS record management
- Update worktree .env with tunnel URLs
- Support multiple services per worktree

Closes #42
```

```
fix: Resolve agent crash on non-git directories

- Check if directory is git repo before git operations
- Gracefully skip git events if not a repo
- Add error logging for git failures

Fixes #78
```

---

## Branch Protection Rules

### `main` Branch
- ✅ Require pull request reviews (1 approval minimum)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ No force pushes
- ✅ No deletions

### `develop` Branch
- ✅ Require pull request reviews (optional for team leads)
- ✅ Require status checks to pass
- ⚠️ Allow force pushes (team leads only)
- ✅ No deletions

---

## Current Active Branches

| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production code | Stable |
| `develop` | Integration branch | Active |
| `feature/monitoring-deployment` | Initial monitoring setup | In Progress |

---

## Version Numbering

We follow **Semantic Versioning** (semver): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., v2.0.0)
- **MINOR**: New features, backwards compatible (e.g., v1.1.0)
- **PATCH**: Bug fixes, backwards compatible (e.g., v1.0.1)

### Current Version
- **Development**: v2.0.0-dev (feature/monitoring-deployment)
- **Production**: v1.0.0 (not yet released)

---

## Best Practices

1. **Keep branches focused**: One feature/fix per branch
2. **Small, frequent commits**: Easier to review and revert
3. **Descriptive commit messages**: Explain why, not just what
4. **Pull before push**: Avoid merge conflicts
5. **Delete merged branches**: Keep repository clean
6. **Test before PR**: Ensure code works
7. **Review your own PR first**: Catch obvious issues
8. **Respond to review feedback promptly**

---

## Questions?

- Check existing branches: `git branch -a`
- Check current branch: `git status`
- See branch history: `git log --graph --oneline --all`
- Need help? Ask in team chat or review this guide

---

**Last Updated**: 2026-01-11
**Maintained By**: Martha.dev Team
