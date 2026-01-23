# Performance Quick Reference Card

## Run Benchmarks

```bash
# Full suite
npx tsx tests/performance/run-all-benchmarks.ts

# Individual tests
npx tsx tests/performance/benchmark-list-view.ts
npx tsx tests/performance/benchmark-timeline-view.ts
npx tsx tests/performance/benchmark-gantt-view.ts
npx tsx tests/performance/benchmark-filtering.ts

# Bundle analysis
npx tsx scripts/analyze-bundle.ts
```

## Current Performance

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| List (1000 issues) | <100ms | 0.09ms | ✅ 1111x |
| Timeline (500 events) | <200ms | 1.23ms | ✅ 162x |
| Gantt (200 tasks) | <300ms | 1.17ms | ✅ 256x |
| Filtering | <100ms | 0.27ms | ✅ 370x |
| Bundle (gzipped) | <500KB | 800KB | ⚠️ 60% over |

## Top 3 Optimizations

### 1. Route-Based Code Splitting
**Impact**: Reduce initial bundle by ~40% (300KB)
**Effort**: Medium (2-3 hours)

```typescript
// Lazy load view components
const KanbanBoard = React.lazy(() => import('./components/tracker/board/KanbanBoard'));
const ListView = React.lazy(() => import('./components/tracker/list/ListView'));
const TimelineView = React.lazy(() => import('./components/tracker/timeline/TimelineView'));
const GanttView = React.lazy(() => import('./components/tracker/board/GanttView'));
```

### 2. Lazy Load Heavy Libraries
**Impact**: Reduce initial bundle by ~150KB
**Effort**: Low (1 hour)

```typescript
// Defer frappe-gantt until needed
useEffect(() => {
  import('frappe-gantt').then(module => setGantt(() => module.default));
}, []);

// Defer react-big-calendar
const Calendar = React.lazy(() => import('react-big-calendar').then(m => ({ default: m.Calendar })));
```

### 3. Manual Chunk Splitting
**Impact**: Better caching, faster subsequent loads
**Effort**: Low (30 min)

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-calendar': ['react-big-calendar', 'date-fns'],
          'vendor-gantt': ['frappe-gantt'],
        },
      },
    },
  },
});
```

## Reports Location

- Performance: `/test-results/MTH-058-PERFORMANCE-REPORT.md`
- Bundle Size: `/test-results/BUNDLE-SIZE-REPORT.md`
- Full Guide: `/docs/OPTIMIZATION-GUIDE.md`
- Summary: `/MTH-058-IMPLEMENTATION-SUMMARY.md`

## Performance Monitoring

```typescript
// Add performance marks
performance.mark('operation-start');
// ... expensive operation
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// Get result
const measure = performance.getEntriesByName('operation')[0];
if (measure.duration > 100) {
  console.warn(`Slow operation: ${measure.duration}ms`);
}
```

## Bundle Size Check

```bash
cd dashboard
npm run build
ls -lh dist/assets/*.js
# Main bundle should be <300KB gzipped after optimizations
```

## CI/CD Integration

```yaml
# .github/workflows/performance.yml
- name: Run benchmarks
  run: npx tsx tests/performance/run-all-benchmarks.ts

- name: Check bundle size
  run: |
    cd dashboard && npm run build
    npx tsx scripts/analyze-bundle.ts
```

## Key Files

- Test data: `scripts/generate-test-data.ts`
- Benchmarks: `tests/performance/benchmark-*.ts`
- Runner: `tests/performance/run-all-benchmarks.ts`
- Analyzer: `scripts/analyze-bundle.ts`

---

**Last Updated**: January 18, 2026
**Status**: All runtime targets met, bundle size needs optimization
