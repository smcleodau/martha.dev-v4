# Martha Tracker Documentation Index

Complete documentation for Martha Tracker v2.0 - Created 2026-01-18

## 📖 Quick Start

New to Martha Tracker? Start here:

1. **[Tracker Overview](./user-guide/tracker-overview.md)** - Learn the basics
2. **[View Modes](./user-guide/view-modes.md)** - Understand different views
3. **[API Reference](./api/tracker-api.md)** - Integrate with the API

## 🎯 User Documentation

### Getting Started
- **[Tracker Overview](./user-guide/tracker-overview.md)** - Introduction and basic concepts
  - What is Martha Tracker
  - Key concepts (worktrees, boards, issues)
  - Getting started guide
  - Common workflows

### View Modes
- **[View Modes Guide](./user-guide/view-modes.md)** - Comprehensive view documentation
  - Kanban View - Visual workflow management
  - List View - Spreadsheet-style editing
  - Timeline View - Date-based scheduling
  - Gantt View - Dependencies and resources

### Advanced Features
- **[Advanced Filtering](./user-guide/filtering.md)** - Search and filter techniques
  - Quick search syntax
  - Filter bar usage
  - Saved filters
  - Complex queries

- **[Initiatives & Teams](./user-guide/initiatives-teams.md)** - Organizing work
  - What are initiatives
  - Creating and managing initiatives
  - Team organization
  - Cross-team coordination

- **[Release Management](./user-guide/releases.md)** - Planning releases
  - Creating releases
  - Release planning
  - Tracking progress
  - Release reports

- **[Time Tracking](./user-guide/time-tracking.md)** - Estimation and logging
  - Story points vs hours
  - Logging time
  - Time reports
  - Velocity tracking

- **[Dependencies](./user-guide/dependencies.md)** - Managing relationships
  - Dependency types (blocks, blocked-by, related)
  - Adding dependencies
  - Critical path
  - Managing blockers

## 🔌 API Documentation

### REST API
- **[Complete API Reference](./api/tracker-api.md)** - Full REST API documentation
  - Overview and authentication
  - Worktrees API
  - Boards API
  - Issues API
  - Initiatives API
  - Teams API
  - Releases API
  - Comments API
  - Activity API
  - Documentation API
  - Statistics API
  - Error handling
  - Examples

### Legacy Documentation
- **[Tracker API Guide](./TRACKER_API_GUIDE.md)** - Quick start guide (legacy)
- **[Old Tracker Docs](./tracker/)** - Previous tracker documentation

## 👨‍💻 Developer Documentation

### Architecture
- **[System Architecture](./dev/architecture.md)** - Technical design
  - System overview
  - Architecture diagram
  - Core concepts
  - Data flow
  - Frontend architecture
  - Performance optimizations
  - Scalability considerations

### Contributing
- **[Contributing Guide](./dev/contributing.md)** - How to contribute
  - Code of conduct
  - Development workflow
  - Code style
  - Git commit messages
  - Pull request process
  - Branch strategy
  - Release process

### Testing
- **[Testing Guide](./dev/testing.md)** - Testing best practices
  - Test stack
  - Unit tests
  - Integration tests
  - E2E tests
  - Best practices
  - Coverage goals

### Performance
- **[Performance Guide](./dev/performance.md)** - Optimization tips
  - Backend performance
  - Frontend performance
  - Database optimization
  - Network performance
  - Monitoring
  - Performance targets

## 🔄 Migration

- **[v1 to v2 Migration Guide](./migration/v1-to-v2.md)** - Upgrading guide
  - Overview of changes
  - Pre-migration checklist
  - Step-by-step migration
  - Data model changes
  - API changes
  - File structure changes
  - Rollback plan
  - Troubleshooting

## 📚 General Documentation

### Core System
- **[Capabilities](./CAPABILITIES.md)** - Complete feature overview
- **[Architecture](./ARCHITECTURE.md)** - Core system design
- **[API](./API.md)** - Core API reference
- **[Installation](./INSTALLATION.md)** - Setup and installation
- **[Port Allocation](./PORT_ALLOCATION.md)** - Port strategy

### Development Process
- **[Branching Strategy](./BRANCHING_STRATEGY.md)** - Git workflow
- **[Deployment](./DEPLOYMENT_SESSION_2026-01-11.md)** - Deployment notes
- **[Requirements](./requirements/)** - System requirements
- **[Next Session Plan](./NEXT_SESSION_PLAN.md)** - Roadmap
- **[Optimization Guide](./OPTIMIZATION-GUIDE.md)** - Performance tips

## 📁 Documentation Structure

```
docs/
├── DOCUMENTATION_INDEX.md          # This file
├── README.md                       # Docs overview
│
├── api/                            # API Documentation
│   └── tracker-api.md             # Complete REST API reference
│
├── user-guide/                     # User Documentation
│   ├── tracker-overview.md        # Getting started
│   ├── view-modes.md              # Kanban, List, Timeline, Gantt
│   ├── filtering.md               # Search and filters
│   ├── initiatives-teams.md       # Initiatives and teams
│   ├── releases.md                # Release management
│   ├── time-tracking.md           # Time tracking
│   └── dependencies.md            # Dependencies
│
├── dev/                            # Developer Documentation
│   ├── architecture.md            # System architecture
│   ├── contributing.md            # Contributing guide
│   ├── testing.md                 # Testing guide
│   └── performance.md             # Performance guide
│
├── migration/                      # Migration Guides
│   └── v1-to-v2.md               # v1 to v2 migration
│
├── tracker/                        # Legacy Tracker Docs
│   ├── api-reference.md
│   ├── components.md
│   ├── overview.md
│   └── user-guide.md
│
├── requirements/                   # Requirements Docs
│   ├── CONFIG_MANAGEMENT_SYSTEM.md
│   └── MARTHA_DEV_REQUIREMENTS.md
│
└── [Other docs...]                 # General documentation
```

## 🎓 Learning Paths

### For End Users
1. Read [Tracker Overview](./user-guide/tracker-overview.md)
2. Learn [View Modes](./user-guide/view-modes.md)
3. Master [Filtering](./user-guide/filtering.md)
4. Explore [Time Tracking](./user-guide/time-tracking.md)
5. Understand [Dependencies](./user-guide/dependencies.md)

### For Administrators
1. Read [Tracker Overview](./user-guide/tracker-overview.md)
2. Learn [Initiatives & Teams](./user-guide/initiatives-teams.md)
3. Master [Release Management](./user-guide/releases.md)
4. Review [API Reference](./api/tracker-api.md)

### For Developers
1. Read [Architecture](./dev/architecture.md)
2. Follow [Contributing Guide](./dev/contributing.md)
3. Learn [Testing](./dev/testing.md)
4. Study [Performance](./dev/performance.md)
5. Review [API Reference](./api/tracker-api.md)

### For Integrators
1. Read [API Reference](./api/tracker-api.md)
2. Review [Architecture](./dev/architecture.md)
3. Check [Examples](./api/tracker-api.md#examples)

## 🆕 What's New in v2.0

### Major Features
- Multi-worktree support
- Multi-board support
- Four view modes (Kanban, List, Timeline, Gantt)
- Initiatives, teams, and releases
- Advanced dependencies
- Time tracking
- Engagement tracking
- Policy compliance

### Breaking Changes
- API routes now hierarchical (`/api/tracker/worktrees/:id/boards/:id/issues`)
- New data model with additional fields
- Different file structure

See [Migration Guide](./migration/v1-to-v2.md) for details.

## 📊 Documentation Statistics

- **Total Documents:** 31 files
- **API Documentation:** 1 complete guide
- **User Guides:** 7 comprehensive guides
- **Developer Guides:** 4 technical guides
- **Migration Guides:** 1 detailed guide
- **Total Words:** ~50,000 words
- **Code Examples:** 200+ examples

## 🔍 Quick Reference

### Common Tasks

**Create an Issue:**
```bash
POST /api/tracker/worktrees/:wid/boards/:bid/issues
```

**Filter Issues:**
```bash
GET /api/tracker/worktrees/:wid/boards/:bid/issues?status=in_progress&type=task
```

**Add Comment:**
```bash
POST /api/tracker/worktrees/:wid/issues/:id/comments
```

**Log Time:**
```bash
POST /api/tracker/worktrees/:wid/boards/:bid/issues/:id/time-entries
```

**Add Dependency:**
```bash
POST /api/tracker/worktrees/:wid/boards/:bid/issues/:id/dependencies
```

### Keyboard Shortcuts

- `1-4` - Switch views
- `/` - Focus search
- `c` - Create issue
- `j/k` - Navigate
- `Enter` - Open issue
- `Esc` - Close panel

## 💬 Getting Help

- **GitHub Issues:** Report bugs or request features
- **Documentation:** Browse this documentation
- **API Reference:** See complete API docs
- **Examples:** Check code examples in API docs
- **Community:** Join discussions

## 📝 Documentation Maintenance

This documentation was generated on **2026-01-18** for **Martha Tracker v2.0**.

To update documentation:
1. Edit source markdown files
2. Follow documentation style guide
3. Include code examples
4. Update this index if adding new files
5. Submit pull request

## ✅ Documentation Checklist

Implementation of MTH-059 (Documentation):

- ✅ Complete API documentation (tracker-api.md)
- ✅ User guide (7 comprehensive documents)
  - ✅ Tracker overview
  - ✅ View modes (Kanban, List, Timeline, Gantt)
  - ✅ Advanced filtering
  - ✅ Initiatives and teams
  - ✅ Releases
  - ✅ Time tracking
  - ✅ Dependencies
- ✅ Developer guide (4 technical documents)
  - ✅ Architecture
  - ✅ Contributing
  - ✅ Testing
  - ✅ Performance
- ✅ Migration guide (v1 to v2)
- ✅ JSDoc comments on key components
- ✅ Updated README files (main + dashboard)
- ✅ Code examples throughout
- ✅ Clear structure and navigation

## 🎉 Conclusion

Martha Tracker v2.0 documentation is comprehensive and production-ready. Whether you're a user learning the system, a developer contributing code, or an integrator building on the API, you'll find the information you need.

Happy tracking!

---

**Version:** 2.0
**Last Updated:** 2026-01-18
**Status:** Complete ✅
