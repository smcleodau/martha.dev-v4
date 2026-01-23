# Performance Guide

Optimize Martha Tracker for speed and scalability.

## Backend Performance

### 1. Index-Based Queries

Always use the index for filtering:

```typescript
// ✅ Fast: Use index
const tasks = index.by_type['task'];
const inProgress = index.by_status['in_progress'];

// ❌ Slow: Load all files then filter
const allIssues = loadAllIssues();
const tasks = allIssues.filter(i => i.type === 'task');
```

### 2. Batch Operations

Batch file writes:

```typescript
// ❌ Slow: Multiple writes
issues.forEach(issue => {
  saveIssue(issue);
  updateIndex(issue);
});

// ✅ Fast: Batch writes
const updates = issues.map(issue => prepareUpdate(issue));
await Promise.all(updates.map(u => saveIssue(u)));
updateIndexBatch(issues);
```

### 3. Caching

Cache frequently accessed data:

```typescript
const cache = new Map();

function getIssue(id: string): Issue {
  if (cache.has(id)) {
    return cache.get(id);
  }

  const issue = loadIssueFromDisk(id);
  cache.set(id, issue);
  return issue;
}

function invalidateCache(id: string) {
  cache.delete(id);
}
```

### 4. Lazy Loading

Load data only when needed:

```typescript
// Load issue without related data
function getIssue(id: string): Issue {
  return loadIssue(id);
}

// Load related data separately
function getIssueWithComments(id: string): IssueWithComments {
  const issue = getIssue(id);
  const comments = loadComments(id);  // Only if needed

  return { ...issue, comments };
}
```

### 5. Async Operations

Use async/await properly:

```typescript
// ❌ Sequential (slow)
const issue1 = await loadIssue('MTH-001');
const issue2 = await loadIssue('MTH-002');
const issue3 = await loadIssue('MTH-003');

// ✅ Parallel (fast)
const [issue1, issue2, issue3] = await Promise.all([
  loadIssue('MTH-001'),
  loadIssue('MTH-002'),
  loadIssue('MTH-003')
]);
```

## Frontend Performance

### 1. Memoization

Prevent unnecessary re-renders:

```typescript
// Memoize expensive computations
const filteredIssues = useMemo(
  () => filterIssues(issues, filters),
  [issues, filters]
);

// Memoize callbacks
const handleClick = useCallback((id: string) => {
  setSelectedIssue(id);
}, []);

// Memoize components
const IssueCard = React.memo(({ issue }) => {
  return <div>{issue.title}</div>;
});
```

### 2. Virtual Scrolling

For large lists:

```typescript
import { FixedSizeList } from 'react-window';

function IssueList({ issues }) {
  return (
    <FixedSizeList
      height={800}
      itemCount={issues.length}
      itemSize={48}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <IssueRow issue={issues[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

### 3. Debouncing

Debounce expensive operations:

```typescript
import { debounce } from 'lodash';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setSearchResults(searchIssues(query));
  }, 300),
  []
);

<input onChange={(e) => debouncedSearch(e.target.value)} />
```

### 4. Code Splitting

Lazy load routes:

```typescript
// ❌ Load everything upfront
import TrackerPage from './pages/TrackerPage';
import GanttView from './components/tracker/board/GanttView';

// ✅ Lazy load
const TrackerPage = React.lazy(() => import('./pages/TrackerPage'));
const GanttView = React.lazy(() => import('./components/tracker/board/GanttView'));

<Suspense fallback={<Loading />}>
  <TrackerPage />
</Suspense>
```

### 5. Optimize Re-renders

Use proper state structure:

```typescript
// ❌ Causes re-render of entire component
const [state, setState] = useState({
  issues: {},
  selectedIssue: null,
  filters: {},
  loading: false
});

// ✅ Split into separate states
const [issues, setIssues] = useState({});
const [selectedIssue, setSelectedIssue] = useState(null);
const [filters, setFilters] = useState({});
const [loading, setLoading] = useState(false);
```

### 6. Optimize Images

```tsx
// Use appropriate formats
<img src="avatar.webp" alt="User" />  {/* WebP for photos */}
<img src="icon.svg" alt="Icon" />     {/* SVG for icons */}

// Lazy load images
<img loading="lazy" src="large-image.jpg" />

// Use srcset for responsive images
<img
  src="small.jpg"
  srcset="small.jpg 400w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"
/>
```

## Database (File System) Performance

### 1. Index Everything

Maintain comprehensive indexes:

```typescript
interface IssueIndex {
  issues: Record<string, IndexEntry>;
  by_status: Record<string, string[]>;
  by_type: Record<string, string[]>;
  by_priority: Record<string, string[]>;
  by_assignee: Record<string, string[]>;
  by_board: Record<string, string[]>;
  by_initiative: Record<string, string[]>;
  by_team: Record<string, string[]>;
  by_epic: Record<string, string[]>;
  by_release: Record<string, string[]>;
}
```

### 2. Atomic Writes

Ensure data consistency:

```typescript
async function updateIssueAtomic(id: string, updates: Partial<Issue>) {
  const tempPath = `${issuePath}.tmp`;

  // Write to temp file
  await writeFile(tempPath, JSON.stringify(updated));

  // Atomic rename
  await rename(tempPath, issuePath);
}
```

### 3. Batch Index Updates

```typescript
function updateIndexBatch(issues: Issue[]) {
  const index = loadIndex();

  issues.forEach(issue => {
    // Update all index structures
    index.issues[issue.id] = toIndexEntry(issue);
    addToIndexBucket(index.by_status, issue.status, issue.id);
    addToIndexBucket(index.by_type, issue.type, issue.id);
    // ... more indexes
  });

  saveIndex(index);  // Single write
}
```

## Network Performance

### 1. API Request Batching

```typescript
// ❌ Multiple requests
const issue1 = await api.getIssue('MTH-001');
const issue2 = await api.getIssue('MTH-002');
const issue3 = await api.getIssue('MTH-003');

// ✅ Batch request
const issues = await api.getIssues(['MTH-001', 'MTH-002', 'MTH-003']);
```

### 2. Response Compression

Enable gzip compression:

```typescript
import compression from '@fastify/compress';

await fastify.register(compression);
```

### 3. HTTP/2

Use HTTP/2 for multiplexing:

```typescript
import http2 from 'http2';

const server = http2.createSecureServer(options, app);
```

### 4. CDN for Static Assets

Serve from CDN:

```
https://cdn.martha.dev/assets/logo.svg
https://cdn.martha.dev/assets/app.js
```

## Monitoring

### 1. Performance Metrics

```typescript
// Track API response times
fastify.addHook('onResponse', (request, reply, done) => {
  const duration = reply.getResponseTime();

  metrics.histogram('api.response_time', duration, {
    route: request.routerPath,
    method: request.method,
    status: reply.statusCode
  });

  done();
});
```

### 2. Resource Usage

```typescript
// Monitor memory
setInterval(() => {
  const usage = process.memoryUsage();
  metrics.gauge('process.memory.rss', usage.rss);
  metrics.gauge('process.memory.heapUsed', usage.heapUsed);
}, 60000);

// Monitor event loop lag
setInterval(() => {
  const start = Date.now();
  setImmediate(() => {
    const lag = Date.now() - start;
    metrics.gauge('process.eventloop.lag', lag);
  });
}, 10000);
```

### 3. Frontend Performance

```typescript
// Track page load time
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0];

  analytics.track('page.load', {
    duration: perfData.loadEventEnd - perfData.fetchStart,
    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
    ttfb: perfData.responseStart - perfData.fetchStart
  });
});

// Track component render time
function TrackerPage() {
  useEffect(() => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      analytics.track('component.render', {
        component: 'TrackerPage',
        duration
      });
    };
  }, []);
}
```

## Optimization Checklist

### Backend
- [ ] Use index for all queries
- [ ] Batch file operations
- [ ] Enable compression
- [ ] Cache frequently accessed data
- [ ] Use async/await properly
- [ ] Profile slow endpoints
- [ ] Add response time monitoring

### Frontend
- [ ] Memoize expensive computations
- [ ] Use virtual scrolling for large lists
- [ ] Debounce user input
- [ ] Lazy load routes and components
- [ ] Optimize images
- [ ] Code split large bundles
- [ ] Profile component renders

### Network
- [ ] Enable HTTP/2
- [ ] Use CDN for static assets
- [ ] Compress responses
- [ ] Batch API requests
- [ ] Cache responses
- [ ] Minimize payload size

## Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p50) | < 100ms |
| API Response Time (p95) | < 500ms |
| API Response Time (p99) | < 1000ms |
| Page Load Time | < 2s |
| Time to Interactive | < 3s |
| First Contentful Paint | < 1s |
| Lighthouse Score | > 90 |

## Profiling

### Backend Profiling

```bash
# CPU profiling
node --prof index.js

# Heap snapshot
node --inspect index.js
# Open chrome://inspect
# Take heap snapshot

# Flame graph
clinic flame -- node index.js
```

### Frontend Profiling

```
# React DevTools Profiler
1. Open React DevTools
2. Go to Profiler tab
3. Click Record
4. Perform actions
5. Stop recording
6. Analyze flame graph
```

## Next Steps

- **[Architecture](./architecture.md)** - System design
- **[Testing](./testing.md)** - Testing guide
- **[Contributing](./contributing.md)** - How to contribute

---

**Last Updated:** 2026-01-18
